import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Star, X } from 'lucide-react'
import { TIERS } from '../lib/tiers'

export function usePaywall() {
  const [paywallFeature, setPaywallFeature] = useState(null)
  const showPaywall = (feature, requiredTier) => setPaywallFeature({ feature, requiredTier })
  const hidePaywall = () => setPaywallFeature(null)
  return { paywallFeature, showPaywall, hidePaywall }
}

function planIncludes(requiredTier) {
  const tier = TIERS[requiredTier]
  return tier?.features || []
}

// stripe_price_id will be wired from STRIPE_CONFIG in a future payments rollout.
export default function PaywallModal({ feature, requiredTier, onClose }) {
  const navigate = useNavigate()
  const tier = TIERS[requiredTier]
  const features = planIncludes(requiredTier)

  if (!tier) return null

  return (
    <div className="fixed inset-0 z-[9800] bg-black/55 backdrop-blur-[1px] flex items-center justify-center px-4">
      <div className="w-full max-w-[460px] rounded-3xl border border-[#e6e9f7] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex w-12 h-12 rounded-2xl items-center justify-center text-white" style={{ background: 'linear-gradient(135deg,#4285F4,#A142F4)' }}>
            {requiredTier >= 3 ? <Star className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#f3f4f6] inline-flex items-center justify-center text-[#6b7280]" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <h2 className="mt-4 text-xl font-bold text-[#202124]">Función disponible en plan {tier.name}</h2>
        <p className="mt-2 text-sm text-[#5f6368]">
          {feature ? `“${feature}”` : 'Esta funcionalidad'} está incluida en {tier.name}. Desbloquea herramientas avanzadas para acelerar tu flujo docente.
        </p>

        <div className="mt-4 rounded-2xl border border-[#e8edf8] bg-[#f8fbff] p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-[#7b8798] font-semibold">Incluye</p>
          <ul className="mt-2 space-y-1.5 text-sm text-[#384152]">
            {features.slice(0, 4).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <p className="mt-3 text-base font-bold" style={{ color: tier.color }}>{tier.price}</p>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => {
              onClose()
              navigate('/planes')
            }}
            className="btn-primary flex-1 text-sm py-2.5"
          >
            Ver planes
          </button>
          <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">
            Continuar con plan Básico
          </button>
        </div>

        <p className="mt-3 text-xs text-[#9aa0a6] text-center">Los pagos se habilitarán próximamente.</p>
      </div>
    </div>
  )
}
