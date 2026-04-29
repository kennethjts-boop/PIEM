import { api } from '../api'
import { getTareasLocales } from './tareasLocales'
import { getActionLog } from './actionLog'
import { getAvisosNoLeidos, getMergedAvisos } from './avisos'
import { fetchHgiClassroomSignals, isHgiConfigured } from './hgiClient'

/**
 * buildAgentContext — reúne contexto completo del docente.
 * Tolerante a errores: cada sección tiene try/catch independiente.
 * @param {number|null} docenteId
 * @param {object|null} userProfile
 * @returns {Promise<object>}
 */
export async function buildAgentContext(docenteId, userProfile) {
  const now = new Date()
  const fecha = toLocalYmd(now)
  const mes = now.getMonth() + 1
  const anio = now.getFullYear()

  const ctx = {
    docenteId: docenteId || null,
    userProfile: userProfile || null,
    fecha,
    mes,
    anio,
    weekday: now.toLocaleDateString('es-MX', { weekday: 'long' }),

    docente: null,
    grado: null,
    alumnos: [],

    asistenciaHoy: [],
    bitacoraHoy: [],

    planeacionesMes: [],
    evaluacionesMes: [],

    sugerenciasPendientes: [],
    avisosNoLeidos: [],

    tareasLocales: [],
    actionLogReciente: [],

    // ============================================================
    // EXTENSIÓN FUTURA — EVA Classroom Runtime (Tier 3)
    // ============================================================
    // Cuando EVA esté activo, estos campos se poblarán:
    //
    // emotionalSignals: {
    //   attention: 0.0-1.0,      // nivel de atención del grupo
    //   engagement: 0.0-1.0,     // nivel de participación
    //   stress: 0.0-1.0,         // señales de estrés (no invasivo)
    //   timestamp: ISO string,
    // }
    //
    // evaObservations: [
    //   {
    //     timestamp: ISO string,
    //     type: 'participacion' | 'distraccion' | 'confusion' | 'logro',
    //     alumno_id: number | null,  // null = observación grupal
    //     note: string,
    //   }
    // ]
    //
    // Fuente de datos EVA:
    //   - Micrófono ético (con consentimiento explícito)
    //   - Análisis de voz del docente (no de alumnos)
    //   - Notas manuales del docente durante clase
    //   - Integración con EVA classroom runtime (apps/api)
    //
    // Punto de integración:
    //   1. EVA runtime → POST /api/eva/observations
    //   2. buildAgentContext() → GET /api/eva/context/:docenteId/:fecha
    //   3. agentReasoner recibe emotionalSignals en context_summary
    // ============================================================
    emotionalSignals: null,
    evaObservations: [],
  }

  if (!docenteId) return ctx

  try {
    const docentes = await api.getDocentes()
    ctx.docente = Array.isArray(docentes)
      ? docentes.find((d) => Number(d?.id) === Number(docenteId)) || null
      : null
    ctx.grado = ctx.docente?.grado || null
  } catch {}

  const [
    alumnosResult,
    asistenciaResult,
    bitacoraResult,
    planeacionesResult,
    evaluacionesResult,
    sugerenciasResult,
    avisosResult,
    tareasResult,
    actionLogResult,
  ] = await Promise.allSettled([
    api.getAlumnos(docenteId),
    api.getAsistencia(docenteId, fecha),
    api.getBitacora(docenteId, fecha),
    api.getPlaneaciones(docenteId, mes, anio),
    api.getEvaluaciones(docenteId, { mes, anio }),
    api.getSugerencias(docenteId),
    Promise.resolve(getUnreadAvisosMerged()),
    Promise.resolve(getTareasLocales()),
    Promise.resolve(getActionLog()),
  ])

  if (alumnosResult.status === 'fulfilled' && Array.isArray(alumnosResult.value)) {
    ctx.alumnos = alumnosResult.value
  }

  if (asistenciaResult.status === 'fulfilled' && Array.isArray(asistenciaResult.value)) {
    ctx.asistenciaHoy = asistenciaResult.value
  }

  if (bitacoraResult.status === 'fulfilled' && Array.isArray(bitacoraResult.value)) {
    ctx.bitacoraHoy = bitacoraResult.value
  }

  if (planeacionesResult.status === 'fulfilled' && Array.isArray(planeacionesResult.value)) {
    ctx.planeacionesMes = planeacionesResult.value
  }

  if (evaluacionesResult.status === 'fulfilled' && Array.isArray(evaluacionesResult.value)) {
    ctx.evaluacionesMes = evaluacionesResult.value
  }

  if (sugerenciasResult.status === 'fulfilled' && Array.isArray(sugerenciasResult.value)) {
    ctx.sugerenciasPendientes = sugerenciasResult.value.filter((s) => !s?.aceptada && !s?.rechazada)
  }

  if (avisosResult.status === 'fulfilled' && Array.isArray(avisosResult.value)) {
    ctx.avisosNoLeidos = avisosResult.value
  }

  if (tareasResult.status === 'fulfilled' && Array.isArray(tareasResult.value)) {
    ctx.tareasLocales = tareasResult.value.filter((t) => !t?.done)
  }

  if (actionLogResult.status === 'fulfilled' && Array.isArray(actionLogResult.value)) {
    ctx.actionLogReciente = actionLogResult.value.slice(0, 10)
  }

  // HGI/EVA signals (Tier 3 — solo si está configurado)
  try {
    if (isHgiConfigured()) {
      const signals = await fetchHgiClassroomSignals({
        docenteId,
        sessionId: `session-${fecha}`,
        fecha,
      })
      ctx.emotionalSignals = signals
    }
  } catch {}

  return ctx
}

function toLocalYmd(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

function getUnreadAvisosMerged() {
  return getAvisosNoLeidos(getMergedAvisos())
}
