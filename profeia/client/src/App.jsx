import { useState, useEffect, useCallback } from 'react'
import Calendar from './components/Calendar'
import DayPanel from './components/DayPanel'
import SuggestionsPanel from './components/SuggestionsPanel'
import GeoShapes from './components/GeoShapes'
import { api } from './api'
import {
  ChevronLeft, ChevronRight, Bell, User,
  Calendar as CalendarIcon, BookOpen, FileText, Users, Sparkle
} from 'lucide-react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function App() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [docente, setDocente] = useState(null)
  const [showDayPanel, setShowDayPanel] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [stats, setStats] = useState({ planeaciones: 0, bitacora: 0, eventos: 0, sugerenciasPendientes: 0 })
  const [showOnboarding, setShowOnboarding] = useState(false)

  const mesActual = currentDate.getMonth()
  const anioActual = currentDate.getFullYear()

  useEffect(() => {
    const init = async () => {
      try {
        const docentes = await api.getDocentes()
        if (docentes.length === 0) {
          setShowOnboarding(true)
        } else {
          const d = docentes[0]
          setDocente(d)
          loadSuggestions(d.id)
          loadStats(d.id)
        }
      } catch (e) {
        console.error('Init error:', e)
      }
    }
    init()
  }, [])

  const loadSuggestions = useCallback(async (docenteId) => {
    try {
      const recs = await api.getRecomendaciones(docenteId)
      setSuggestions(recs)
    } catch (e) {
      console.error('Load suggestions error:', e)
    }
  }, [])

  const loadStats = useCallback(async (docenteId) => {
    try {
      const s = await api.getStats(docenteId)
      setStats(s)
    } catch (e) {
      console.error('Load stats error:', e)
    }
  }, [])

  const handlePrevMonth = () => setCurrentDate(new Date(anioActual, mesActual - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(anioActual, mesActual + 1, 1))
  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }
  const handleDayClick = (date) => {
    setSelectedDate(date)
    setShowDayPanel(true)
  }
  const handleCreateDocente = async (data) => {
    try {
      const d = await api.createDocente(data)
      setDocente(d)
      setShowOnboarding(false)
      loadSuggestions(d.id)
      loadStats(d.id)
    } catch (e) {
      console.error('Create docente error:', e)
    }
  }

  return (
    <div className="relative pb-20">
      <div className="bg-mesh" />
      <GeoShapes />

      {showOnboarding && <OnboardingModal onCreate={handleCreateDocente} />}

      {/* ===== Navigation Bar ===== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#e8eaed]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between">
            {/* Logo + Title */}
            <div className="flex items-center gap-3">
              {/* Custom Logo: P + Calendar grid + Sparkle */}
              <div className="logo-container">
                <div className="logo-bg">
                  <span className="logo-p">P</span>
                </div>
                <Sparkle className="logo-sparkle" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="hero-title text-2xl">
                  {'Profeia'.split('').map((letter, i) => (
                    <span
                      key={i}
                      className="hero-letter"
                      style={{ animationDelay: `${i * 0.08}s` }}
                    >
                      {letter}
                    </span>
                  ))}
                </h1>
                <p className="text-[10px] text-[#5f6368] tracking-wider -mt-0.5">ASISTENTE INTELIGENTE · TELESECUNDARIA</p>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-full hover:bg-[#f1f3f4] transition-colors text-[#5f6368]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center min-w-[180px]">
                <h2 className="text-xl font-bold text-[#202124]">
                  {MESES[mesActual]} <span className="text-[#5f6368] font-normal">{anioActual}</span>
                </h2>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-full hover:bg-[#f1f3f4] transition-colors text-[#5f6368]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleToday}
                className="ml-2 px-4 py-1.5 rounded-full bg-[#4285F4]/10 text-[#4285F4] text-sm font-medium hover:bg-[#4285F4]/15 transition-colors"
              >
                Hoy
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Stats Badges */}
              <div className="hidden lg:flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-[#5f6368]">
                  <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                  <span className="font-medium">{stats.planeaciones}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#5f6368]">
                  <span className="w-2 h-2 rounded-full bg-[#FBBC04]" />
                  <span className="font-medium">{stats.bitacora}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#5f6368]">
                  <span className="w-2 h-2 rounded-full bg-[#A142F4]" />
                  <span className="font-medium">{stats.eventos}</span>
                </span>
              </div>

              {/* Bell */}
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="relative p-2 rounded-full hover:bg-[#f1f3f4] transition-colors text-[#5f6368]"
              >
                <Bell className="w-5 h-5" />
                {suggestions.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#EA4335] rounded-full text-[10px] text-white flex items-center justify-center font-bold px-1">
                    {suggestions.length}
                  </span>
                )}
              </button>

              {/* User Avatar */}
              {docente && (
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-[#e8eaed]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4285F4] to-[#34A853] flex items-center justify-center text-white text-sm font-bold">
                    {docente.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-[#5f6368] hidden xl:block">{docente.nombre}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="max-w-[1920px] mx-auto p-4 sm:p-6">
        <div className="flex gap-6">
          <div className="flex-1">
            <Calendar
              currentDate={currentDate}
              selectedDate={selectedDate}
              docenteId={docente?.id}
              onDayClick={handleDayClick}
            />
          </div>
          {showSuggestions && (
            <div className="w-80 animate-slide-right">
              <SuggestionsPanel
                suggestions={suggestions}
                docenteId={docente?.id}
                onRefresh={() => loadSuggestions(docente?.id)}
              />
            </div>
          )}
        </div>
      </main>

      {/* Day Panel */}
      {showDayPanel && docente && (
        <DayPanel
          date={selectedDate}
          docenteId={docente.id}
          onClose={() => setShowDayPanel(false)}
          onRefresh={() => {
            loadSuggestions(docente.id)
            loadStats(docente.id)
          }}
        />
      )}
    </div>
  )
}

// ===== Onboarding Modal =====
function OnboardingModal({ onCreate }) {
  const [nombre, setNombre] = useState('')
  const [escuela, setEscuela] = useState('')
  const [clave, setClave] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (nombre && escuela && clave) {
      onCreate({ nombre, escuela, clave_escuela: clave })
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
        {/* Animated Logo */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4285F4] via-[#A142F4] to-[#FF6B9D] mx-auto flex items-center justify-center mb-4 animate-float shadow-lg relative">
            <span className="text-3xl font-extrabold text-white">P</span>
            <Sparkle className="absolute -top-1 -right-1 w-6 h-6 text-[#FBBC04] animate-spin-slow" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-extrabold text-[#202124] mb-1">
            {'Bienvenido a Profeia'.split('').map((c, i) => (
              <span key={i} className="inline-block" style={{
                animation: `letterEntrance 0.5s ease-out ${i * 0.03}s both`
              }}>{c}</span>
            ))}
          </h2>
          <p className="text-[#5f6368] text-sm">Tu asistente inteligente para la telesecundaria</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="input-google"
              placeholder="Prof. Juan Pérez"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Escuela</label>
            <input
              type="text"
              value={escuela}
              onChange={(e) => setEscuela(e.target.value)}
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
              onChange={(e) => setClave(e.target.value)}
              className="input-google"
              placeholder="01DTV0001A"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full py-3 text-base">
            Iniciar y cargar planeaciones
          </button>
        </form>

        <p className="text-xs text-[#9aa0a6] text-center mt-4">
          Se cargarán automáticamente las planeaciones, eventos y contenido base.
        </p>
      </div>
    </div>
  )
}

export default App
