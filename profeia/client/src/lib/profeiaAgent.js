import { api } from '../api'
import { isFeatureAvailable, PILOT_FULL_AGENT_ACCESS } from './tiers'

function toLocalYmd(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

function getDateParts(fechaIso) {
  const base = fechaIso ? new Date(`${fechaIso}T00:00:00`) : new Date()
  const safe = Number.isNaN(base.getTime()) ? new Date() : base
  return {
    date: safe,
    fecha: fechaIso || toLocalYmd(safe),
    mes: safe.getMonth() + 1,
    anio: safe.getFullYear(),
    weekday: safe.getDay(),
  }
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

function normalizePendingSugerencias(list) {
  return (Array.isArray(list) ? list : []).filter((item) => !item?.aceptada && !item?.rechazada)
}

function sectionFromMessage(mensaje) {
  const lower = String(mensaje || '').toLowerCase()

  if (/(asistencia|falt|ausencia)/.test(lower)) return { path: '/asistencia', section: 'asistencia' }
  if (/(bitácora|bitacora|incidente)/.test(lower)) return { path: '/bitacora', section: 'bitácora' }
  if (/(planeaci|plan)/.test(lower)) return { path: '/planeacion', section: 'planeación' }
  if (/(evaluaci|calificaci|rúbrica|rubrica)/.test(lower)) return { path: '/evaluacion', section: 'evaluación' }
  if (/(alumno|grupo|estudiante)/.test(lower)) return { path: '/alumnos', section: 'alumnos' }
  if (/(sugerencia|profeia|recomendaci)/.test(lower)) return { path: '/sugerencias', section: 'sugerencias' }
  if (/(documento|admin|archivo)/.test(lower)) return { path: '/admin', section: 'documentos' }

  return { path: '/dashboard', section: 'dashboard' }
}

function buildGeneralResponse(mensaje, context) {
  const materia = inferMateriaFromMessage(mensaje)
  const saludo = context?.grado ? `para ${context.grado}°` : 'para tu grupo'
  return {
    text: `Puedo ayudarte ${saludo} con planeación, bitácora, asistencia, sugerencias y navegación. Si quieres, empezamos con una acción concreta en ${materia}.`,
    action: { type: 'navigate', path: '/dashboard' },
    actionLabel: 'Ir al dashboard',
  }
}

async function executeGenerarPlaneacion(context, params) {
  const docenteId = context?.docenteId
  if (!docenteId) {
    return {
      text: 'Necesito tu contexto docente para generar el borrador. Intenta recargar la sesión e inicia de nuevo.',
      action: { type: 'navigate', path: '/planeacion' },
      actionLabel: 'Ver planeaciones',
    }
  }

  const { fecha, mes, anio } = getDateParts(context?.fecha)
  const materia = inferMateriaFromMessage(params?.mensaje)

  let planeacionesMes = []
  try {
    const data = await api.getPlaneaciones(docenteId, mes, anio)
    planeacionesMes = Array.isArray(data) ? data : []
  } catch {
    planeacionesMes = []
  }

  const delDia = planeacionesMes.filter((item) => String(item?.fecha || '') === fecha)
  const temaBase = delDia[0]?.tema || `Introducción aplicada a ${materia}`
  const objetivo = `Que el grupo conecte saberes previos con una actividad práctica de ${materia} y evidencie comprensión al cierre.`

  const actividades = [
    'Apertura (10 min): activación de saberes previos con pregunta detonadora.',
    `Desarrollo (25 min): trabajo guiado por equipos sobre ${temaBase.toLowerCase()}.`,
    'Cierre (10 min): evidencia rápida (ticket de salida) y retroalimentación breve.',
  ]

  const text = [
    `📋 Borrador de planeación para ${fecha}.`,
    `Materia sugerida: ${materia}.`,
    `Tema sugerido: ${temaBase}.`,
    `Objetivo: ${objetivo}`,
    'Actividades:',
    ...actividades.map((item) => `• ${item}`),
    delDia.length > 0 ? `Ya tienes ${delDia.length} planeación(es) registrada(s) hoy; puedes reutilizar estructura.` : 'No encontré planeaciones registradas hoy; este borrador te puede servir como punto de partida.'
  ].join('\n')

  return {
    text,
    action: { type: 'navigate', path: '/planeacion' },
    actionLabel: 'Ver planeaciones',
  }
}

async function executeEscribirBitacora(_context, params) {
  const mensaje = String(params?.mensaje || '').trim()
  const tipo = /(bullying|acoso)/i.test(mensaje)
    ? 'bullying'
    : /(violencia|agresi)/i.test(mensaje)
      ? 'violencia'
      : 'general'

  const gravedad = tipo === 'general' ? 2 : 4

  const text = [
    '📓 Borrador de bitácora listo para copiar:',
    `Tipo: ${tipo}`,
    `Descripción: ${mensaje || 'Situación observada en clase, pendiente de ampliar.'}`,
    `Gravedad sugerida: ${gravedad}/5`,
    'Alumnos involucrados: (completar)',
    'Acciones tomadas: Diálogo inicial, registro de hechos y seguimiento con tutoría.'
  ].join('\n')

  return {
    text,
    action: { type: 'navigate', path: '/bitacora' },
    actionLabel: 'Abrir bitácora',
  }
}

async function executeResumirDia(context) {
  const docenteId = context?.docenteId
  if (!docenteId) return { text: 'No tengo un docenteId activo para resumir el día.' }

  const { fecha, mes, anio } = getDateParts(context?.fecha)

  let stats = null
  let eventos = []

  try {
    stats = await api.getStats(docenteId)
  } catch {
    stats = null
  }

  try {
    const data = await api.getEventos(docenteId, mes, anio)
    eventos = Array.isArray(data) ? data : []
  } catch {
    eventos = []
  }

  const eventosHoy = eventos.filter((item) => String(item?.fecha || '') === fecha)

  const text = [
    `📅 Resumen del día (${fecha})`,
    stats
      ? `Planeaciones: ${stats.planeaciones || 0} · Bitácora: ${stats.bitacora || 0} · Eventos: ${stats.eventos || 0} · Sugerencias pendientes: ${stats.sugerenciasPendientes || 0}`
      : 'No pude consultar estadísticas globales en este momento.',
    eventosHoy.length > 0
      ? `Eventos de hoy: ${eventosHoy.map((ev) => ev.titulo || ev.tipo || 'Evento').join(', ')}`
      : 'No hay eventos programados para hoy.'
  ].join('\n')

  return { text }
}

async function executeSugerirAccion(context, params) {
  const docenteId = context?.docenteId
  const { weekday } = getDateParts(context?.fecha)
  const materia = inferMateriaFromMessage(params?.mensaje)

  if (docenteId) {
    try {
      const data = await api.getSugerencias(docenteId)
      const pendientes = normalizePendingSugerencias(data)
      if (pendientes.length > 0) {
        const top = pendientes.slice(0, 3).map((s, idx) => `${idx + 1}. ${s?.titulo || 'Sugerencia pedagógica'} (${s?.prioridad || 'media'})`)
        return {
          text: `💡 Encontré ${pendientes.length} sugerencia(s) pendiente(s).\n${top.join('\n')}`,
          action: { type: 'navigate', path: '/sugerencias' },
          actionLabel: 'Ver sugerencias',
        }
      }
    } catch {
      // Fall back to local pedagogic recommendation.
    }
  }

  const diaPlan = {
    1: 'Lunes: inicia con diagnóstico breve y meta visible de aprendizaje.',
    2: 'Martes: prioriza práctica guiada con retroalimentación inmediata.',
    3: 'Miércoles: aplica trabajo colaborativo con roles definidos.',
    4: 'Jueves: integra evaluación formativa rápida y ajuste en clase.',
    5: 'Viernes: cierre reflexivo con evidencia de logro por equipo.',
    6: 'Sábado: consolida pendientes y plan de refuerzo para la próxima semana.',
    0: 'Domingo: prepara actividades de bajo umbral para arrancar la semana.'
  }

  return {
    text: `💡 Recomendación pedagógica para ${materia}: ${diaPlan[weekday] || diaPlan[1]}`,
    action: { type: 'navigate', path: '/sugerencias' },
    actionLabel: 'Ver sugerencias',
  }
}

function weekDates(fechaIso) {
  const { date } = getDateParts(fechaIso)
  const dow = date.getDay()
  const toMon = dow === 0 ? -6 : 1 - dow
  const mon = new Date(date)
  mon.setDate(date.getDate() + toMon)

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return toLocalYmd(d)
  })
}

