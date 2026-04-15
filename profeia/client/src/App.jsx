import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import Calendar from './components/Calendar'
import DayPanel from './components/DayPanel'
import Sidebar from './components/Sidebar'
import AvatarModal from './components/AvatarModal'
import NotificationDropdown from './components/NotificationDropdown'
import NewsTicker from './components/NewsTicker'
import AlertsPanel from './components/AlertsPanel'
import AdminPanel from './pages/AdminPanel'
import AlumnosPage from './pages/AlumnosPage'
import GeoShapes from './components/GeoShapes'
import { api } from './api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const LOGO_COLORS = ['#EA4335', '#FBBC04', '#34A853', '#4285F4', '#EA4335', '#FBBC04', '#34A853']

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
            <div className="logo-icon-wrap">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
                <defs>
                  <linearGradient id="logoG" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4285F4"/>
                    <stop offset="35%" stopColor="#EA4335"/>
                    <stop offset="65%" stopColor="#34A853"/>
                    <stop offset="100%" stopColor="#FBBC04"/>
                  </linearGradient>
                  <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.2)"/>
                  </filter>
                </defs>
                <circle cx="20" cy="20" r="19" fill="url(#logoG)" filter="url(#logoShadow)"/>
                <ellipse cx="20" cy="13" rx="13" ry="7" fill="rgba(255,255,255,0.18)"/>
                {/* Graduation cap */}
                <polygon points="20,10 29,15 20,20 11,15" fill="white" opacity="0.95"/>
                <path d="M15 17v5l5 2.5 5-2.5v-5" fill="white" opacity="0.75"/>
                <line x1="29" y1="15" x2="29" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
                {/* Sparkle */}
                <circle cx="30" cy="11" r="2.5" fill="#FBBC04"/>
                <path d="M30 8v6M27 11h6" stroke="#FBBC04" strokeWidth="1.2" opacity="0.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 className="profeia-wordmark">
                {['P','r','o','f','e','i','a'].map((l, i) => (
                  <span key={i} style={{ color: LOGO_COLORS[i] }}>{l}</span>
                ))}
              </h1>
              <p className="text-[9px] text-[#5f6368] tracking-wider -mt-0.5 hidden sm:block">
                <span style={{ color: '#EA4335' }}>·</span> ASISTENTE INTELIGENTE <span style={{ color: '#4285F4' }}>·</span> TELESECUNDARIA
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

        {/* ===== News Ticker ===== */}
        <NewsTicker />

        <main className="main-content">
          <div className="flex gap-4 items-start">
            {/* Calendar — 65% */}
            <div style={{ flex: '0 0 65%', minWidth: 0 }}>
              <Calendar
                currentDate={currentDate}
                selectedDate={selectedDate}
                docenteId={docente?.id}
                onDayClick={(date) => { setSelectedDate(date); setShowDayPanel(true) }}
              />
            </div>
            {/* Alerts Panel — 35% */}
            <div style={{ flex: '0 0 calc(35% - 1rem)', minWidth: 0 }} className="min-h-[600px]">
              <AlertsPanel />
            </div>
          </div>
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
      <Route path="/alumnos" element={<AlumnosPage />} />
    </Routes>
  )
}

export default App
