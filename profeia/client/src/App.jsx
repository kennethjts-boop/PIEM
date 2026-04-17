import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import { Routes, Route } from 'react-router-dom'
import Calendar from './components/Calendar'
import DayPanel from './components/DayPanel'
import Sidebar from './components/Sidebar'
import AvatarModal from './components/AvatarModal'
import NotificationDropdown from './components/NotificationDropdown'
import NewsTicker from './components/NewsTicker'
import AlertsPanel from './components/AlertsPanel'
import DashboardTabs from './components/DashboardTabs'
import StatsCard from './components/StatsCard'
import AdminPanel from './pages/AdminPanel'
import AlumnosPage from './pages/AlumnosPage'
import GeoShapes from './components/GeoShapes'
import { api } from './api'
import { ChevronLeft, ChevronRight, User, Settings, CreditCard, LogOut, ChevronDown } from 'lucide-react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem('profeia_prefs')) } catch { return null }
}

/* ===== User Profile Dropdown ===== */
function UserProfileDropdown({ prefs, docente }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const nombre = prefs?.nombre?.split(' ')[0] || 'Docente'
  const initials = (prefs?.nombre || 'D').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const MENU_ITEMS = [
    { icon: User,       label: 'Ver perfil',    color: '#4285F4' },
    { icon: CreditCard, label: 'Suscripción',   color: '#34A853' },
    { icon: Settings,   label: 'Configuración', color: '#FBBC04' },
    { icon: LogOut,     label: 'Cerrar sesión', color: '#EA4335', danger: true },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer"
        style={{
          background: open ? 'rgba(66,133,244,0.08)' : 'transparent',
          border: '1px solid',
          borderColor: open ? 'rgba(66,133,244,0.2)' : 'transparent',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = 'rgba(66,133,244,0.15)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'transparent' }}
      >
        {/* Avatar circle */}
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, #4285F4, #A142F4)',
            color: 'white', fontSize: 11, fontWeight: 700,
          }}
        >
          {initials}
        </div>
        <span className="hidden sm:block text-sm font-medium" style={{ color: '#202124', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nombre}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform"
          style={{ color: '#5f6368', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          className="animate-slide-down"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 220, background: 'white',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 14, boxShadow: '0 8px 30px rgba(30,41,59,0.14), 0 2px 8px rgba(30,41,59,0.08)',
            overflow: 'hidden', zIndex: 300,
          }}
        >
          {/* Profile header */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f3f4' }}>
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 36, height: 36,
                  background: 'linear-gradient(135deg, #4285F4, #A142F4)',
                  color: 'white', fontSize: 13, fontWeight: 700,
                }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#202124' }}>
                  {prefs?.nombre || 'Docente'}
                </p>
                <p className="text-xs capitalize" style={{ color: '#5f6368' }}>
                  {prefs?.genero || 'maestro'} · ProfeIA
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            {MENU_ITEMS.map(({ icon: Icon, label, color, danger }) => (
              <button
                key={label}
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer"
                style={{ background: 'transparent', border: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(234,67,53,0.05)' : '#f8f9fa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
                <span className="text-sm" style={{ color: danger ? '#EA4335' : '#3c4043', fontWeight: 500 }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
            {/* Logo icon */}
            <div className="logo-icon-wrap flex-shrink-0">
              <svg viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" width="38" height="38">
                <defs>
                  <linearGradient id="lgBrand" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4285F4"/>
                    <stop offset="100%" stopColor="#A142F4"/>
                  </linearGradient>
                  <filter id="lgShadow" x="-15%" y="-15%" width="130%" height="130%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="rgba(66,133,244,0.3)"/>
                  </filter>
                </defs>
                <rect x="1" y="1" width="36" height="36" rx="10" fill="url(#lgBrand)" filter="url(#lgShadow)"/>
                <rect x="1" y="1" width="36" height="36" rx="10" fill="url(#lgBrand)" opacity="0"/>
                {/* Cap */}
                <polygon points="19,9 29,14 19,19 9,14" fill="white" opacity="0.95"/>
                <path d="M13 16v5.5l6 3 6-3V16" fill="white" opacity="0.78"/>
                <line x1="29" y1="14" x2="29" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
                {/* Sparkle */}
                <circle cx="29" cy="10" r="3" fill="#FBBC04"/>
                <path d="M29 7.5v5M26.5 10h5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.9"/>
              </svg>
            </div>

            {/* Wordmark — gradient + "ia" accent */}
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 0 }}>
                <span style={{
                  background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Profe</span>
                <span style={{
                  background: 'linear-gradient(135deg, #4285F4 0%, #A142F4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>ia</span>
              </h1>
              <p style={{ fontSize: 10, color: '#94A3B8', letterSpacing: '0.08em', marginTop: 1 }} className="hidden sm:block">
                ASISTENTE · TELESECUNDARIA
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

          <div className="flex items-center gap-2">
            {/* Stats pills */}
            <div className="hidden lg:flex items-center gap-1.5">
              {[
                { count: stats.planeaciones, color: '#4285F4', label: 'Plan.' },
                { count: stats.bitacora,    color: '#FBBC04', label: 'Bit.' },
                { count: stats.eventos,     color: '#A142F4', label: 'Ev.' },
              ].map(({ count, color, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  style={{ background: `${color}12`, color }}
                >
                  <span className="font-bold">{count}</span>
                  <span style={{ opacity: 0.75 }}>{label}</span>
                </span>
              ))}
            </div>

            <NotificationDropdown
              notifications={suggestions}
              onAccept={handleAcceptSuggestion}
              onDismiss={handleDismissSuggestion}
            />

            <UserProfileDropdown prefs={prefs} docente={docente} />
          </div>
        </header>

        {/* ===== News Ticker ===== */}
        <NewsTicker />

        <main className="main-content">
          {/* CSS Grid: minmax(0,…) ensures columns respect their boundary and never push overflow */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 75fr) minmax(0, 25fr)', gap: '1.25rem', alignItems: 'start' }}>
            {/* Calendar — 65% */}
            <div style={{ minWidth: 0 }}>
              <Calendar
                currentDate={currentDate}
                selectedDate={selectedDate}
                docenteId={docente?.id}
                onDayClick={(date) => {
                  // startTransition defers the heavy DayPanel mount so the click
                  // paint completes first — fixes the >200ms INP on calendar cells
                  startTransition(() => {
                    setSelectedDate(date)
                    setShowDayPanel(true)
                  })
                }}
              />
            </div>
            {/* Right column: Alerts + Stats stacked */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <AlertsPanel />
              <StatsCard docenteId={docente?.id} />
            </div>
          </div>

          {/* ===== Dashboard Tabs — full width ===== */}
          <DashboardTabs />
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
