import { useState, useEffect, useCallback, useRef, useMemo, startTransition } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Calendar from './components/Calendar'
import DayPanel from './components/DayPanel'
import Sidebar from './components/Sidebar'
import FloatingChat from './components/FloatingChat'
import AvatarModal from './components/AvatarModal'
import OnboardingModal from './components/OnboardingModal'
import NotificationDropdown from './components/NotificationDropdown'
import NoticesBanner from './components/NoticesBanner'
import DashboardTabs from './components/DashboardTabs'
import StatsCard from './components/StatsCard'
import AdminPanel from './pages/AdminPanel'
import AlumnosPage from './pages/AlumnosPage'
import AsistenciaPage from './pages/AsistenciaPage'
import BitacoraPage from './pages/BitacoraPage'
import PlaneacionPage from './pages/PlaneacionPage'
import EvaluacionPage from './pages/EvaluacionPage'
import SugerenciasPage from './pages/SugerenciasPage'
import TiersPage from './pages/TiersPage'
import ProyectosPage from './pages/ProyectosPage'
import AvisosPage from './pages/AvisosPage'
import DirectorDashboard from './pages/DirectorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import PerfilPage from './pages/PerfilPage'
import ConfiguracionPage from './pages/ConfiguracionPage'
import AyudaPage from './pages/AyudaPage'
import GeoShapes from './components/GeoShapes'
import LoginPage from './pages/LoginPage'
import AuthCallback from './pages/AuthCallback'
import UnauthorizedPage from './pages/UnauthorizedPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'
import type { UserProfile } from './contexts/AuthContext'
import { api } from './api'
import { getCurrentTier } from './lib/tiers'
import { supabase } from './lib/supabaseClient'
import { User, Settings, CreditCard, LogOut, ChevronDown, Sparkles, FileText, Save, Check, X, AlertTriangle, Bot, Users, Clock3, HelpCircle } from 'lucide-react'

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

type SuggestionPriority = 'urgente' | 'alta' | 'media' | 'baja'

interface UISuggestion {
  id: string | number
  titulo: string
  descripcion: string
  prioridad: SuggestionPriority
  acciones: string[]
  source: string
  piloto: boolean
  aceptada?: boolean
  rechazada?: boolean
}

const PILOT_SOURCE = 'ProfeIA · modo piloto'
const MATERIAS_BASE = ['Español', 'Matemáticas', 'Ciencias', 'Formación Cívica y Ética', 'Tutoría']
const COMPACT_PREF_KEY = 'profeia_compact_v1'
const URGENT_PREF_KEY = 'profeia_urgent_suggestions_v1'

function readBooleanPref(key: string, fallback: boolean) {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  return raw === '1'
}

function toLocalYmd(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

function getPrioridadBadge(prioridad: SuggestionPriority) {
  if (prioridad === 'urgente' || prioridad === 'alta') return 'bg-[#ffe9e6] text-[#c43f2f] border-[#f8c4bc]'
  if (prioridad === 'media') return 'bg-[#fff6df] text-[#9c6a00] border-[#f5df9f]'
  return 'bg-[#eaf8ef] text-[#1e7c44] border-[#bee8cd]'
}

function inferSuggestionPriority(text: string): SuggestionPriority {
  const lower = text.toLowerCase()
  if (/(violencia|riesgo|urgente|acoso|conflicto grave)/.test(lower)) return 'alta'
  if (/(falta|distracci|inquietud|tarea incompleta)/.test(lower)) return 'media'
  return 'baja'
}

function buildSuggestionActions(prioridad: SuggestionPriority) {
  if (prioridad === 'urgente' || prioridad === 'alta') {
    return ['Hablar con el grupo al inicio', 'Registrar seguimiento en bitácora', 'Notificar a dirección si escala']
  }
  if (prioridad === 'media') {
    return ['Aplicar dinámica breve de enfoque', 'Monitorear participación por equipo']
  }
  return ['Mantener refuerzo positivo', 'Cerrar clase con evidencia rápida']
}

function normalizeSuggestion(raw: any, index: number): UISuggestion {
  const priority = (raw?.prioridad || 'media').toLowerCase()
  const prioridad: SuggestionPriority =
    priority === 'urgente' || priority === 'alta' || priority === 'media' || priority === 'baja'
      ? priority
      : 'media'

  return {
    id: raw?.id ?? `api-${index}`,
    titulo: raw?.titulo || 'Recomendación de seguimiento',
    descripcion: raw?.descripcion || 'Ajusta la estrategia de clase para sostener participación y evidencia.',
    prioridad,
    acciones: Array.isArray(raw?.acciones) && raw.acciones.length > 0 ? raw.acciones : buildSuggestionActions(prioridad),
    source: raw?.source || PILOT_SOURCE,
    piloto: Boolean(raw?.piloto),
    aceptada: Boolean(raw?.aceptada),
    rechazada: Boolean(raw?.rechazada),
  }
}

function buildPilotSuggestion(note: string): UISuggestion {
  const prioridad = inferSuggestionPriority(note)
  return {
    id: `pilot-${Date.now()}`,
    titulo: note
      ? 'Sugerencia rápida para la siguiente hora'
      : 'Sugerencia inicial para activar la clase',
    descripcion: note
      ? `Con base en tu nota: "${note.slice(0, 120)}", prioriza una intervención breve y una evidencia de cierre.`
      : 'Inicia con recuperación de saberes previos, actividad guiada y cierre con verificación de comprensión.',
    prioridad,
    acciones: buildSuggestionActions(prioridad),
    source: PILOT_SOURCE,
    piloto: true,
  }
}

function buildFallbackSuggestions(): UISuggestion[] {
  return [
    {
      id: 'pilot-seed-1',
      titulo: 'Alinear apertura de clase',
      descripcion: 'ProfeIA está analizando la clase con reglas pedagógicas iniciales para telesecundaria.',
      prioridad: 'media',
      acciones: ['Recuperar conocimiento previo (3 min)', 'Definir meta visible en pizarrón'],
      source: PILOT_SOURCE,
      piloto: true,
    },
    {
      id: 'pilot-seed-2',
      titulo: 'Seguimiento formativo rápido',
      descripcion: 'Registra un indicador de avance por equipo para detectar rezago antes del cierre.',
      prioridad: 'baja',
      acciones: ['Preguntas de salida', 'Registrar observación en bitácora'],
      source: PILOT_SOURCE,
      piloto: true,
    },
  ]
}

function inferDocenteGrado(alumnos: Array<{ grado?: number | string | null }>): number | null {
  const counts = new Map<number, number>()

  for (const alumno of alumnos) {
    const grade = Number(alumno?.grado)
    if (!Number.isFinite(grade) || grade <= 0) continue
    counts.set(grade, (counts.get(grade) || 0) + 1)
  }

  if (counts.size === 0) return null

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}


/* ===== User Profile Dropdown ===== */
interface UserProfileDropdownProps {
  userProfile: UserProfile | null
}

function UserProfileDropdown({ userProfile }: UserProfileDropdownProps) {
  const navigate = useNavigate()
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
    { icon: User,       label: 'Mi perfil',     color: '#4285F4', path: '/perfil' },
    { icon: CreditCard, label: 'Suscripción',   color: '#34A853', path: '/planes' },
    { icon: Settings,   label: 'Configuración', color: '#FBBC04', path: '/configuracion' },
    { icon: HelpCircle, label: 'Ayuda',         color: '#A142F4', path: '/ayuda' },
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
            {MENU_ITEMS.map(({ icon: Icon, label, color, path }) => (
              <button key={label} onClick={() => { setOpen(false); navigate(path) }}
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
  const [docenteGrado, setDocenteGrado] = useState<number | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showDayPanel, setShowDayPanel] = useState(false)
  const [compactMode, setCompactMode] = useState(() => readBooleanPref(COMPACT_PREF_KEY, false))
  const [urgentSuggestionsEnabled, setUrgentSuggestionsEnabled] = useState(() => readBooleanPref(URGENT_PREF_KEY, true))
  const [suggestions, setSuggestions] = useState<UISuggestion[]>([])
  const [stats, setStats] = useState({ planeaciones: 0, bitacora: 0, eventos: 0, sugerenciasPendientes: 0 })
  const [backendUnavailable, setBackendUnavailable] = useState(false)
  const [pilotNote, setPilotNote] = useState('')
  const [panelMessage, setPanelMessage] = useState('')
  const [savingBitacora, setSavingBitacora] = useState(false)

  const mesActual = currentDate.getMonth()
  const anioActual = currentDate.getFullYear()

  const prefs = {
    genero: 'maestro',
    nombre: userProfile?.name || user?.user_metadata?.full_name || 'Docente',
  }
  const currentTier = getCurrentTier(userProfile)

  useEffect(() => {
    const refreshPrefs = () => {
      setCompactMode(readBooleanPref(COMPACT_PREF_KEY, false))
      setUrgentSuggestionsEnabled(readBooleanPref(URGENT_PREF_KEY, true))
    }

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === COMPACT_PREF_KEY || event.key === URGENT_PREF_KEY) {
        refreshPrefs()
      }
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('profeia:preferences-updated', refreshPrefs)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('profeia:preferences-updated', refreshPrefs)
    }
  }, [])

  const suggestionsForNotifications = useMemo(() => {
    if (urgentSuggestionsEnabled) return suggestions
    return suggestions.filter((item) => {
      const priority = String(item?.prioridad || '').toLowerCase()
      return priority !== 'urgente' && priority !== 'alta'
    })
  }, [suggestions, urgentSuggestionsEnabled])

  const loadSuggestions = useCallback(async (id: string | number) => {
    if (!id) {
      setSuggestions(buildFallbackSuggestions())
      return
    }

    if (Number(id) <= 0) {
      setBackendUnavailable(true)
      setSuggestions(buildFallbackSuggestions())
      return
    }

    try {
      const data = await api.getSugerencias(id)
      const filtered = (Array.isArray(data)
        ? data.filter((s) => !s?.aceptada && !s?.rechazada)
        : [])
        .map((s, index) => normalizeSuggestion(s, index))

      setSuggestions(filtered.length > 0 ? filtered : buildFallbackSuggestions())
      setBackendUnavailable(false)
    } catch (err) {
      console.error('loadSuggestions error:', err)
      setSuggestions(buildFallbackSuggestions())
      setBackendUnavailable(true)
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
      setBackendUnavailable(false)
    } catch (err) {
      console.error('loadStats fallback:', err)
      setStats({ planeaciones: 0, bitacora: 0, eventos: 0, sugerenciasPendientes: 0 })
      setBackendUnavailable(true)
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
          setBackendUnavailable(true)
          setSuggestions(buildFallbackSuggestions())
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
        const done = localStorage.getItem('profeia_onboarding_done_v1')
        if (!done) setShowWelcome(true)
        loadSuggestions(realDocente.id)
        loadStats(realDocente.id)
      } catch (err) {
        console.error('hydrateDocente fatal error:', err)
        setDocente(buildOfflineDocenteFallback(userProfile))
        setShowOnboarding(false)
        setBackendUnavailable(true)
        setSuggestions(buildFallbackSuggestions())
      }
    }

    void hydrateDocente()
  }, [userProfile, loadStats, loadSuggestions])

  useEffect(() => {
    let isActive = true

    const resolveDocenteGrado = async () => {
      if (!docente?.id || Number(docente.id) <= 0) {
        setDocenteGrado(null)
        return
      }

      try {
        const alumnos = await api.getAlumnos(docente.id)
        if (!isActive) return
        const inferred = inferDocenteGrado(Array.isArray(alumnos) ? alumnos : [])
        setDocenteGrado(inferred)
      } catch {
        if (!isActive) return
        setDocenteGrado(null)
      }
    }

    void resolveDocenteGrado()

    return () => {
      isActive = false
    }
  }, [docente?.id])

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
      const done = localStorage.getItem('profeia_onboarding_done_v1')
      if (!done) setShowWelcome(true)
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
    const selected = suggestions.find((s) => s.id === id)
    if (selected?.piloto || String(id).startsWith('pilot-')) {
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
      setPanelMessage('Sugerencia marcada como aplicada en modo piloto.')
      return
    }

    try {
      await api.aceptarSugerencia(docente?.id, id)
      loadSuggestions(docente?.id)
    } catch {
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
      setBackendUnavailable(true)
      setPanelMessage('Servidor de piloto no disponible. Guardamos el cambio en modo local.')
    }
  }

  const handleDismissSuggestion = async (id: string | number) => {
    const selected = suggestions.find((s) => s.id === id)
    if (selected?.piloto || String(id).startsWith('pilot-')) {
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
      setPanelMessage('Sugerencia descartada.')
      return
    }

    try {
      await api.rechazarSugerencia(docente?.id, id)
      loadSuggestions(docente?.id)
    } catch {
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
      setBackendUnavailable(true)
      setPanelMessage('Servidor de piloto no disponible. Descarte aplicado en modo local.')
    }
  }

  const handleGeneratePilotSuggestion = () => {
    setSuggestions((prev) => [buildPilotSuggestion(pilotNote.trim()), ...prev])
    setPanelMessage('Nueva sugerencia generada. Revisa el panel y notificaciones.')
  }

  const handleQuickBitacoraSave = async () => {
    const trimmed = pilotNote.trim()
    if (!trimmed) {
      setPanelMessage('Escribe una nota breve para guardar en bitácora.')
      return
    }

    if (!docente?.id || Number(docente.id) <= 0) {
      setBackendUnavailable(true)
      setPanelMessage('Servidor de piloto no disponible. Nota guardada en modo local.')
      setPilotNote('')
      return
    }

    setSavingBitacora(true)
    try {
      await api.createBitacora(docente.id, {
        fecha: toLocalYmd(new Date()),
        tipo: 'general',
        descripcion: trimmed,
        gravedad: 2,
        acciones_tomadas: 'Registro rápido desde panel piloto',
      })
      setPanelMessage('Nota guardada en bitácora correctamente.')
      setPilotNote('')
      loadStats(docente.id)
    } catch (err) {
      console.error('Quick bitacora save error:', err)
      setBackendUnavailable(true)
      setPanelMessage('Servidor de piloto no disponible. Nota guardada en modo local.')
      setPilotNote('')
    } finally {
      setSavingBitacora(false)
    }
  }

  const primerNombre = docente?.nombre?.split(' ')?.[0] || userProfile?.name?.split(' ')?.[0] || 'Docente'
  const materiaHoy = MATERIAS_BASE[new Date().getDay() % MATERIAS_BASE.length]
  const claseHoy = {
    grupo: 'Grupo único · telesecundaria',
    materia: materiaHoy,
    hora: '12:00 - 12:50',
  }

  return (
    <div className={`app-root ${compactMode ? 'compact-mode' : ''}`}>
      <div className="bg-mesh" />
      <GeoShapes />

      {showOnboarding && <AvatarModal onCreate={handleCreateDocente} />}
      {showWelcome && <OnboardingModal onClose={() => setShowWelcome(false)} />}

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
              notifications={suggestionsForNotifications}
              onAccept={handleAcceptSuggestion}
              onDismiss={handleDismissSuggestion}
            />

            <UserProfileDropdown userProfile={userProfile} />
          </div>
        </header>

        {/* ===== Notices Banner ===== */}
        <NoticesBanner />

        <main className="main-content">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
            <section className="glass-card rounded-3xl p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Clase de hoy</p>
                  <h2 className="text-2xl font-bold text-[#1f2937] mt-1">Hola, Profe {primerNombre}</h2>
                  <p className="text-sm text-[#6b7280] mt-1">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#cbe1ff] bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[#2a64b7]">
                  <Bot className="w-3.5 h-3.5" /> Modo piloto activo
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#e8eef7] bg-white/90 px-4 py-3">
                  <p className="text-xs text-[#6b7280] flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Grupo</p>
                  <p className="text-sm font-semibold text-[#1f2937] mt-1">{claseHoy.grupo}</p>
                </div>
                <div className="rounded-2xl border border-[#e8eef7] bg-white/90 px-4 py-3">
                  <p className="text-xs text-[#6b7280] flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Materia</p>
                  <p className="text-sm font-semibold text-[#1f2937] mt-1">{claseHoy.materia}</p>
                </div>
                <div className="rounded-2xl border border-[#e8eef7] bg-white/90 px-4 py-3">
                  <p className="text-xs text-[#6b7280] flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> Horario</p>
                  <p className="text-sm font-semibold text-[#1f2937] mt-1">{claseHoy.hora}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-[#d7e4f8] bg-[#f8fbff] px-4 py-3">
                <p className="text-sm text-[#3f4b5f]">
                  {stats.sugerenciasPendientes > 0
                    ? `Tienes ${stats.sugerenciasPendientes} sugerencias pendientes para cerrar la clase con evidencia.`
                    : 'Aun sin eventos críticos. Puedes generar una sugerencia IA piloto para orientar la sesión.'}
                </p>
              </div>
            </section>

            <section className="glass-card-elevated rounded-3xl p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[#1f2937]">Bitácora / Sugerencias</h3>
                  <p className="text-xs text-[#6b7280] mt-0.5">ProfeIA está analizando la clase con reglas pedagógicas iniciales.</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#d9def1] bg-[#f5f7ff] px-2.5 py-1 text-[11px] font-semibold text-[#4b5ba8]">
                  <Sparkles className="w-3.5 h-3.5" /> {PILOT_SOURCE}
                </span>
              </div>

              {backendUnavailable && (
                <div className="mt-4 rounded-xl border border-[#f5c2be] bg-[#fff3f2] px-3 py-2 text-sm font-medium text-[#a83f32] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Servidor de piloto no disponible
                </div>
              )}

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Nota rápida de bitácora</label>
                <textarea
                  value={pilotNote}
                  onChange={(e) => setPilotNote(e.target.value)}
                  className="input-google mt-2 min-h-[84px] resize-none"
                  placeholder="Ej. Hubo baja participación en el cierre de matemáticas..."
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleGeneratePilotSuggestion}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#2c72df] px-3 py-2 text-xs font-semibold text-white hover:bg-[#215fc0] transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Generar sugerencia
                  </button>
                  <button
                    onClick={handleQuickBitacoraSave}
                    disabled={savingBitacora}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#c9d6eb] bg-white px-3 py-2 text-xs font-semibold text-[#264469] hover:bg-[#f4f8ff] transition-colors disabled:opacity-60"
                  >
                    <Save className="w-3.5 h-3.5" /> Guardar en bitácora
                  </button>
                </div>
                {panelMessage && <p className="mt-2 text-xs text-[#4f5f78]">{panelMessage}</p>}
              </div>

              <div className="mt-4 space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {suggestions.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#d7e4f8] bg-[#f8fbff] px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-[#3b4c66]">Aún no hay sugerencias</p>
                    <p className="text-xs text-[#6b7280] mt-1">Genera una sugerencia para iniciar el acompañamiento IA piloto.</p>
                  </div>
                )}

                {suggestions.slice(0, 4).map((s) => (
                  <article key={s.id} className="rounded-2xl border border-[#e2eaf5] bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#1f2937]">{s.titulo}</p>
                        <p className="text-xs text-[#637188] mt-1">{s.descripcion}</p>
                      </div>
                      <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getPrioridadBadge(s.prioridad)}`}>
                        {s.prioridad}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7a879a] mt-2">{s.source || PILOT_SOURCE}</p>
                    {s.acciones?.length > 0 && (
                      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-[#40506a]">
                        {s.acciones.slice(0, 2).map((accion, idx) => <li key={`${s.id}-${idx}`}>{accion}</li>)}
                      </ul>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleAcceptSuggestion(s.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#eaf8ef] px-2 py-1.5 text-[11px] font-semibold text-[#1f7f45] hover:bg-[#dbf1e3]"
                      >
                        <Check className="w-3.5 h-3.5" /> Aceptar
                      </button>
                      <button
                        onClick={() => handleDismissSuggestion(s.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#f4f6f9] px-2 py-1.5 text-[11px] font-semibold text-[#526076] hover:bg-[#ffecec] hover:text-[#b74444]"
                      >
                        <X className="w-3.5 h-3.5" /> Rechazar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
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
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <StatsCard docenteId={docente?.id} />
            </div>
          </div>

          {/* ===== Dashboard Tabs — full width ===== */}
          <DashboardTabs docenteId={docente?.id} />
        </main>
      </div>

      {user && (
        <FloatingChat
          docenteId={docente?.id}
          grado={docenteGrado}
          userProfile={userProfile}
          currentTier={currentTier}
        />
      )}

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
      <Route
        path="/asistencia"
        element={
          <ProtectedRoute>
            <AsistenciaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bitacora"
        element={
          <ProtectedRoute>
            <BitacoraPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planeacion"
        element={
          <ProtectedRoute>
            <PlaneacionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluacion"
        element={
          <ProtectedRoute>
            <EvaluacionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sugerencias"
        element={
          <ProtectedRoute>
            <SugerenciasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planes"
        element={
          <ProtectedRoute>
            <TiersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/proyectos"
        element={
          <ProtectedRoute>
            <ProyectosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <PerfilPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracion"
        element={
          <ProtectedRoute>
            <ConfiguracionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ayuda"
        element={
          <ProtectedRoute>
            <AyudaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avisos"
        element={
          <ProtectedRoute>
            <AvisosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/director"
        element={
          <ProtectedRoute>
            <DirectorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor"
        element={
          <ProtectedRoute>
            <SupervisorDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
