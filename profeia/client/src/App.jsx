import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import Calendar from './components/Calendar'
import DayPanel from './components/DayPanel'
import Sidebar from './components/Sidebar'
import AvatarModal from './components/AvatarModal'
import NotificationDropdown from './components/NotificationDropdown'
import AdminPanel from './pages/AdminPanel'
import GeoShapes from './components/GeoShapes'
import { api } from './api'
import { ChevronLeft, ChevronRight, Sparkle } from 'lucide-react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem('profeia_prefs')) } catch { return null }
}

function MainLayout() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [docente, setDocente] = useState(null)
  const [prefs, setPrefs] = useState(loadPrefs)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showDayPanel, setShowDayPanel] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [stats, setStats] = useState({ planeaciones: 0, bitacora: 0, eventos: 0, sugerenciasPendientes: 0 })

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
          if (!prefs?.nombre) {
            const p = { genero: prefs?.genero || 'maestro', nombre: d.nombre }
            localStorage.setItem('profeia_prefs', JSON.stringify(p))
            setPrefs(p)
          }
          loadSuggestions(d.id)
          loadStats(d.id)
        }
      } catch (e) {
        console.error('Init error:', e)
      }
    }
    init()
  }, [])

  const loadSuggestions = useCallback(async (id) => {
    try { setSuggestions(await api.getRecomendaciones(id)) } catch {}
  }, [])

  const loadStats = useCallback(async (id) => {
    try { setStats(await api.getStats(id)) } catch {}
  }, [])

  const handleCreateDocente = async ({ nombre, escuela, clave_escuela, genero }) => {
    try {
      const d = await api.createDocente({ nombre, escuela, clave_escuela })
      setDocente(d)
      setShowOnboarding(false)
      const p = { genero, nombre }
      setPrefs(p)
      localStorage.setItem('profeia_prefs', JSON.stringify(p))
      loadSuggestions(d.id)
      loadStats(d.id)
    } catch (e) {
      console.error('Create docente error:', e)
    }
  }

  const handleAcceptSuggestion = async (id) => {
    try { await api.aceptarSugerencia(docente?.id, id); loadSuggestions(docente?.id) } catch {}
  }

  const handleDismissSuggestion = async (id) => {
    try { await api.rechazarSugerencia(docente?.id, id); loadSuggestions(docente?.id) } catch {}
  }

  return (
    <div className="app-root">
      <div className="bg-mesh" />
      <GeoShapes />

      {showOnboarding && <AvatarModal onCreate={handleCreateDocente} />}

      <Sidebar prefs={prefs} docenteId={docente?.id} />

      <div className="main-area">
        <header className="main-header">
          <div className="flex items-center gap-3">
            <div className="logo-container">
              <div className="logo-bg">
                <span className="logo-p">P</span>
              </div>
              <Sparkle className="logo-sparkle" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="hero-title text-xl">
                {'Profeia'.split('').map((letter, i) => (
                  <span key={i} className="hero-letter" style={{ animationDelay: `${i * 0.08}s` }}>
                    {letter}
                  </span>
                ))}
              </h1>
              <p className="text-[9px] text-[#5f6368] tracking-wider -mt-0.5 hidden sm:block">
                ASISTENTE INTELIGENTE · TELESECUNDARIA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date(anioActual, mesActual - 1, 1))}
              className="p-1.5 rounded-full hover:bg-[#f1f3f4] transition-colors text-[#5f6368]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[140px]">
              <h2 className="text-base font-bold text-[#202124]">
                {MESES[mesActual]} <span className="text-[#5f6368] font-normal text-sm">{anioActual}</span>
              </h2>
            </div>
            <button
              onClick={() => setCurrentDate(new Date(anioActual, mesActual + 1, 1))}
              className="p-1.5 rounded-full hover:bg-[#f1f3f4] transition-colors text-[#5f6368]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => { const t = new Date(); setCurrentDate(t); setSelectedDate(t) }}
              className="ml-1 px-3 py-1 rounded-full bg-[#4285F4]/10 text-[#4285F4] text-xs font-medium hover:bg-[#4285F4]/15 transition-colors"
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 text-xs text-[#5f6368]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                <span className="font-medium">{stats.planeaciones}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FBBC04]" />
                <span className="font-medium">{stats.bitacora}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#A142F4]" />
                <span className="font-medium">{stats.eventos}</span>
              </span>
            </div>
            <NotificationDropdown
              notifications={suggestions}
              onAccept={handleAcceptSuggestion}
              onDismiss={handleDismissSuggestion}
            />
          </div>
        </header>

        <main className="main-content">
          <Calendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            docenteId={docente?.id}
            onDayClick={(date) => { setSelectedDate(date); setShowDayPanel(true) }}
          />
        </main>
      </div>

      {showDayPanel && (
        <DayPanel
          date={selectedDate}
          docenteId={docente?.id ?? null}
          onClose={() => setShowDayPanel(false)}
          onRefresh={() => { if (docente) { loadSuggestions(docente.id); loadStats(docente.id) } }}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  )
}

export default App
