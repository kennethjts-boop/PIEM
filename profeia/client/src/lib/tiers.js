/**
 * PROFEIA Tier System - Official Commercial Model
 * Based on PROFEIA_EVA_CANON.md
 *
 * Tier 1: Gratis - Manual work with chat suggestions
 * Tier 2: Profesional ($399) - Agent executes actions for you
 * Tier 3: EVA Assistant ($799) - Second teacher assistant mode
 *
 * Trial Ladder:
 * - All teachers start with Tier 2 free for 1 month
 * - Tier 2 subscribers can try Tier 3 for 1 month at Tier 2 price
 */

// ============================================
// TIER DEFINITIONS (Official Pricing)
// ============================================

export const TIERS = {
  1: {
    id: 1,
    name: 'Gratis',
    shortName: 'Gratis',
    price: '$0 MXN',
    monthlyPrice: 0,
    color: '#34A853',
    tagline: 'Trabaja manualmente con ayuda del chat',
    description: 'Dashboard completo, asistencia, bitácora y planeación manual. Chat con sugerencias para copiar y pegar.',
    features: [
      'Dashboard docente completo',
      'Asistencia manual',
      'Bitácora manual',
      'Planeación manual',
      'Evaluaciones manuales',
      'Documentos básicos',
      'RAG limitado',
      'Chat modo sugerencia (copiar/pegar)',
      'Onboarding docente',
    ],
    agentCapabilities: ['crear_tarea_local', 'marcar_aviso_leido', 'crear_aviso_docente_local', 'preparar_mensaje_director', 'navegar'],
    badge: null,
    trial: null,
  },
  2: {
    id: 2,
    name: 'Profesional',
    shortName: 'PRO',
    price: '$399 MXN/mes',
    monthlyPrice: 399,
    color: '#4285F4',
    tagline: 'ProfeIA hace acciones por ti',
    description: 'Agente ejecutor con herramientas automáticas. OCR, RAG completo, reportes automáticos y app docente completa.',
    features: [
      'Todo lo del plan Gratis',
      'Agente ejecutor automático',
      'Herramientas automáticas',
      'RAG completo',
      'OCR listas alumnos (Gemini Vision)',
      'Cámara/video para captura documental',
      'Ingestión automática de documentos',
      'Persistencia pedagógica',
      'Reportes automáticos',
      'Escucha asistida',
      'Logging inteligente',
      'App docente completa',
      'Tareas a padres/alumnos',
      'Modelo tuned docente (futuro)',
    ],
    agentCapabilities: ['crear_planeacion', 'guardar_bitacora', 'crear_evaluacion', 'crear_tarea_local', 'marcar_aviso_leido', 'tomar_asistencia_rapida', 'crear_actividad', 'preparar_reporte_dia', 'actualizar_planeacion_estado', 'crear_aviso_docente_local', 'preparar_mensaje_director', 'navegar'],
    badge: 'PRO',
    trial: {
      durationDays: 30,
      description: 'Todos los docentes empiezan con 1 mes gratis de Profesional',
    },
  },
  3: {
    id: 3,
    name: 'EVA Assistant Teacher',
    shortName: 'EVA',
    price: '$799 MXN/mes',
    monthlyPrice: 799,
    color: '#A142F4',
    tagline: 'EVA se convierte en segundo asistente docente',
    description: 'Voz Gemini, orbe animado, transcripción live, EVA Classroom y safety signals. El superpoder docente completo.',
    features: [
      'Todo lo del plan Profesional',
      'Mayor capacidad de agente',
      'Gemini Voice (voz)',
      'Orbe animado',
      'Transcripción en vivo',
      'EVA Assistant Teacher',
      'Second teacher assistant mode',
      'Mini-stories pedagógicas',
      'Toma de notas de clase',
      'Inferencia sobre la clase',
      'Participación en tiempo real',
      'Sugerencias live',
      'Apertura contextual de links',
      'EVA desktop personal',
      'EVA classroom node',
      'Señales HGI/EVA Classroom',
      'Safety escalation para padres',
    ],
    agentCapabilities: 'all',
    badge: 'EVA',
    trial: {
      durationDays: 30,
      description: 'Usuarios Tier 2 pueden probar Tier 3 por 1 mes al precio de Tier 2',
      requiresPaidTier: 2,
    },
    comingSoon: true, // Until HGI-MX integration is live
  },
}

