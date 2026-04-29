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
export async function fetchHgiClassroomSignals({ docenteId, sessionId, fecha } = {}) {
  void docenteId

  if (!HGI_ENABLED) {
    return fallbackHgiSignals()
  }

  try {
    // IMPORTANTE: No se envía docenteId ni datos personales a HGI
    // Solo se envía sessionId anónimo y fecha
    const response = await fetch(`${HGI_BASE_URL}/v1/classroom/signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HGI_API_KEY}`,
        'X-Schema-Version': 'profeia-eva-v1',
      },
      body: JSON.stringify({
        session_id: sessionId || `session-${fecha}`,
        fecha,
      }),
    })

    if (!response.ok) {
      console.warn(`[hgiClient] HGI API error: ${response.status}`)
      return fallbackHgiSignals()
    }

    const raw = await response.json()
    return normalizeHgiSignals(raw)
  } catch (err) {
    console.warn('[hgiClient] HGI fetch failed, using fallback:', err?.message || err)
    return fallbackHgiSignals()
  }
}
