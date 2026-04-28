import { useState } from 'react'

const STEPS = [
  '📅 Organiza tu día con el calendario',
  '✅ Toma asistencia en segundos',
  '📓 Registra tu bitácora pedagógica',
  '📋 Genera planeaciones con IA',
  '💡 Recibe sugerencias ProfeIA',
  '📢 Revisa avisos del director',
]

const ONBOARDING_DONE_KEY = 'profeia_onboarding_done_v1'

function OnboardingModal({ onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(ONBOARDING_DONE_KEY, '1')
    }
    onClose()
  }

  const handleStart = () => {
    localStorage.setItem(ONBOARDING_DONE_KEY, '1')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9500] bg-black/55 backdrop-blur-[1px] flex items-center justify-center px-4">
      <div className="w-full max-w-[480px] rounded-3xl border border-[#f2e6cc] bg-[#fffaf2] shadow-[0_18px_50px_rgba(30,41,59,0.22)] p-6 sm:p-7">
        <div className="text-center mb-5">
          <h2 className="text-2xl font-bold text-[#202124]">¡Bienvenido a ProfeIA, profe!</h2>
          <p className="text-sm text-[#6b7280] mt-1">Tu asistente inteligente para el aula</p>
        </div>

        <div className="rounded-2xl border border-[#f4ead6] bg-white/80 p-4 space-y-2.5">
          {STEPS.map((step) => (
            <div key={step} className="text-sm text-[#384152] leading-6 flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#f59e0b] flex-shrink-0" />
              <span>{step}</span>
            </div>
          ))}
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-xs text-[#5f6368] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="rounded border-[#d7dbe5]"
          />
          No volver a mostrar
        </label>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary flex-1 text-sm py-2.5"
          >
            Más tarde
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="btn-primary flex-1 text-sm py-2.5"
          >
            ¡Empezar ahora!
          </button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingModal
