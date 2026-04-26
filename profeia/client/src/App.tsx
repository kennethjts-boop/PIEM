import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
import LoginPage from './pages/LoginPage'
import AuthCallback from './pages/AuthCallback'
import UnauthorizedPage from './pages/UnauthorizedPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'
import type { UserProfile } from './contexts/AuthContext'
import { api } from './api'
import { supabase } from './lib/supabaseClient'
import { ChevronLeft, ChevronRight, User, Settings, CreditCard, LogOut, ChevronDown } from 'lucide-react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const MESES_LARGO = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'
]

const DOCENTE_MAP_STORAGE_KEY = 'profeia_docente_map_v1'

type DocenteMap = Record<string, number>

interface LocalDocente {
  id: number | string
  nombre?: string
  escuela?: string
  clave_escuela?: string
}

function buildOfflineDocenteFallback(profile: UserProfile, schoolName = 'Sin escuela asignada', schoolCct = 'N/A') {
  return {
    id: 0,
    nombre: profile.name || 'Docente',
    escuela: schoolName,
    clave_escuela: schoolCct,
  }
}

function loadDocenteMap() {
  try {
    const raw = localStorage.getItem(DOCENTE_MAP_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as DocenteMap) : {}
  } catch {
    return {} as DocenteMap
  }
}

function saveDocenteMap(map: DocenteMap) {
  localStorage.setItem(DOCENTE_MAP_STORAGE_KEY, JSON.stringify(map))
}

function formatFechaEscrita(date: Date) {
  return `Zacatepec, Morelos a ${date.getDate()} de ${MESES_LARGO[date.getMonth()]} del ${date.getFullYear()}`
}


/* ===== User Profile Dropdown ===== */
interface UserProfileDropdownProps {
  userProfile: UserProfile | null
}

function UserProfileDropdown({ userProfile }: UserProfileDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const displayName = userProfile?.name || 'Docente'
  const nombre = displayName.split(' ')[0] || 'Docente'
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const MENU_ITEMS = [
    { icon: User,       label: 'Ver perfil',    color: '#4285F4' },
    { icon: CreditCard, label: 'Suscripción',   color: '#34A853' },
    { icon: Settings,   label: 'Configuración', color: '#FBBC04' },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
          background: open ? 'rgba(66,133,244,0.08)' : 'transparent',
          border: '1px solid', borderColor: open ? 'rgba(66,133,244,0.2)' : 'transparent',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = 'rgba(66,133,244,0.15)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'transparent' }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #4285F4, #A142F4)',
          color: 'white', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {initials}
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#202124', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nombre}
        </span>
        <ChevronDown style={{ width: 14, height: 14, color: '#5f6368', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 220, background: 'white', borderRadius: 14, zIndex: 9999,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 30px rgba(30,41,59,0.14), 0 2px 8px rgba(30,41,59,0.08)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f3f4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #4285F4, #A142F4)',
                color: 'white', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#5f6368', textTransform: 'capitalize' }}>
                  {userProfile?.role || 'teacher'} · ProfeIA
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div style={{ padding: '6px 0' }}>
            {MENU_ITEMS.map(({ icon: Icon, label, color }) => (
              <button key={label} onClick={() => setOpen(false)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Icon style={{ width: 16, height: 16, color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: '#3c4043', fontWeight: 500 }}>{label}</span>
              </button>
            ))}
            <button onClick={handleSignOut}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(234,67,53,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut style={{ width: 16, height: 16, color: '#EA4335', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#EA4335', fontWeight: 500 }}>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MainLayout() {
  const { user, userProfile, authError, loading, signOut } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [docente, setDocente] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showDayPanel, setShowDayPanel] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [stats, setStats] = useState({ planeaciones: 0, bitacora: 0, eventos: 0, sugerenciasPendientes: 0 })

  const mesActual = currentDate.getMonth()
  const anioActual = currentDate.getFullYear()

  const prefs = {
    genero: 'maestro',
    nombre: userProfile?.name || user?.user_metadata?.full_name || 'Docente',
  }

  const loadSuggestions = useCallback(async (id: string | number) => {
    if (!id) {
      setSuggestions([])
      return
    }
    try {
      const data = await api.getSugerencias(id)
      const filtered = Array.isArray(data)
        ? data.filter((s) => !s?.aceptada && !s?.rechazada)
        : []
      setSuggestions(filtered)
    } catch (err) {
      console.error('loadSuggestions error:', err)
      setSuggestions([])
    }
  }, [])

  const loadStats = useCallback(async (id: string | number) => {
    if (!id) {
      setStats({ planeaciones: 0, bitacora: 0, eventos: 0, sugerenciasPendientes: 0 })
      return
    }
    try {
      const data = await api.getStats(id)
      setStats({
        planeaciones: Number(data?.planeaciones || 0),
        bitacora: Number(data?.bitacora || 0),
        eventos: Number(data?.eventos || 0),
        sugerenciasPendientes: Number(data?.sugerenciasPendientes || 0),
      })
    } catch (err) {
      console.error('loadStats fallback:', err)
      setStats({ planeaciones: 0, bitacora: 0, eventos: 0, sugerenciasPendientes: 0 })
    }
  }, [])

  useEffect(() => {
    const hydrateDocente = async () => {
      if (!userProfile) {
        setDocente(null)
        return
      }

      try {
        let resolvedSchoolName = 'Sin escuela asignada'
        let resolvedSchoolCct = 'N/A'

        if (userProfile.school_id) {
          const { data: schoolData, error } = await supabase
            .from('schools')
            .select('name, cct')
            .eq('id', userProfile.school_id)
            .single()

          if (!error && schoolData) {
            resolvedSchoolName = schoolData.name || resolvedSchoolName
            resolvedSchoolCct = schoolData.cct || resolvedSchoolCct
          }
        }

        const docenteMap = loadDocenteMap()
        const mappedDocenteId = Number(docenteMap[userProfile.id]) || null

        let localDocente: LocalDocente | null = null
        let docentesList: LocalDocente[] = []

        if (mappedDocenteId) {
          const docentes = await api.getDocentes()
          docentesList = Array.isArray(docentes) ? docentes : []
          localDocente = docentesList.find((d: LocalDocente) => Number(d.id) === mappedDocenteId) || null
        }

        if (!localDocente) {
          try {
            localDocente = await api.createDocente({
              nombre: userProfile.name,
              escuela: resolvedSchoolName,
              clave_escuela: resolvedSchoolCct,
            })
          } catch (createErr) {
            console.error('hydrateDocente create fallback:', createErr)
            const docentes = docentesList.length > 0 ? docentesList : await api.getDocentes()
            const list = Array.isArray(docentes) ? docentes : []
            localDocente =
              list.find((d: LocalDocente) => d?.nombre === userProfile.name && d?.clave_escuela === resolvedSchoolCct) ||
              list.find((d: LocalDocente) => d?.nombre === userProfile.name && d?.escuela === resolvedSchoolName) ||
              list.find((d: LocalDocente) => d?.clave_escuela === resolvedSchoolCct) ||
              list.find((d: LocalDocente) => d?.escuela === resolvedSchoolName) ||
              null
          }
        }

        if (!localDocente?.id) {
          console.error('No se pudo resolver docenteId local para backend SQLite; usando fallback offline')
          setDocente(buildOfflineDocenteFallback(userProfile, resolvedSchoolName, resolvedSchoolCct))
          setShowOnboarding(false)
          return
        }

        const nextMap = {
          ...docenteMap,
          [userProfile.id]: Number(localDocente.id),
        }
        saveDocenteMap(nextMap)

        const realDocente = {
          id: Number(localDocente.id),
          nombre: localDocente.nombre || userProfile.name,
          escuela: localDocente.escuela || resolvedSchoolName,
          clave_escuela: localDocente.clave_escuela || resolvedSchoolCct,
        }

        setDocente(realDocente)
        setShowOnboarding(false)
        loadSuggestions(realDocente.id)
        loadStats(realDocente.id)
      } catch (err) {
        console.error('hydrateDocente fatal error:', err)
        setDocente(buildOfflineDocenteFallback(userProfile))
        setShowOnboarding(false)
      }
    }

    void hydrateDocente()
  }, [userProfile, loadStats, loadSuggestions])

  const handleCreateDocente = async ({ nombre, escuela, clave_escuela }: { nombre: string; escuela: string; clave_escuela: string }) => {
    try {
      const d = await api.createDocente({ nombre, escuela, clave_escuela })
      if (userProfile?.id && d?.id) {
        const docenteMap = loadDocenteMap()
        const nextMap = {
          ...docenteMap,
          [userProfile.id]: Number(d.id),
        }
        saveDocenteMap(nextMap)
      }
      setDocente(d)
      setShowOnboarding(false)
      loadSuggestions(d.id)
      loadStats(d.id)
    } catch (e) {
      console.error('Create docente error:', e)
      if (userProfile) {
        setDocente(buildOfflineDocenteFallback(userProfile, escuela, clave_escuela))
        setShowOnboarding(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!userProfile && authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center rounded-2xl border border-[#f1d9d9] bg-[#fff7f7] p-6">
          <h2 className="text-xl font-semibold text-[#B3261E]">No se pudo cargar tu perfil</h2>
          <p className="text-sm text-[#5f6368] mt-2">{authError}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-full bg-[#4285F4] text-white text-sm font-semibold hover:bg-[#3367D6] transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => { void signOut() }}
              className="px-4 py-2 rounded-full bg-white border border-[#dadce0] text-[#3c4043] text-sm font-semibold hover:bg-[#f8f9fa] transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#202124]">Preparando tu perfil</h2>
          <p className="text-sm text-[#5f6368] mt-2">Estamos sincronizando tu cuenta de docente.</p>
        </div>
      </div>
    )
  }

  const handleAcceptSuggestion = async (id: string | number) => {
    try { await api.aceptarSugerencia(docente?.id, id); loadSuggestions(docente?.id) } catch {}
  }

  const handleDismissSuggestion = async (id: string | number) => {
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

          {/* School-style date — uppercase letters RED, rest BLACK, Avenir font */}
          <div className="flex flex-col items-center">
            <span style={{ fontFamily: "'Avenir Next', 'Avenir', 'Nunito', sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.1 }}>
              {formatFechaEscrita(new Date()).split('').map((char, i) => (
                <span key={i} style={{ color: /[A-ZÁÉÍÓÚÑ]/.test(char) ? '#EF4444' : '#000000' }}>{char}</span>
              ))}
            </span>
            {userProfile?.name && (
              <span style={{ fontFamily: "'Avenir Next', 'Avenir', 'Nunito', sans-serif", fontSize: 13, color: '#6B7280', lineHeight: 1 }}>
                {userProfile.role === 'teacher' ? 'Maestro' : userProfile.role} {userProfile.name.split(' ')[0]}
              </span>
            )}
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

            <UserProfileDropdown userProfile={userProfile} />
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
                onPrevMonth={() => setCurrentDate(new Date(anioActual, mesActual - 1, 1))}
                onNextMonth={() => setCurrentDate(new Date(anioActual, mesActual + 1, 1))}
                onToday={() => { const t = new Date(); setCurrentDate(t); setSelectedDate(t) }}
                onDayClick={(date) => {
                  startTransition(() => {
                    setSelectedDate(date)
                    setShowDayPanel(true)
                  })
                }}
              />
            </div>
            {/* Right column: Alerts + Stats stacked */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <AlertsPanel docenteId={docente?.id} />
              <StatsCard docenteId={docente?.id} />
            </div>
          </div>

          {/* ===== Dashboard Tabs — full width ===== */}
          <DashboardTabs docenteId={docente?.id} />
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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alumnos"
        element={
          <ProtectedRoute>
            <AlumnosPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
