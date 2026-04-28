import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const STORAGE_KEYS = {
  compact: 'profeia_compact_v1',
  weather: 'profeia_weather_v1',
  urgent: 'profeia_urgent_suggestions_v1',
  allPrefs: 'profeia_preferences_v1',
}

function readBool(key, fallback) {
  const value = localStorage.getItem(key)
  if (value === null) return fallback
  return value === '1'
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[#eef1f5] last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-[#202124]">{label}</p>
        {description && <p className="text-xs text-[#6b7280] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[#4285F4]' : 'bg-[#d4d9e2]'}`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  )
}

export default function ConfiguracionPage() {
  const navigate = useNavigate()
  const [compactMode, setCompactMode] = useState(false)
  const [showWeather, setShowWeather] = useState(true)
  const [urgentSuggestions, setUrgentSuggestions] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setCompactMode(readBool(STORAGE_KEYS.compact, false))
    setShowWeather(readBool(STORAGE_KEYS.weather, true))
    setUrgentSuggestions(readBool(STORAGE_KEYS.urgent, true))
  }, [])

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEYS.compact, compactMode ? '1' : '0')
    localStorage.setItem(STORAGE_KEYS.weather, showWeather ? '1' : '0')
    localStorage.setItem(STORAGE_KEYS.urgent, urgentSuggestions ? '1' : '0')
    localStorage.setItem(
      STORAGE_KEYS.allPrefs,
      JSON.stringify({ compactMode, showWeather, urgentSuggestions, language: 'es-MX' })
    )

    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#202124]">Configuración</h1>
          <p className="text-xs text-[#9aa0a6]">Personaliza tu experiencia ProfeIA</p>
        </div>
      </header>

      <div className="alumnos-body space-y-4">
        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#202124] mb-2">Preferencias visuales</h2>
          <ToggleRow
            label="Modo compacto"
            description="Reduce espacios para ver más contenido en pantalla"
            checked={compactMode}
            onChange={setCompactMode}
          />
          <ToggleRow
            label="Mostrar clima en sidebar"
            description="Activa el widget de clima en la barra lateral"
            checked={showWeather}
            onChange={setShowWeather}
          />
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#202124] mb-2">Idioma</h2>
          <p className="text-sm text-[#5f6368]">Español (México)</p>
          <p className="text-xs text-[#9aa0a6] mt-1">Por ahora el idioma se mantiene fijo para toda la plataforma.</p>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#202124] mb-2">Notificaciones</h2>
          <ToggleRow
            label="Sugerencias urgentes"
            description="Mostrar alertas prioritarias de ProfeIA"
            checked={urgentSuggestions}
            onChange={setUrgentSuggestions}
          />
        </section>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn-primary text-sm py-2 px-4">
            Guardar preferencias
          </button>
          {saved && <span className="text-xs font-semibold text-[#1f7a44]">Preferencias guardadas.</span>}
        </div>
      </div>
    </div>
  )
}