async function executeRevisarAsistencia(context) {
  const docenteId = context?.docenteId
  if (!docenteId) {
    return {
      text: 'No tengo docenteId para consultar asistencia.',
      action: { type: 'navigate', path: '/asistencia' },
      actionLabel: 'Registrar asistencia',
    }
  }

  const { fecha } = getDateParts(context?.fecha)

  let recordsHoy = []
  try {
    const today = await api.getAsistencia(docenteId, fecha)
    recordsHoy = Array.isArray(today) ? today : []
  } catch {
    recordsHoy = []
  }

  const faltaronHoy = recordsHoy.filter((r) => Number(r?.presente) === 0)

  const fechasSemana = weekDates(fecha)
  const faltasSemana = new Map()

  await Promise.all(
    fechasSemana.map(async (f) => {
      try {
        const data = await api.getAsistencia(docenteId, f)
        const absent = (Array.isArray(data) ? data : []).filter((r) => Number(r?.presente) === 0)
        absent.forEach((row) => {
          const key = String(row?.alumno_nombre || '').trim()
          if (!key) return
          faltasSemana.set(key, (faltasSemana.get(key) || 0) + 1)
        })
      } catch {
        // ignore partial failures; preserve available data.
      }
    })
  )

  const frecuentes = Array.from(faltasSemana.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const text = [
    `✅ Asistencia de hoy (${fecha}): ${recordsHoy.length} registro(s).`,
    faltaronHoy.length > 0
      ? `Faltaron hoy: ${faltaronHoy.map((r) => r.alumno_nombre).filter(Boolean).join(', ')}`
      : 'No hay faltas registradas hoy.',
    frecuentes.length > 0
      ? `Ausencias frecuentes esta semana: ${frecuentes.map(([name, count]) => `${name} (${count})`).join(', ')}`
      : 'No detecté ausencias frecuentes esta semana (umbral: 2).'
  ].join('\n')

  return {
    text,
    action: { type: 'navigate', path: '/asistencia' },
    actionLabel: 'Registrar asistencia',
  }
}

async function executeNavegar(_context, params) {
  const target = sectionFromMessage(params?.mensaje)
  return {
    text: `🧭 Te llevo a ${target.section}.`,
    action: { type: 'navigate', path: target.path },
    actionLabel: 'Ir ahora',
  }
}

// Registry de acciones disponibles
export const ACTION_REGISTRY = [
  {
    id: 'generar_planeacion',
    label: 'Generar borrador de planeación',
    description: 'Crea un borrador de planeación para una materia y fecha específica',
    tier: 2,
    icon: '📋',
    execute: executeGenerarPlaneacion,
  },
  {
    id: 'escribir_bitacora',
    label: 'Ayudar a escribir bitácora',
    description: 'Genera un borrador de entrada de bitácora basado en lo que describes',
    tier: 1,
    icon: '📓',
    execute: executeEscribirBitacora,
  },
  {
    id: 'resumir_dia',
    label: 'Resumir el día',
    description: 'Genera un resumen del día con planeaciones, asistencia y eventos',
    tier: 1,
    icon: '📅',
    execute: executeResumirDia,
  },
  {
    id: 'sugerir_accion',
    label: 'Sugerir acción pedagógica',
    description: 'Recomienda una acción pedagógica basada en el contexto actual',
    tier: 1,
    icon: '💡',
    execute: executeSugerirAccion,
  },
  {
    id: 'revisar_asistencia',
    label: 'Revisar asistencia',
    description: 'Muestra el estado de asistencia del día y alumnos con ausencias frecuentes',
    tier: 1,
    icon: '✅',
    execute: executeRevisarAsistencia,
  },
  {
    id: 'navegar',
    label: 'Ir a una sección',
    description: 'Navega a una sección específica de la app',
    tier: 1,
    icon: '🧭',
    execute: executeNavegar,
  },
]

// Detectar intent del mensaje del usuario
export function detectIntent(mensaje) {
  const lower = String(mensaje || '').toLowerCase()
  if (/(planeaci|planear|plan de clase|borrador)/.test(lower)) return 'generar_planeacion'
  if (/(bitácora|bitacora|incidente|registrar|anotar)/.test(lower)) return 'escribir_bitacora'
  if (/(resumen|qué pasó|qué vemos|hoy|día de hoy)/.test(lower)) return 'resumir_dia'
  if (/(sugerencia|qué hago|cómo|estrategia|ayuda)/.test(lower)) return 'sugerir_accion'
  if (/(asistencia|falta|ausencia|quién faltó)/.test(lower)) return 'revisar_asistencia'
  if (/(ir a|abrir|navegar|ver|mostrar)/.test(lower)) return 'navegar'
  return 'general'
}

// Ejecutar acción por intent
export async function executeIntent(intent, context, mensaje) {
  const action = ACTION_REGISTRY.find((item) => item.id === intent)
  if (!action) return buildGeneralResponse(mensaje, context)

  const capabilityAllowed = isFeatureAvailable(intent, context?.tier || 1)
  const bypassTierGate = PILOT_FULL_AGENT_ACCESS && context?.pilotOverride !== false && intent === 'generar_planeacion'
  if (!capabilityAllowed && !bypassTierGate) {
    return {
      text: '⭐ Esta función está disponible en el plan Profesional ($299 MXN/mes). Por ahora estás en el plan Básico (piloto gratuito).',
      action: { type: 'navigate', path: '/planes' },
      actionLabel: 'Ver planes',
    }
  }

  return action.execute(context, { mensaje })
}
