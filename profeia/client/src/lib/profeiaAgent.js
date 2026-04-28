import { isFeatureAvailable } from './tiers'
import { TOOL_REGISTRY, buildToolPayload, sectionFromMessage } from './agentTools'

function buildGeneralResponse(mensaje, context) {
  const saludo = context?.grado ? `para ${context.grado}°` : 'para tu grupo'
  return {
    text: `Puedo ayudarte ${saludo} ejecutando acciones reales: planeación, bitácora, evaluaciones, tareas locales y avisos. Dime qué quieres que haga y te pediré confirmación antes de ejecutar.`,
    action: { type: 'navigate', path: '/dashboard' },
    actionLabel: 'Ir al dashboard',
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

export const ACTION_REGISTRY = TOOL_REGISTRY

// Detectar intent del mensaje del usuario
export function detectIntent(mensaje) {
  const lower = String(mensaje || '').toLowerCase()
  if (/(crea una planeaci[oó]n|genera una planeaci[oó]n|hazme una clase de|planea|planeaci[oó]n de|plan de clase)/.test(lower)) return 'crear_planeacion'
  if (/(anota en bit[aá]cora|registra que hubo bullying|guarda este incidente|registra en bit[aá]cora|bit[aá]cora)/.test(lower)) return 'guardar_bitacora'
  if (/(eval[uú]a a|registra calificaci[oó]n|prepara evaluaci[oó]n|calificaci[oó]n de)/.test(lower)) return 'crear_evaluacion'
  if (/(recu[eé]rdame|crea una tarea|pendiente para ma[ñn]ana|no olvides)/.test(lower)) return 'crear_tarea_local'
  if (/(marca el aviso como le[ií]do|ya vi el aviso|marcar le[ií]do)/.test(lower)) return 'marcar_aviso_leido'
  if (/(ir a|abrir|navegar|ver|mostrar)/.test(lower)) return 'navegar'
  return 'general'
}

// Ejecutar acción por intent
export async function executeIntent(intent, context, mensaje) {
  if (intent === 'navegar') {
    return executeNavegar(context, { mensaje })
  }

  const tool = TOOL_REGISTRY.find((t) => t.id === intent)
  if (!tool) return buildGeneralResponse(mensaje, context)

  const capabilityAllowed = isFeatureAvailable(intent, context?.tier || 1)
  if (!capabilityAllowed) {
    return {
      text: '⭐ Esta función está disponible en el plan Profesional ($299 MXN/mes).',
      action: { type: 'navigate', path: '/planes' },
      actionLabel: 'Ver planes',
    }
  }

  const payload = buildToolPayload(tool, mensaje, context)

  return {
    text: 'Voy a hacer lo siguiente:',
    confirmation: {
      tool_id: tool.id,
      tool_label: tool.label,
      preview: tool.preview(payload),
      payload,
      success_message: tool.success_message,
    },
  }
}
