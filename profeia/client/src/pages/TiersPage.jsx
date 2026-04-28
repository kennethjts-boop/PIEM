import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { TIERS, getCurrentTier } from '../lib/tiers'

const TIER_ORDER = [1, 2, 3]

export default function TiersPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  const currentTier = useMemo(() => getCurrentTier(userProfile), [userProfile])

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#A142F4] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Planes de ProfeIA</h1>
            <p className="text-xs text-[#9aa0a6]">Elige la evolución de tu asistente docente</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 rounded-full border border-[#e3e8f4] bg-white px-3 py-1.5 text-xs text-[#5f6368]">
          <Zap className="w-3.5 h-3.5 text-[#A142F4]" />
          Sin pagos habilitados aún
        </div>
      </header>

      <div className="alumnos-body space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {TIER_ORDER.map((tierId) => {
            const tier = TIERS[tierId]
            const isCurrent = currentTier === tierId
            const isComingSoon = Boolean(tier.comingSoon)

            return (
              <article
                key={tier.id}
                className="glass-card rounded-2xl p-5 flex flex-col"
                style={{
                  border: isCurrent ? `2px solid ${tier.color}` : '1px solid #e8eaed',
                  boxShadow: isCurrent ? `0 0 0 4px ${tier.color}1A` : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] font-semibold" style={{ color: tier.color }}>
                      Tier {tier.id}
                    </p>
                    <h2 className="text-xl font-bold text-[#202124] mt-1">{tier.name}</h2>
                    <p className="text-sm font-semibold mt-1" style={{ color: tier.color }}>{tier.price}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {tier.badge && (
                      <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white" style={{ backgroundColor: tier.color }}>
                        {tier.badge}
                      </span>
                    )}
                    {isComingSoon && (
                      <span className="inline-flex rounded-full border border-[#e4dbf8] bg-[#f7f2ff] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[#7e57c2]">
                        Próximamente
                      </span>
                    )}
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-[#3c4043]">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tier.color }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-4 border-t border-[#eef2f7]">
                  {isComingSoon ? (
                    <button
                      type="button"
                      className="w-full rounded-full border border-[#ddd6f7] bg-[#f7f3ff] px-4 py-2 text-sm font-semibold text-[#7e57c2] cursor-not-allowed"
                      disabled
                    >
                      Próximamente
                    </button>
                  ) : isCurrent ? (
                    <button
                      type="button"
                      className="w-full rounded-full px-4 py-2 text-sm font-semibold text-white"
                      style={{ backgroundColor: tier.color }}
                      disabled
                    >
                      Plan actual
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-full border border-[#d7deeb] bg-white px-4 py-2 text-sm font-semibold text-[#3c4043]"
                      disabled
                    >
                      Disponible en piloto
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <div className="glass-card rounded-2xl p-4 text-sm text-[#5f6368] border border-[#e8eaed]">
          Los pagos se habilitarán próximamente. Por ahora todos los docentes tienen acceso completo al piloto.
        </div>
      </div>
    </div>
  )
}