// ============================================
// FEATURE GROUPS (Logical Capabilities)
// ============================================

export const manualFeatures = [
  'dashboard',
  'asistencia_manual',
  'bitacora_manual',
  'planeacion_manual',
  'evaluacion_manual',
  'documentos_basicos',
]

export const chatSuggestionFeatures = [
  'chat_sugerencia',
  'copiar_pegar_respuestas',
  'onboarding_docente',
]

export const agentExecutionFeatures = [
  'crear_planeacion',
  'guardar_bitacora',
  'crear_evaluacion',
  'tomar_asistencia_rapida',
  'crear_actividad',
  'actualizar_planeacion_estado',
  'ejecutor_automatico',
]

export const ragLimitedFeatures = [
  'rag_basico',
  'chat_documentos_limitado',
]

export const ragFullFeatures = [
  'rag_completo',
  'embeddings',
  'chunks_ilimitados',
  'chat_documentos_completo',
  'persistencia_pedagogica',
]

export const ocrFeatures = [
  'ocr_gemini_vision',
  'ocr_listas_alumnos',
  'captura_documental_camara',
  'ingestion_automatica_documentos',
]

export const voiceFeatures = [
  'gemini_voice',
  'transcripcion_live',
  'voz_asistente',
]

export const evaFeatures = [
  'eva_assistant_teacher',
  'second_teacher_mode',
  'orbe_animado',
  'mini_stories',
  'toma_notas_clase',
  'inferencia_clase',
  'sugerencias_live',
  'links_contextuales',
  'eva_desktop_personal',
  'eva_classroom_node',
]

export const parentSafetyFeatures = [
  'hgi_classroom_signals',
  'safety_escalation_padres',
  'alertas_seguridad',
  'acceso_temporal_eventos',
]

// ============================================
// PILOT / DEV OVERRIDE
// ============================================

/**
 * PILOT_TRIAL_ACCESS: Flag explícito para modo piloto/demo
 * NO es el modelo productivo. Solo permite acceso completo para pruebas.
 * En producción real, esto debe ser false y respetar los tiers reales.
 */
export const PILOT_TRIAL_ACCESS = true

const PILOT_UNLOCKED_CAPABILITIES = [
  'crear_planeacion',
  'guardar_bitacora',
  'crear_evaluacion',
  'tomar_asistencia_rapida',
  'crear_actividad',
  'preparar_reporte_dia',
  'actualizar_planeacion_estado',
]

// ============================================
// STRIPE CONFIGURATION (Future Implementation)
// ============================================

export const STRIPE_CONFIG = {
  enabled: false, // Stripe no está activo todavía
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

// ============================================
// TIER HELPER FUNCTIONS
// ============================================

/**
 * Get user's effective tier from profile
 * Falls back to Tier 1 (Gratis) if no tier specified
 */
export const getCurrentTier = (userProfile) => {
  const profileTier = Number(userProfile?.tier)
  if (Number.isFinite(profileTier) && TIERS[profileTier]) return profileTier
  return 1
}

/**
 * Get user's effective tier with trial consideration
 * During trial period, users may have access to higher tier features
 */
export const getUserEffectiveTier = (userProfile) => {
  const baseTier = getCurrentTier(userProfile)

  // If user has an active trial of a higher tier, return that tier
  if (isTrialActive(userProfile)) {
    const trialTier = userProfile?.trialTier
    if (trialTier && TIERS[trialTier] && trialTier > baseTier) {
      return trialTier
    }
  }

  return baseTier
}

/**
 * Check if user has an active trial
 */
export const isTrialActive = (userProfile) => {
  if (!userProfile?.trialEndsAt) return false

  const trialEnd = new Date(userProfile.trialEndsAt)
  const now = new Date()

  return trialEnd > now
}

/**
 * Get detailed trial state for UI display
 */
export const getTrialState = (userProfile) => {
  const trialTier = userProfile?.trialTier
  const trialEndsAt = userProfile?.trialEndsAt

  if (!trialTier || !trialEndsAt) {
    return {
      hasTrial: false,
      tier: null,
      daysRemaining: 0,
      isExpired: true,
    }
  }

  const trialEnd = new Date(trialEndsAt)
  const now = new Date()
  const isExpired = trialEnd <= now
  const daysRemaining = isExpired ? 0 : Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))

  return {
    hasTrial: !isExpired,
    tier: trialTier,
    daysRemaining,
    isExpired,
    trialEndsAt,
  }
}

