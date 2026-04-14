import { useState, useEffect, useCallback } from 'react'
import Calendar from './components/Calendar'
import DayPanel from './components/DayPanel'
import SuggestionsPanel from './components/SuggestionsPanel'
import Particles from './components/Particles'
import { api } from './api'
import { 
  ChevronLeft, ChevronRight, Bell, User, Settings,
  Calendar as CalendarIcon, BookOpen, FileText, Users
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

  // Initialize - check if docente exists
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

  const handlePrevMonth = () => {
    setCurrentDate(new Date(anioActual, mesActual - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(anioActual, mesActual + 1, 1))
  }

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
      <div className="bg-animated" />
      <Particles />
      
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onCreate={handleCreateDocente} />
      )}

      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue via-neon-purple to-neon-pink flex items-center justify-center animate-pulse-glow">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient">Profeia</h1>
                <p className="text-[10px] text-gray-400 tracking-wider">ASISTENTE INTELIGENTE • TELESECUNDARIA</p>
              </div>
            </div>

            {/* Center - Month Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg glass-light hover:bg-white/10 transition-all hover:scale-105"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center min-w-[200px]">
                <h2 className="text-2xl font-bold text-gradient">
                  {MESES[mesActual]} {anioActual}
                </h2>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg glass-light hover:bg-white/10 transition-all hover:scale-105"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 rounded-lg bg-neon-blue/20 text-neon-blue border border-neon-blue/30 text-sm font-medium hover:bg-neon-blue/30 transition-all"
              >
                Hoy
              </button>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              {/* Stats */}
              <div className="hidden lg:flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-neon-blue" />
                  {stats.planeaciones}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4 text-amber-400" />
                  {stats.bitacora}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4 text-purple-400" />
                  {stats.eventos}
                </span>
              </div>

              {/* Suggestions Bell */}
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="relative p-2 rounded-lg glass-light hover:bg-white/10 transition-all"
              >
                <Bell className="w-5 h-5" />
                {suggestions.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center animate-bounce">
                    {suggestions.length}
                  </span>
                )}
              </button>

              {/* User */}
              {docente && (
                <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-900" />
                  </div>
                  <span className="text-sm text-gray-300 hidden xl:block">{docente.nombre}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto p-4 sm:p-6">
        <div className="flex gap-6">
          {/* Calendar - Main Area */}
          <div className="flex-1">
            <Calendar
              currentDate={currentDate}
              selectedDate={selectedDate}
              docenteId={docente?.id}
              onDayClick={handleDayClick}
            />
          </div>

          {/* Suggestions Sidebar */}
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

      {/* Day Detail Panel */}
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

// Onboarding Component
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-in glow-purple">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue via-neon-purple to-neon-pink mx-auto flex items-center justify-center mb-4 animate-float">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gradient mb-2">Bienvenido a Profeia</h2>
          <p className="text-gray-400 text-sm">Tu asistente inteligente para la telesecundaria</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-light bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-purple/50"
              placeholder="Prof. Juan Pérez"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Escuela</label>
            <input
              type="text"
              value={escuela}
              onChange={(e) => setEscuela(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-light bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-purple/50"
              placeholder="Telesecundaria Benito Juárez"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Clave de centro de trabajo</label>
            <input
              type="text"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-light bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-purple/50"
              placeholder="01DTV0001A"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink font-semibold text-white hover:opacity-90 transition-all animate-pulse-glow"
          >
            Iniciar y cargar planeaciones
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Al iniciar, se cargarán automáticamente las planeaciones, eventos y contenido base para tu telesecundaria.
        </p>
      </div>
    </div>
  )
}

export default App
