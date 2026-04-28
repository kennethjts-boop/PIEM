/**
 * agentReasoner — abstracción de razonamiento del agente
 * Modos:
 *   'rules'  — default, usa detectIntent local (sin LLM)
 *   'openai' — usa POST /api/agent/reason en el server Express
 *
 * NUNCA exponer OPENAI_API_KEY en el frontend.
 * El frontend solo llama al backend; el backend llama a OpenAI.
 */

import { detectIntent } from './profeiaAgent'
import { api } from '../api'

const REASONER_MODE = import.meta.env.VITE_AGENT_REASONER_MODE || 'rules'

/**
 * reason — detecta intent y estructura el payload
 * @param {string} mensaje
 * @param {object} context
 * @param {string[]} availableTools
 * @returns {Promise<object>}
 */
export async function reason(mensaje, context, availableTools = []) {
  if (REASONER_MODE === 'openai') {
    try {
      return await reasonWithOpenAI(mensaje, context, availableTools)
    } catch (err) {
      console.warn('[agentReasoner] OpenAI fallback to rules:', err.message)
    }
  }

  return reasonWithRules(mensaje)
}

function reasonWithRules(mensaje) {
  const intent = detectIntent(mensaje)
  return {
    intent,
    tool_id: intent,
    confidence: 0.7,
    origin: 'rules',
    explanation: `Detectado por reglas locales: intent=${intent}`,
    missing_fields: [],
  }
}

async function reasonWithOpenAI(mensaje, context, availableTools) {
  const contextSummary = {
    fecha: context?.fecha,
    grado: context?.grado,
    alumnos_count: context?.alumnos?.length || 0,
    asistencia_hoy: context?.asistenciaHoy?.length || 0,
    bitacora_hoy: context?.bitacoraHoy?.length || 0,
    sugerencias_pendientes: context?.sugerenciasPendientes?.length || 0,
    tareas_locales: context?.tareasLocales?.length || 0,
  }

  const result = await api.agentReason({
    mensaje,
    context_summary: contextSummary,
    available_tools: availableTools,
  })

  return {
    intent: result.intent || 'general',
    tool_id: result.tool_id || result.intent || 'general',
    confidence: result.confidence || 0.9,
    origin: result.origin || 'openai',
    explanation: result.explanation || '',
    missing_fields: result.missing_fields || [],
    payload_override: result.payload || null,
  }
}
