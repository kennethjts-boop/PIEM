/**
 * hgiClient.js — Cliente stub para futura integración EVA/HGI-MX
 *
 * REGLAS DE PRIVACIDAD:
 * - NO enviar audio
 * - NO enviar transcripts
 * - NO enviar datos personales sensibles innecesarios
 * - Solo señales agregadas y anonimizadas
 * - Si HGI no está configurado, retornar null/fallback
 * - No romper ProfeIA si HGI falla
 *
 * HGI-MX es un servicio EXTERNO. Profeia es cliente, no propietario.
 * HGI-MX NO se modifica ni se absorbe en este repo.
 */

// ============================================================
// CONTRATO OFICIAL — Shape de señales HGI-MX → Profeia
// Schema: profeia-eva-v1
// ============================================================
export const HGI_SIGNAL_SHAPE = {
  schema: 'profeia-eva-v1',
  attention_signal: 0,
  confusion_signal: 0,
  emotional_state: '',
  classroom_event: '',
  suggested_intervention: '',
  confidence: 0,
  source: 'hgi-mx',
  timestamp: '',
}

// ============================================================
// CONFIGURACIÓN
// ============================================================
const HGI_BASE_URL = import.meta.env.VITE_HGI_API_URL || null
const HGI_API_KEY = import.meta.env.VITE_HGI_API_KEY || null
const HGI_ENABLED = Boolean(HGI_BASE_URL && HGI_API_KEY)

function buildHgiHeaders(apiKey) {
  return {
    'x-hgi-api-key': apiKey,
    'x-hgi-client-id': 'profeia-pilot',
    'X-Schema-Version': 'profeia-eva-v1',
  }
}

function buildTimeoutSignal(timeoutMs = 2000) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }
  return undefined
}

async function fetchWithFallback(baseUrl, apiKey, sessionId, fecha, classroomId) {
  const primaryUrl = `${baseUrl}/integration/profeia/signals`
  const primaryResponse = await fetch(primaryUrl, {
    method: 'GET',
    headers: buildHgiHeaders(apiKey),
  })
  if (primaryResponse.ok) return primaryResponse.json()

  const fallbackUrl = `${baseUrl}/v1/classroom/signals`
  const fallbackBody = {
    session_id: sessionId,
    fecha,
  }
  if (classroomId) fallbackBody.classroom_id = classroomId

  const fallbackResponse = await fetch(fallbackUrl, {
    method: 'POST',
    headers: {
      ...buildHgiHeaders(apiKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fallbackBody),
  })
  if (fallbackResponse.ok) return fallbackResponse.json()

  throw new Error(`HGI endpoints unavailable: ${primaryResponse.status} / ${fallbackResponse.status}`)
}

/**
 * isHgiConfigured — verifica si HGI está configurado
 */
export function isHgiConfigured() {
  return HGI_ENABLED
}

/**
 * fallbackHgiSignals — señales vacías cuando HGI no está disponible
 */
export function fallbackHgiSignals() {
  return null
}

/**
 * normalizeHgiSignals — normaliza la respuesta de HGI al shape oficial
 * Tolerante a campos faltantes o con tipos incorrectos
 */
export function normalizeHgiSignals(raw) {
  if (!raw || typeof raw !== 'object') return fallbackHgiSignals()

  return {
    schema: 'profeia-eva-v1',
    attention_signal: typeof raw.attention_signal === 'number'
      ? Math.max(0, Math.min(1, raw.attention_signal))
      : 0,
    confusion_signal: typeof raw.confusion_signal === 'number'
      ? Math.max(0, Math.min(1, raw.confusion_signal))
      : 0,
    emotional_state: ['calm', 'engaged', 'distracted', 'stressed'].includes(raw.emotional_state)
      ? raw.emotional_state
      : 'calm',
    classroom_event: ['participacion', 'distraccion', 'confusion', 'logro', 'none'].includes(raw.classroom_event)
      ? raw.classroom_event
      : 'none',
    suggested_intervention: String(raw.suggested_intervention || '').slice(0, 500),
    confidence: typeof raw.confidence === 'number'
      ? Math.max(0, Math.min(1, raw.confidence))
      : 0,
    source: 'hgi-mx',
    timestamp: raw.timestamp || new Date().toISOString(),
  }
}

/**
 * fetchHgiClassroomSignals — obtiene señales agregadas del aula desde HGI-MX
 *
 * @param {object} params
 * @param {string} params.docenteId — ID del docente (no se envía a HGI, solo para logging local)
 * @param {string} params.sessionId — ID de sesión de clase (anónimo)
 * @param {string} params.fecha — fecha de la sesión (YYYY-MM-DD)
 * @returns {Promise<object|null>}
 */
export async function fetchHgiClassroomSignals({ docenteId, sessionId, fecha, classroomId } = {}) {
  void docenteId

  if (!HGI_ENABLED) {
    return fallbackHgiSignals()
  }

  try {
    // IMPORTANTE: No se envía docenteId ni datos personales a HGI
    // Solo se envía session_id anónimo, fecha y classroom_id opcional (anónimo)
    // Nunca audio, transcripts ni nombres de alumnos.
    const raw = await fetchWithFallback(
      HGI_BASE_URL,
      HGI_API_KEY,
      sessionId || `session-${fecha}`,
      fecha,
      classroomId || null
    )
    return normalizeHgiSignals(raw)
  } catch (err) {
    console.warn('[hgiClient] HGI fetch failed, using fallback:', err?.message || err)
    return fallbackHgiSignals()
  }
}

export async function checkHgiConnection() {
  if (!HGI_ENABLED) return 'not_configured'

  try {
    const response = await fetch(`${HGI_BASE_URL}/integration/profeia/signals`, {
      method: 'GET',
      headers: buildHgiHeaders(HGI_API_KEY),
      signal: buildTimeoutSignal(2000),
    })
    return response.ok ? 'active' : 'error'
  } catch {
    return 'error'
  }
}
