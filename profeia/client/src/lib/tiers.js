export const TIERS = {
  1: {
    id: 1,
    name: 'Básico',
    price: 'Gratis',
    color: '#34A853',
    features: [
      'Dashboard completo',
      'Bitácora y asistencia',
      'Planeaciones y evaluaciones',
      'Sugerencias IA básicas',
      'ProfeIA modo piloto',
    ],
    agentCapabilities: ['resumir_dia', 'sugerir_accion', 'escribir_bitacora', 'revisar_asistencia', 'navegar', 'generar_planeacion'],
    badge: null,
  },
  2: {
    id: 2,
    name: 'Profesional',
    price: '$299 MXN/mes',
    color: '#4285F4',
    features: [
      'Todo lo de Básico',
      'Agente IA con acciones ejecutables',
      'Generación de planeaciones',
      'Análisis de contexto del grupo',
      'Sugerencias avanzadas',
    ],
    agentCapabilities: ['resumir_dia', 'sugerir_accion', 'escribir_bitacora', 'revisar_asistencia', 'navegar', 'generar_planeacion'],
    badge: 'PRO',
  },
  3: {
    id: 3,
    name: 'EVA',
    price: '$499 MXN/mes',
    color: '#A142F4',
    features: [
      'Todo lo de Profesional',
      'Agente de voz EVA',
      'EVA classroom runtime',
      'Escucha ética en clase',
      'Notas y participación automática',
    ],
    agentCapabilities: 'all',
    badge: 'EVA',
    comingSoon: true,
  },
}

export const PILOT_FULL_AGENT_ACCESS = true
const PILOT_UNLOCKED_CAPABILITIES = ['generar_planeacion']

export const STRIPE_CONFIG = {
  2: {
    stripe_price_id: 'price_PLACEHOLDER_PROFESIONAL_MXN',
    subscription_status: 'inactive',
    billing_interval: 'month',
  },
  3: {
    stripe_price_id: 'price_PLACEHOLDER_EVA_MXN',
    subscription_status: 'inactive',
    billing_interval: 'month',
  },
}

// Para el piloto, todos los usuarios están en Tier 1
// En el futuro, leer de userProfile.tier o de Supabase
export const getCurrentTier = (userProfile) => {
  const profileTier = Number(userProfile?.tier)
  if (Number.isFinite(profileTier) && TIERS[profileTier]) return profileTier
  return 1
}

export const isFeatureAvailable = (featureId, tier) => {
  if (PILOT_FULL_AGENT_ACCESS && PILOT_UNLOCKED_CAPABILITIES.includes(featureId)) {
    return true
  }

  const tierConfig = TIERS[tier]
  if (!tierConfig) return false
  if (tierConfig.agentCapabilities === 'all') return true
  return tierConfig.agentCapabilities.includes(featureId)
}
