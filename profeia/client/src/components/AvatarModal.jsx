import { useState } from 'react'
import { Sparkle } from 'lucide-react'
import TeacherAvatar from './TeacherAvatar'

/**
 * AvatarModal — two-step onboarding modal
 * Props:
 *   onCreate: ({ nombre, escuela, clave_escuela, genero }) => void
 */
function AvatarModal({ onCreate }) {
  const [step, setStep] = useState(1)
  const [genero, setGenero] = useState(null)
  const [nombre, setNombre] = useState('')
  const [escuela, setEscuela] = useState('')
  const [clave, setClave] = useState('')

  const handleChoose = (g) => {
    setGenero(g)
    setStep(2)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre || !escuela || !clave) return
    const prefs = { genero, nombre }
    localStorage.setItem('profeia_prefs', JSON.stringify(prefs))
    onCreate({ nombre, escuela, clave_escuela: clave, genero })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-scale-in overflow-hidden">

        {step === 1 && (
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4285F4] via-[#A142F4] to-[#FF6B9D] mx-auto flex items-center justify-center mb-3 shadow-lg relative animate-float">
                <span className="text-2xl font-extrabold text-white">P</span>
                <Sparkle className="absolute -top-1 -right-1 w-5 h-5 text-[#FBBC04]" strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-extrabold text-[#202124]">Bienvenido a Profeia</h2>
              <p className="text-sm text-[#5f6368] mt-1">¿Cómo te identificas?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { g: 'maestra', label: 'Maestra', color: '#00BCD4', bg: 'rgba(0,188,212,0.06)' },
                { g: 'maestro', label: 'Maestro', color: '#3F51B5', bg: 'rgba(63,81,181,0.06)' }
              ].map(({ g, label, color, bg }) => (
                <button
                  key={g}
                  onClick={() => handleChoose(g)}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-[#e8eaed] hover:border-[#4285F4] transition-all duration-200 hover:shadow-lg group"
                  style={{ background: bg }}
                >
                  <div className="group-hover:scale-110 transition-transform duration-200">
                    <TeacherAvatar genero={g} size={90} animated={false} />
                  </div>
                  <span className="text-base font-bold" style={{ color }}>{label}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-[#9aa0a6] text-center mt-4">
              Esto personaliza tu asistente y avatar en la app.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setStep(1)}
                className="text-[#5f6368] hover:text-[#202124] text-sm flex items-center gap-1"
              >
                ← Cambiar
              </button>
              <div className="flex items-center gap-3 ml-auto">
                <TeacherAvatar genero={genero} size={48} animated={false} />
                <div>
                  <p className="text-sm font-semibold text-[#202124] capitalize">{genero}</p>
                  <p className="text-xs text-[#9aa0a6]">Avatar seleccionado</p>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-[#202124] mb-1">Cuéntanos de ti</h2>
            <p className="text-sm text-[#5f6368] mb-5">Necesitamos algunos datos para personalizar tu espacio.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Nombre completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="input-google"
                  placeholder={genero === 'maestra' ? 'Prof. María González' : 'Prof. Juan Pérez'}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Escuela</label>
                <input
                  type="text"
                  value={escuela}
                  onChange={e => setEscuela(e.target.value)}
                  className="input-google"
                  placeholder="Telesecundaria Benito Juárez"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Clave de centro de trabajo</label>
                <input
                  type="text"
                  value={clave}
                  onChange={e => setClave(e.target.value)}
                  className="input-google"
                  placeholder="01DTV0001A"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full py-3 text-base mt-2">
                Comenzar →
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default AvatarModal
