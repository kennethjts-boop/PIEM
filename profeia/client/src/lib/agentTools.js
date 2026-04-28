import { api } from '../api'
import { AVISOS_STUB, getAvisosNoLeidos } from './avisos'
import { addTareaLocal } from './tareasLocales'
import { detectCalificacion } from './calificacionParser'

const AVISOS_READ_KEY = 'profeia_avisos_read_v1'

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

  return ''
}

function loadAvisosReadMap() {
  try {
    const raw = localStorage.getItem(AVISOS_READ_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveAvisosReadMap(readMap) {
  localStorage.setItem(AVISOS_READ_KEY, JSON.stringify(readMap))
}

function getFirstUnreadAviso() {
  const readMap = loadAvisosReadMap()
  const merged = AVISOS_STUB.map((item) => ({ ...item, read_at: readMap[item.id] || item.read_at }))
  const unread = getAvisosNoLeidos(merged).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return unread[0] || null
}

function getUnreadAvisoById(avisoId) {
  if (!avisoId) return null
  const readMap = loadAvisosReadMap()
  const merged = AVISOS_STUB.map((item) => ({ ...item, read_at: readMap[item.id] || item.read_at }))
  const unread = getAvisosNoLeidos(merged)
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
      const readMap = loadAvisosReadMap()
      const executedAt = new Date().toISOString()
      saveAvisosReadMap({ ...readMap, [payload.aviso_id]: executedAt })
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
]
