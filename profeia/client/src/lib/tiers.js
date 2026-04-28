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
    agentCapabilities: ['resumir_dia', 'sugerir_accion', 'escribir_bitacora', 'revisar_asistencia', 'navegar'],
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

// Para el piloto, todos los usuarios están en Tier 1
// En el futuro, leer de userProfile.tier o de Supabase
export const getCurrentTier = (userProfile) => {
  // TODO: leer de userProfile.tier cuando se implemente pagos
  void userProfile
  return 1
}

export const isFeatureAvailable = (featureId, tier) => {
  const tierConfig = TIERS[tier]
  if (!tierConfig) return false
  if (tierConfig.agentCapabilities === 'all') return true
  return tierConfig.agentCapabilities.includes(featureId)
}
