import { api } from '../api'
import { getMergedAvisos } from './avisos'
import { addTareaLocal } from './tareasLocales'
import { detectCalificacion } from './calificacionParser'

export const TOOL_SHAPE = {
  id: '',
  label: '',
  tier_required: 1,
  description: '',
  intent_examples: [],
  required_fields: [],
  preview: () => '',
  execute: async () => ({ ok: false }),
  success_message: '',
  rollback_possible: false,
}

function toLocalYmd(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

function inferMateriaFromMessage(mensaje) {
  const lower = String(mensaje || '').toLowerCase()
  const candidates = [
    'matemáticas',
    'español',
    'ciencias',
    'historia',
    'geografía',
    'formación cívica',
    'artes',
    'inglés',
    'educación física',
    'lo humano y lo comunitario',
  ]

  const found = candidates.find((materia) => lower.includes(materia))
  if (found) return found
  if (lower.includes('mate')) return 'matemáticas'
  if (lower.includes('espanol')) return 'español'
  if (lower.includes('civica')) return 'formación cívica'
  return 'Lo Humano y lo Comunitario'
}

export function sectionFromMessage(mensaje) {
  const lower = String(mensaje || '').toLowerCase()

  if (/(asistencia|falt|ausencia)/.test(lower)) return { path: '/asistencia', section: 'asistencia' }
  if (/(bitácora|bitacora|incidente)/.test(lower)) return { path: '/bitacora', section: 'bitácora' }
  if (/(planeaci|plan)/.test(lower)) return { path: '/planeacion', section: 'planeación' }
  if (/(evaluaci|calificaci|rúbrica|rubrica)/.test(lower)) return { path: '/evaluacion', section: 'evaluación' }
  if (/(alumno|grupo|estudiante)/.test(lower)) return { path: '/alumnos', section: 'alumnos' }
  if (/(sugerencia|profeia|recomendaci)/.test(lower)) return { path: '/sugerencias', section: 'sugerencias' }
  if (/(aviso|director|comunicado)/.test(lower)) return { path: '/avisos', section: 'avisos' }
  if (/(documento|admin|archivo)/.test(lower)) return { path: '/admin', section: 'documentos' }

  return { path: '/dashboard', section: 'dashboard' }
}

function parseIsoOrTomorrow(mensaje) {
  const msg = String(mensaje || '')
  const iso = msg.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (iso) return iso[1]

  const slash = msg.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (slash) {
    const day = Number(slash[1])
    const month = Number(slash[2])
    const year = Number(slash[3] || new Date().getFullYear())
    const safeDate = new Date(year, month - 1, day)
    if (!Number.isNaN(safeDate.getTime())) return toLocalYmd(safeDate)
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return toLocalYmd(tomorrow)
}

function detectBitacoraType(mensaje) {
  const normalized = String(mensaje || '').toLowerCase()
  if (/(bullying|acoso)/.test(normalized)) return 'bullying'
  if (/(violencia|agresi)/.test(normalized)) return 'violencia'
  return 'general'
}

function detectTaskPriority(mensaje) {
  return /(urgente|hoy|inmediato|importante)/i.test(String(mensaje || '')) ? 'urgente' : 'normal'
}

function detectEvaluacionType(mensaje) {
  const normalized = String(mensaje || '').toLowerCase()
  if (/(examen|prueba|parcial)/.test(normalized)) return 'examen'
  if (/(proyecto|producto)/.test(normalized)) return 'proyecto'
  return 'tarea'
}

function normalizeName(value) {
  return String(value || '')
    .replace(/["'“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toTitleCaseName(value) {
  return normalizeName(value)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isReliableStudentName(name) {
  const clean = normalizeName(name).toLowerCase()
  if (!clean) return false

  const blocked = new Set([
    'alumno', 'alumna', 'estudiante', 'nino', 'niño', 'nina', 'niña',
    'grupo', 'equipo', 'clase', 'sin nombre', 'desconocido'
  ])
  const blockedEdgeTokens = new Set(['hoy', 'mañana', 'manana', 'con', 'sin', 'para'])
  const allowedParticles = new Set(['de', 'del', 'la', 'las', 'los'])

  if (blocked.has(clean)) return false
  if (clean.length < 3) return false
  if (!/[a-záéíóúñ]/i.test(clean)) return false

  const tokens = clean.split(' ').filter(Boolean)
  if (tokens.length === 0) return false

  const first = tokens[0]
  const last = tokens[tokens.length - 1]

  if (blockedEdgeTokens.has(first) || blockedEdgeTokens.has(last)) return false
  if (allowedParticles.has(first) || allowedParticles.has(last)) return false

  const alphaTokens = tokens.filter((token) => /[a-záéíóúñ]/i.test(token))
  if (alphaTokens.length === 0) return false

  return true
}

function detectAlumnoNombre(mensaje) {
  const rawText = String(mensaje || '')
  const raw = rawText.replace(/\s+/g, ' ').trim()
  if (!raw) return ''

  const namePattern = '[a-záéíóúñ]+(?:\\s+(?:de|del|la|las|los|y)?\\s*[a-záéíóúñ]+){0,4}'

  const quoted = rawText.match(new RegExp(`["'“”‘’](${namePattern})["'“”‘’]`, 'i'))
  if (quoted?.[1] && isReliableStudentName(quoted[1])) {
    return toTitleCaseName(quoted[1])
  }

  const phrasing = raw.match(new RegExp(`(?:eval[uú]a(?:r)?\\s+a|califica(?:r)?\\s+a|registra(?:r)?\\s+(?:la\\s+)?(?:evaluaci[oó]n|calificaci[oó]n)\\s+de|evaluaci[oó]n\\s+de|calificaci[oó]n\\s+de|para)\\s+(${namePattern})(?=\\s+(?:con|en|para|hoy|mañana|manana)\\b|$)`, 'i'))
  if (phrasing?.[1] && isReliableStudentName(phrasing[1])) {
    return toTitleCaseName(phrasing[1])
  }

  const byPrefix = raw.match(new RegExp(`(?:alumno|alumna|estudiante)\\s+(${namePattern})`, 'i'))
  if (byPrefix?.[1] && isReliableStudentName(byPrefix[1])) {
    return toTitleCaseName(byPrefix[1])
  }

  const asistenciaAusente = raw.match(new RegExp(`(?:marca\\s+a\\s+)?(${namePattern})\\s+ausente\\b`, 'i'))
  if (asistenciaAusente?.[1] && isReliableStudentName(asistenciaAusente[1])) {
    return toTitleCaseName(asistenciaAusente[1])
  }

  const ausentePrefixed = raw.match(new RegExp(`\\bausente\\s+(${namePattern})`, 'i'))
  if (ausentePrefixed?.[1] && isReliableStudentName(ausentePrefixed[1])) {
    return toTitleCaseName(ausentePrefixed[1])
  }

  return ''
}

function findAlumnoByName(alumnos, alumnoNombre) {
  const needle = String(alumnoNombre || '').toLowerCase().trim()
  if (!needle) return null
  const list = Array.isArray(alumnos) ? alumnos : []
  return list.find((a) => String(a?.nombre || '').toLowerCase().includes(needle)) || null
}

function toRosterKey(name) {
  return String(name || '').toLowerCase().trim()
}

function buildMergedAsistenciaRegistros(context = {}, overrides = {}) {
  const alumnos = Array.isArray(context?.alumnos) ? context.alumnos : []
  const asistenciaHoy = Array.isArray(context?.asistenciaHoy) ? context.asistenciaHoy : []

  const byName = new Map()

  for (const alumno of alumnos) {
    const alumnoNombre = String(alumno?.nombre || '').trim()
    if (!alumnoNombre) continue
    byName.set(toRosterKey(alumnoNombre), {
      alumno_id: alumno?.id || null,
      alumno_nombre: alumnoNombre,
      grado: Number(alumno?.grado || context?.grado || 1),
      grupo: String(alumno?.grupo || 'A').trim() || 'A',
      presente: true,
      justificacion: '',
    })
  }

  for (const record of asistenciaHoy) {
    const alumnoNombre = String(record?.alumno_nombre || '').trim()
    if (!alumnoNombre) continue
    const key = toRosterKey(alumnoNombre)
    const existing = byName.get(key)
    byName.set(key, {
      alumno_id: existing?.alumno_id || null,
      alumno_nombre: alumnoNombre,
      grado: Number(record?.grado || existing?.grado || context?.grado || 1),
      grupo: String(record?.grupo || existing?.grupo || 'A').trim() || 'A',
      presente: record?.presente === true || record?.presente === 1 || record?.presente === '1',
      justificacion: String(record?.justificacion || existing?.justificacion || '').trim(),
    })
  }

  const merged = Array.from(byName.values())
  return merged.map((item) => ({ ...item, ...overrides[toRosterKey(item.alumno_nombre)] }))
}

function getFirstUnreadAviso() {
  const unread = getMergedAvisos().filter((item) => !item.read_at)
  return unread[0] || null
}

function getUnreadAvisoById(avisoId) {
  if (!avisoId) return null
  const unread = getMergedAvisos().filter((item) => !item.read_at)
  return unread.find((item) => item.id === avisoId) || null
}

export function buildToolPayload(tool, mensaje, context = {}) {
  const msg = String(mensaje || '').trim()

  switch (tool?.id) {
    case 'crear_planeacion': {
      const materia = inferMateriaFromMessage(msg)
      const fecha = parseIsoOrTomorrow(msg)
      return {
        materia,
        fecha,
        tema: msg || `Sesión aplicada de ${materia}`,
        grado: Number(context?.grado) || 1,
      }
    }
    case 'guardar_bitacora': {
      const tipo = detectBitacoraType(msg)
      return {
        tipo,
        descripcion: msg || 'Registro generado por ProfeIA',
        gravedad: tipo === 'general' ? 2 : 4,
      }
    }
    case 'crear_tarea_local': {
      return {
        titulo: msg.replace(/^(recu[eé]rdame|crea una tarea|pendiente para ma[ñn]ana|no olvides)\s*/i, '').trim() || msg,
        prioridad: detectTaskPriority(msg),
      }
    }
    case 'marcar_aviso_leido': {
      const firstUnread = getFirstUnreadAviso()
      if (!firstUnread?.id) {
        throw new Error('No hay avisos no leídos para marcar en este momento.')
      }
      return {
        aviso_id: firstUnread.id,
        aviso_title: firstUnread.title,
      }
    }
    case 'crear_evaluacion': {
      const alumnoNombre = detectAlumnoNombre(msg)
      if (!isReliableStudentName(alumnoNombre)) {
        throw new Error('Indica el nombre del alumno para registrar la evaluación (ejemplo: "Evalúa a Juan Pérez con 9").')
      }
      return {
        alumno_nombre: alumnoNombre,
        tipo: detectEvaluacionType(msg),
        calificacion: detectCalificacion(msg),
      }
    }
    case 'tomar_asistencia_rapida': {
      const lower = msg.toLowerCase()
      const fecha = toLocalYmd(new Date())
      const todosPresentes = /(todos presentes|marca a todos|asistencia completa|todos asistieron|toma asistencia|asistencia r[aá]pida|pasa lista)/.test(lower)
      if (todosPresentes) return { fecha, modo: 'todos_presentes' }
      const alumnoNombre = detectAlumnoNombre(msg)
      if (!alumnoNombre) {
        return { fecha, modo: 'todos_presentes' }
      }
      const justificacion = /(enferm|sick|ausente por)/.test(lower) ? 'Enfermedad' : ''
      return { fecha, modo: 'ausente_especifico', alumno_nombre: alumnoNombre, justificacion }
    }
    case 'crear_actividad': {
      const materia = inferMateriaFromMessage(msg)
      const grado = Number(context?.grado) || 1
      return {
        titulo: `Actividad de ${materia}`,
        materia,
        grado,
        descripcion: msg || `Actividad aplicada de ${materia} para ${grado}°`,
      }
    }
    case 'crear_aviso_docente_local': {
      return {
        titulo: msg.slice(0, 60) || 'Aviso del docente',
        body: msg,
        priority: detectTaskPriority(msg),
      }
    }
    case 'preparar_reporte_dia': {
      return { fecha: toLocalYmd(new Date()) }
    }
    case 'actualizar_planeacion_estado': {
      const lower = msg.toLowerCase()
      const planeaciones = [...(context?.planeacionesMes || [])]
      const candidata = planeaciones.sort((a, b) => new Date(b?.fecha || 0) - new Date(a?.fecha || 0))[0]
      const nuevoEstado = /(complet|terminad|list)/.test(lower)
        ? 'completado'
        : /(reprogram|mover|posponer)/.test(lower)
          ? 'reprogramado'
          : 'pendiente'
      return {
        planeacion_id: candidata?.id || null,
        planeacion_tema: candidata?.tema || 'planeación reciente',
        nuevo_estado: nuevoEstado,
      }
    }
    case 'preparar_mensaje_director': {
      const ausentes = (context?.asistenciaHoy || []).filter((a) => !a?.presente)
      const asunto = ausentes.length > 0
        ? `Reporte de ausencias — ${context?.fecha || 'hoy'}`
        : `Comunicado docente — ${context?.fecha || 'hoy'}`
      const cuerpo = ausentes.length > 0
        ? `Estimado director,\n\nLe informo que el día de hoy se registraron ${ausentes.length} ausencia(s) en el grupo ${context?.grado || ''}°:\n\n${ausentes.map((a) => `- ${a.alumno_nombre}`).join('\n')}\n\nQuedo a sus órdenes.`
        : `Estimado director,\n\n${msg}\n\nQuedo a sus órdenes.`
      return { asunto, cuerpo }
    }
    case 'navegar': {
      return { mensaje: msg, ...sectionFromMessage(msg) }
    }
    default:
      return { mensaje: msg }
  }
}

export const TOOL_REGISTRY = [
  {
    id: 'crear_planeacion',
    label: 'Crear planeación',
    icon: '📋',
    tier_required: 2,
    description: 'Crea una planeación real para el docente activo.',
    intent_examples: ['crea una planeación', 'hazme una clase de', 'planea español', 'planeación de matemáticas'],
    required_fields: ['materia', 'fecha', 'tema', 'grado'],
    preview: (payload) => `📋 Crear planeación: ${payload.materia} — ${payload.tema} (${payload.fecha})`,
    execute: async (payload, context) => {
      if (!context?.docenteId) {
        throw new Error('No hay docente activo para crear la planeación.')
      }
      const data = await api.createPlaneacion(context.docenteId, payload)
      return { ok: true, data, action: { type: 'navigate', path: '/planeacion' } }
    },
    success_message: 'Planeación creada. Puedes verla en /planeacion',
    rollback_possible: false,
  },
  {
    id: 'guardar_bitacora',
    label: 'Guardar en bitácora',
    icon: '📓',
    tier_required: 2,
    description: 'Registra una entrada en bitácora con severidad sugerida.',
    intent_examples: ['anota en bitácora', 'registra que hubo bullying', 'guarda este incidente', 'registra en bitácora'],
    required_fields: ['tipo', 'descripcion', 'gravedad'],
    preview: (payload) => `📓 Guardar en bitácora: ${payload.tipo} — ${String(payload.descripcion || '').slice(0, 60)}...`,
    execute: async (payload, context) => {
      if (!context?.docenteId) {
        throw new Error('No hay docente activo para guardar en bitácora.')
      }
      const data = await api.createBitacora(context.docenteId, {
        fecha: toLocalYmd(new Date()),
        tipo: payload.tipo,
        descripcion: payload.descripcion,
        gravedad: payload.gravedad,
        acciones_tomadas: 'Registro ejecutado desde agente ProfeIA',
      })
      return { ok: true, data, action: { type: 'navigate', path: '/bitacora' } }
    },
    success_message: 'Entrada de bitácora guardada. Si aplica, se generó una sugerencia IA.',
    rollback_possible: false,
  },
  {
    id: 'crear_tarea_local',
    label: 'Crear tarea local',
    icon: '✅',
    tier_required: 1,
    description: 'Crea un pendiente local para Tareas de hoy.',
    intent_examples: ['recuérdame', 'crea una tarea', 'pendiente para mañana', 'no olvides'],
    required_fields: ['titulo', 'prioridad'],
    preview: (payload) => `✅ Crear tarea: ${payload.titulo} (${payload.prioridad})`,
    execute: async (payload) => {
      const tarea = addTareaLocal({
        titulo: payload.titulo,
        prioridad: payload.prioridad || 'normal',
        action_path: payload.action_path || null,
      })
      return { ok: true, data: tarea }
    },
    success_message: 'Tarea creada. Aparecerá en Tareas de hoy.',
    rollback_possible: true,
  },
  {
    id: 'marcar_aviso_leido',
    label: 'Marcar aviso como leído',
    icon: '📢',
    tier_required: 1,
    description: 'Marca un aviso pendiente como leído.',
    intent_examples: ['marca el aviso como leído', 'ya vi el aviso', 'marcar leído'],
    required_fields: ['aviso_id'],
    preview: (payload) => `📢 Marcar aviso como leído: ${payload.aviso_title || payload.aviso_id}`,
    execute: async (payload) => {
      if (!payload?.aviso_id) {
        throw new Error('No hay aviso pendiente para marcar como leído.')
      }
      const firstUnread = getFirstUnreadAviso()
      if (!firstUnread?.id) {
        throw new Error('No hay avisos no leídos para marcar en este momento.')
      }
      if (!getUnreadAvisoById(payload.aviso_id)) {
        throw new Error('El aviso seleccionado ya fue leído o no existe. Solicita una nueva confirmación.')
      }
      const executedAt = new Date().toISOString()
      const readMap = JSON.parse(localStorage.getItem('profeia_avisos_read_v1') || '{}')
      localStorage.setItem('profeia_avisos_read_v1', JSON.stringify({ ...readMap, [payload.aviso_id]: executedAt }))
      window.dispatchEvent(new CustomEvent('profeia:avisos-updated'))
      return { ok: true, data: { aviso_id: payload.aviso_id, read_at: executedAt } }
    },
    success_message: 'Aviso marcado como leído.',
    rollback_possible: true,
  },
  {
    id: 'crear_evaluacion',
    label: 'Registrar evaluación',
    icon: '📊',
    tier_required: 2,
    description: 'Registra una evaluación para un alumno del grupo.',
    intent_examples: ['evalúa a', 'registra calificación', 'prepara evaluación', 'calificación de'],
    required_fields: ['alumno_nombre', 'tipo', 'calificacion'],
    preview: (payload) => `📊 Registrar evaluación: ${payload.alumno_nombre} — ${payload.tipo}: ${payload.calificacion}/10`,
    execute: async (payload, context) => {
      if (!context?.docenteId) {
        throw new Error('No hay docente activo para registrar evaluación.')
      }
      if (!isReliableStudentName(payload?.alumno_nombre)) {
        throw new Error('Falta un nombre de alumno válido. Edita la acción e indica el alumno.')
      }
      const data = await api.createEvaluacion(context.docenteId, {
        fecha: toLocalYmd(new Date()),
        alumno_nombre: payload.alumno_nombre,
        grado: Number(context?.grado) || 1,
        tipo: payload.tipo,
        calificacion: payload.calificacion,
      })
      return { ok: true, data, action: { type: 'navigate', path: '/evaluacion' } }
    },
    success_message: 'Evaluación registrada. Puedes verla en /evaluacion',
    rollback_possible: false,
  },
  {
    id: 'tomar_asistencia_rapida',
    label: 'Tomar asistencia rápida',
    icon: '✅',
    tier_required: 2,
    description: 'Marca a todos los alumnos como presentes, o a uno específico como ausente.',
    intent_examples: ['marca a todos presentes', 'marca a Juan ausente', 'toma asistencia', 'todos presentes hoy'],
    required_fields: ['fecha', 'modo'],
    preview: (payload) => payload.modo === 'todos_presentes'
      ? `✅ Marcar a todos los alumnos como presentes (${payload.fecha})`
      : `✅ Marcar a ${payload.alumno_nombre || 'alumno'} como ausente (${payload.fecha})`,
    execute: async (payload, context) => {
      if (!context?.docenteId) throw new Error('No hay docente activo.')
      const alumnos = Array.isArray(context?.alumnos) ? context.alumnos : []
      const asistenciaBase = buildMergedAsistenciaRegistros(context)
      const fallbackBase = asistenciaBase.length > 0
        ? asistenciaBase
        : alumnos
          .map((a) => ({
            alumno_id: a.id,
            alumno_nombre: a.nombre,
            grado: Number(a.grado || context?.grado || 1),
            grupo: a.grupo || 'A',
            presente: true,
            justificacion: '',
          }))
      let registros = [...fallbackBase]

      if (payload.modo === 'todos_presentes') {
        registros = registros.map((r) => ({ ...r, presente: true, justificacion: '' }))
      } else {
        const found = findAlumnoByName(alumnos, payload.alumno_nombre)
        const targetName = found?.nombre || payload.alumno_nombre
        const targetKey = toRosterKey(targetName)
        const existsInRoster = registros.some((r) => toRosterKey(r.alumno_nombre) === targetKey)
        if (!existsInRoster) throw new Error(`No encontré al alumno "${payload.alumno_nombre}" en tu lista. Verifica el nombre.`)
        registros = registros.map((r) => {
          if (toRosterKey(r.alumno_nombre) !== targetKey) return r
          return {
            ...r,
            presente: false,
            justificacion: payload.justificacion || r.justificacion || '',
          }
        })
      }

      if (registros.length === 0) throw new Error('No hay alumnos registrados para tomar asistencia.')
      const data = await api.saveAsistencia(context.docenteId, payload.fecha, registros)
      return { ok: true, data, action: { type: 'navigate', path: '/asistencia' } }
    },
    success_message: 'Asistencia guardada. Puedes verla en /asistencia',
    rollback_possible: false,
  },
  {
    id: 'crear_actividad',
    label: 'Crear actividad',
    icon: '🎯',
    tier_required: 2,
    description: 'Crea una actividad pedagógica para el grupo.',
    intent_examples: ['crea una actividad de', 'hazme una actividad', 'actividad de fracciones', 'prepara una dinámica'],
    required_fields: ['titulo', 'materia', 'grado', 'descripcion'],
    preview: (payload) => `🎯 Crear actividad: ${payload.titulo} (${payload.materia}, ${payload.grado}°)`,
    execute: async (payload, context) => {
      if (!context?.docenteId) throw new Error('No hay docente activo.')
      const data = await api.createPlaneacion(context.docenteId, {
        materia: payload.materia,
        grado: payload.grado,
        tema: payload.titulo,
        objetivo: payload.descripcion,
        actividades: payload.descripcion,
        fecha: toLocalYmd(new Date()),
        estado: 'pendiente',
      })

      return { ok: true, data, action: { type: 'navigate', path: '/planeacion' } }
    },
    success_message: 'Actividad creada. Puedes verla en /planeacion',
    rollback_possible: false,
  },
  {
    id: 'crear_aviso_docente_local',
    label: 'Crear aviso local',
    icon: '📣',
    tier_required: 1,
    description: 'Crea un aviso local del docente (visible solo en este dispositivo).',
    intent_examples: ['crea un aviso', 'avisa que', 'comunica que', 'notifica que'],
    required_fields: ['titulo', 'body'],
    preview: (payload) => `📣 Crear aviso: ${payload.titulo}`,
    execute: async (payload) => {
      const DOCENTE_AVISOS_KEY = 'profeia_docente_avisos_v1'
      const existing = JSON.parse(localStorage.getItem(DOCENTE_AVISOS_KEY) || '[]')
      const nuevo = {
        id: `docente-aviso-${Date.now()}`,
        title: payload.titulo,
        body: payload.body,
        author_role: 'teacher',
        author_name: 'Yo (docente)',
        priority: payload.priority || 'normal',
        target_scope: 'self',
        created_at: new Date().toISOString(),
        read_at: null,
        action_path: null,
      }
      localStorage.setItem(DOCENTE_AVISOS_KEY, JSON.stringify([nuevo, ...existing]))
      window.dispatchEvent(new CustomEvent('profeia:avisos-updated'))
      return { ok: true, data: nuevo }
    },
    success_message: 'Aviso creado localmente.',
    rollback_possible: true,
  },
  {
    id: 'preparar_reporte_dia',
    label: 'Reporte del día',
    icon: '📄',
    tier_required: 2,
    description: 'Genera un reporte textual del día con asistencia, bitácora y planeaciones.',
    intent_examples: ['hazme un reporte del día', 'reporte de hoy', 'resumen del día', 'qué pasó hoy'],
    required_fields: ['fecha'],
    preview: (payload) => `📄 Generar reporte del día (${payload.fecha})`,
    execute: async (payload, context) => {
      const asistencia = context?.asistenciaHoy || []
      const bitacora = context?.bitacoraHoy || []
      const planeaciones = (context?.planeacionesMes || []).filter((p) => p.fecha === payload.fecha)
      const sugerencias = context?.sugerenciasPendientes || []

      const presentes = asistencia.filter((a) => a.presente).length
      const ausentes = asistencia.filter((a) => !a.presente).length

      const lines = [
        `📄 REPORTE DEL DÍA — ${payload.fecha}`,
        '',
        `👥 Asistencia: ${presentes} presentes, ${ausentes} ausentes de ${asistencia.length} alumnos`,
        '',
        `📋 Planeaciones del día: ${planeaciones.length > 0 ? planeaciones.map((p) => `${p.materia} — ${p.tema}`).join(', ') : 'Sin planeaciones registradas'}`,
        '',
        `📓 Bitácora: ${bitacora.length > 0 ? bitacora.map((b) => `[${b.tipo}] ${String(b.descripcion || '').slice(0, 60)}`).join(' | ') : 'Sin entradas hoy'}`,
        '',
        `💡 Sugerencias pendientes: ${sugerencias.length}`,
      ]

      const reporteTexto = lines.join('\n')
      return { ok: true, data: { reporteTexto }, reporteTexto }
    },
    success_message: 'Reporte generado.',
    rollback_possible: false,
  },
  {
    id: 'actualizar_planeacion_estado',
    label: 'Actualizar estado de planeación',
    icon: '🔄',
    tier_required: 2,
    description: 'Cambia el estado de una planeación (borrador → activa → completada).',
    intent_examples: ['marca la planeación como completada', 'actualiza el estado', 'la planeación está lista', 'cambia estado de planeación'],
    required_fields: ['planeacion_id', 'nuevo_estado'],
    preview: (payload) => `🔄 Actualizar planeación #${payload.planeacion_id || 'N/A'} → ${payload.nuevo_estado}`,
    execute: async (payload, context) => {
      if (!context?.docenteId) throw new Error('No hay docente activo.')
      if (!payload?.planeacion_id) {
        throw new Error('No encontré una planeación candidata para actualizar. Crea o selecciona una planeación primero.')
      }
      const data = await api.updatePlaneacion(payload.planeacion_id, { estado: payload.nuevo_estado })
      return { ok: true, data, action: { type: 'navigate', path: '/planeacion' } }
    },
    success_message: 'Estado de planeación actualizado.',
    rollback_possible: false,
  },
  {
    id: 'preparar_mensaje_director',
    label: 'Preparar mensaje para el director',
    icon: '✉️',
    tier_required: 1,
    description: 'Redacta un mensaje formal para el director basado en el contexto del día.',
    intent_examples: ['prepara mensaje para el director', 'redacta un mensaje al director', 'comunica al director', 'avisa al director'],
    required_fields: ['asunto', 'cuerpo'],
    preview: (payload) => `✉️ Mensaje al director: ${payload.asunto}`,
    execute: async (payload) => {
      const MENSAJES_KEY = 'profeia_mensajes_director_v1'
      const existing = JSON.parse(localStorage.getItem(MENSAJES_KEY) || '[]')
      const nuevo = {
        id: `msg-${Date.now()}`,
        asunto: payload.asunto,
        cuerpo: payload.cuerpo,
        created_at: new Date().toISOString(),
        enviado: false,
      }
      localStorage.setItem(MENSAJES_KEY, JSON.stringify([nuevo, ...existing]))
      return {
        ok: true,
        data: nuevo,
        mensajeTexto: `📧 MENSAJE PARA EL DIRECTOR\n\nAsunto: ${payload.asunto}\n\n${payload.cuerpo}\n\n(Guardado localmente — cópialo para enviarlo)`
      }
    },
    success_message: 'Mensaje redactado y guardado localmente.',
    rollback_possible: true,
  },
  {
    id: 'navegar',
    label: 'Navegar',
    icon: '🧭',
    tier_required: 1,
    description: 'Navega a una sección de ProfeIA.',
    intent_examples: ['ir a', 'abrir', 'mostrar', 've a'],
    required_fields: ['mensaje'],
    preview: (payload) => `🧭 Navegar a ${payload.section || 'dashboard'}`,
    execute: async (payload) => ({ ok: true, action: { type: 'navigate', path: payload.path || '/dashboard' } }),
    success_message: 'Te llevo a la sección solicitada.',
    rollback_possible: false,
  },
  // ===== RAG/DEMO TOOLS — Project & Document Based Actions =====
  {
    id: 'listar_proyectos',
    label: 'Listar proyectos',
    icon: '📂',
    tier_required: 1,
    description: 'Muestra los proyectos pedagógicos activos del docente.',
    intent_examples: ['qué proyectos tengo', 'lista mis proyectos', 'muéstrame los proyectos', 'proyectos activos'],
    required_fields: [],
    preview: () => '📂 Listar proyectos pedagógicos',
    execute: async (_payload, context) => {
      const proyectos = context?.proyectos || []
      if (proyectos.length === 0) {
        return { ok: true, data: [], mensaje: 'No tienes proyectos registrados aún. ¿Quieres crear uno?' }
      }
      const lista = proyectos.map(p => `• ${p.titulo} (${p.status}, ${p.progreso}%) — ${p.tema}`).join('\n')
      return {
        ok: true,
        data: proyectos,
        mensaje: `📂 Tienes ${proyectos.length} proyecto(s):\n\n${lista}`
      }
    },
    success_message: 'Proyectos listados.',
    rollback_possible: false,
  },
  {
    id: 'explicar_proyecto',
    label: 'Explicar proyecto',
    icon: '📖',
    tier_required: 1,
    description: 'Explica los detalles de un proyecto específico basado en su título.',
    intent_examples: ['explica el proyecto de', 'cuéntame sobre el proyecto', 'qué es el proyecto', 'detalles del proyecto'],
    required_fields: ['titulo_proyecto'],
    preview: (payload) => `📖 Explicar proyecto: ${payload.titulo_proyecto}`,
    execute: async (payload, context) => {
      const proyectos = context?.proyectos || []
      const proyecto = proyectos.find(p => 
        p.titulo.toLowerCase().includes(payload.titulo_proyecto.toLowerCase())
      )
      if (!proyecto) {
        return { 
          ok: false, 
          error: `No encontré un proyecto llamado "${payload.titulo_proyecto}". Proyectos disponibles: ${proyectos.map(p => p.titulo).join(', ')}` 
        }
      }
      return {
        ok: true,
        data: proyecto,
        mensaje: `📖 **${proyecto.titulo}**\n\n🎯 Tema: ${proyecto.tema}\n📊 Estado: ${proyecto.status} (${proyecto.progreso}%)\n\n📝 Descripción: ${proyecto.descripcion || 'Sin descripción'}\n\n🎯 Objetivos: ${proyecto.objetivos || 'No especificados'}\n\n📋 Evidencias requeridas: ${proyecto.evidencias_requeridas || 'No especificadas'}`
      }
    },
    success_message: 'Proyecto explicado.',
    rollback_possible: false,
  },
  {
    id: 'resumir_documentos',
    label: 'Resumir documentos',
    icon: '📄',
    tier_required: 1,
    description: 'Genera un resumen de los documentos disponibles del docente.',
    intent_examples: ['resume mis documentos', 'qué documentos tengo', 'resumen de documentos', 'lista mis documentos'],
    required_fields: [],
    preview: () => '📄 Resumir documentos',
    execute: async (_payload, context) => {
      const documentos = context?.documentos || []
      const ragContext = context?.ragContext
      
      if (documentos.length === 0 && !ragContext?.resumen_documentos?.length) {
        return { ok: true, data: [], mensaje: 'No tienes documentos registrados. Puedes subir documentos en la sección correspondiente.' }
      }
      
      const resumenes = ragContext?.resumen_documentos || documentos.slice(0, 3).map(d => ({
        title: d.title,
        type: d.document_type,
        summary: d.content_summary || 'Sin resumen'
      }))
      
      const lista = resumenes.map(d => `• **${d.title}** (${d.type})\n   ${d.summary?.substring(0, 100)}...`).join('\n\n')
      
      return {
        ok: true,
        data: documentos,
        mensaje: `📄 Tienes ${documentos.length || ragContext?.total_documentos || 0} documento(s):\n\n${lista}`
      }
    },
    success_message: 'Documentos resumidos.',
    rollback_possible: false,
  },
  {
    id: 'crear_clase_desde_documento',
    label: 'Crear clase desde documento',
    icon: '📚',
    tier_required: 2,
    description: 'Genera una planeación basada en el contenido de un documento.',
    intent_examples: ['crea una clase basada en', 'genera planeación desde', 'usa el documento para crear clase', 'clase basada en documento'],
    required_fields: ['titulo_documento', 'tema_clase'],
    preview: (payload) => `📚 Crear clase desde "${payload.titulo_documento}"`,
    execute: async (payload, context) => {
      const documentos = context?.documentos || []
      const doc = documentos.find(d => 
        d.title.toLowerCase().includes(payload.titulo_documento.toLowerCase())
      )
      
      if (!doc) {
        return {
          ok: false,
          error: `No encontré el documento "${payload.titulo_documento}". Documentos disponibles: ${documentos.map(d => d.title).join(', ')}`
        }
      }
      
      // This creates a draft planeacion that the user must confirm
      const planeacionDraft = {
        materia: doc.document_type === 'proyecto' ? 'Proyecto' : 'Clase',
        tema: payload.tema_clase,
        objetivo: `Basado en documento "${doc.title}": ${doc.content_summary?.substring(0, 100) || 'Creación de clase'}`,
        actividades: '1. Análisis del documento\n2. Discusión grupal\n3. Aplicación práctica',
        recursos: `Documento: ${doc.title}`,
        evaluacion: 'Participación y producto de clase',
        fecha: new Date().toISOString().split('T')[0],
        grado: context?.grado || 1,
        tipo: 'normal'
      }
      
      return {
        ok: true,
        data: planeacionDraft,
        requires_confirmation: true,
        mensaje: `📚 Voy a crear una planeación basada en "${doc.title}".\n\n**Tema:** ${payload.tema_clase}\n**Basado en:** ${doc.content_summary?.substring(0, 150)}...\n\n¿Confirmas?`,
        confirmation_payload: planeacionDraft
      }
    },
    success_message: 'Planeación basada en documento lista para confirmar.',
    rollback_possible: false,
  },
  {
    id: 'preguntar_documentos',
    label: 'Preguntar a documentos',
    icon: '❓',
    tier_required: 1,
    description: 'Haz una pregunta sobre el contenido de tus documentos.',
    intent_examples: ['según mis documentos', 'qué dicen mis documentos sobre', 'busca en mis documentos', 'consulta documentos'],
    required_fields: ['pregunta'],
    preview: (payload) => `❓ Pregunta: ${payload.pregunta}`,
    execute: async (payload, context) => {
      const ragContext = context?.ragContext
      const chunks = ragContext?.chunks_relevantes || []
      
      if (chunks.length === 0) {
        return {
          ok: true,
          data: { respuesta: 'No encontré información relevante en tus documentos. Prueba con otra pregunta o sube más documentos.' }
        }
      }
      
      // Simulate RAG response with found chunks
      const contextText = chunks.map(c => c.content).join('\n\n')
      const sources = [...new Set(chunks.map(c => c.source))]
      
      return {
        ok: true,
        data: {
          pregunta: payload.pregunta,
          contexto_encontrado: contextText.substring(0, 500) + '...',
          fuentes: sources
        },
        mensaje: `❓ **Pregunta:** ${payload.pregunta}\n\n📄 **Contexto encontrado en:** ${sources.join(', ')}\n\nBasado en tus documentos, puedo decirte que hay información relevante sobre tu consulta. Para una respuesta completa, revisa las fuentes citadas.`
      }
    },
    success_message: 'Consulta realizada a documentos.',
    rollback_possible: false,
  },
]