// ============================================
// FEATURE AVAILABILITY CHECKERS
// ============================================

/**
 * Check if a specific agent tool/feature is available for the tier
 * Respects PILOT_TRIAL_ACCESS for demo mode
 */
export const isFeatureAvailable = (featureId, tier) => {
  // PILOT OVERRIDE: Allow unlocked capabilities during pilot/demo
  if (PILOT_TRIAL_ACCESS && PILOT_UNLOCKED_CAPABILITIES.includes(featureId)) {
    return true
  }

  const tierConfig = TIERS[tier]
  if (!tierConfig) return false
  if (tierConfig.agentCapabilities === 'all') return true
  return tierConfig.agentCapabilities.includes(featureId)
}

/**
 * Check if user can execute agent tools (Tier 2+)
 */
export const canExecuteAgentTools = (userProfile) => {
  const effectiveTier = getUserEffectiveTier(userProfile)

  // PILOT OVERRIDE
  if (PILOT_TRIAL_ACCESS) return true

  return effectiveTier >= 2
}

/**
 * Check if user can use voice features (Tier 3)
 */
export const canUseVoice = (userProfile) => {
  const effectiveTier = getUserEffectiveTier(userProfile)

  // PILOT OVERRIDE: Allow voice testing during pilot
  if (PILOT_TRIAL_ACCESS) return true

  return effectiveTier >= 3
}

/**
 * Check if user can use EVA features (Tier 3)
 */
export const canUseEVA = (userProfile) => {
  const effectiveTier = getUserEffectiveTier(userProfile)

  // PILOT OVERRIDE: Allow EVA testing during pilot (if HGI configured)
  if (PILOT_TRIAL_ACCESS) return true

  return effectiveTier >= 3
}

/**
 * Check if user can use OCR features (Tier 2+)
 */
export const canUseOCR = (userProfile) => {
  const effectiveTier = getUserEffectiveTier(userProfile)

  // PILOT OVERRIDE
  if (PILOT_TRIAL_ACCESS) return true

  return effectiveTier >= 2
}

/**
 * Check if user has full RAG access (Tier 2+)
 */
export const canUseFullRAG = (userProfile) => {
  const effectiveTier = getUserEffectiveTier(userProfile)

  // PILOT OVERRIDE
  if (PILOT_TRIAL_ACCESS) return true

  return effectiveTier >= 2
}

/**
 * Check if user has parent safety features (Tier 3)
 */
export const canUseParentSafety = (userProfile) => {
  const effectiveTier = getUserEffectiveTier(userProfile)

  // PILOT OVERRIDE
  if (PILOT_TRIAL_ACCESS) return true

  return effectiveTier >= 3
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Get CTA button text for tier card
 */
export const getTierCTAText = (tierId, isCurrent, hasTrial) => {
  if (isCurrent) return 'Plan actual'

  if (tierId === 1) return 'Plan actual'
  if (tierId === 2) return hasTrial ? 'Prueba activa' : 'Iniciar prueba gratis'
  if (tierId === 3) return hasTrial ? 'Prueba EVA activa' : 'Probar EVA por 1 mes'

  return 'Seleccionar'
}

/**
 * Check if Stripe payments are enabled
 */
export const arePaymentsEnabled = () => {
  return STRIPE_CONFIG.enabled === true
}

/**
 * Get trial explanation text for UI
 */
export const getTrialExplanation = (tierId) => {
  const tier = TIERS[tierId]
  if (!tier?.trial) return null

  if (tierId === 2) {
    return 'Todos los docentes empiezan con 1 mes gratis. Después del mes, puedes pagar $399/mes o volver al plan Gratis.'
  }

  if (tierId === 3) {
    return 'Si tienes el plan Profesional pagado, puedes probar EVA por 1 mes al mismo precio ($399/mes). Después sube a $799/mes.'
  }

  return tier.trial.description
}

