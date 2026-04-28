import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight,
  CalendarCheck, BookOpen, FileText, Settings, Users,
  ClipboardList, FolderOpen, Sparkles, Zap,
  AlertTriangle, Megaphone, CheckCircle2, WifiOff
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TeacherAvatar from './TeacherAvatar'
import WeatherWidget from './WeatherWidget'
import { getTareasLocales, marcarTareaHecha } from '../lib/tareasLocales'

const GREETINGS = [
  { from: 6,  to: 12, text: 'Buenos días' },
  { from: 12, to: 19, text: 'Buenas tardes' },
  { from: 0,  to: 6,  text: 'Buenas noches' },
  { from: 19, to: 24, text: 'Buenas noches' }
]

const REMINDERS = [
  '¿Ya registraste la asistencia de hoy?',
  'Recuerda actualizar la bitácora',
  'Revisa tus planeaciones de esta semana',
  'El trimestre avanza — verifica tu cobertura',
  '¿Hay algún alumno que necesite seguimiento?',
  'Comparte avances con los padres de familia',
  'Consulta el calendario de evaluaciones',
  'ProfeIA puede ayudarte a planear mañana'
]

const WEATHER_PREF_KEY = 'profeia_weather_v1'

function readWeatherPreference() {
  const stored = localStorage.getItem(WEATHER_PREF_KEY)
  if (stored === null) return true
  return stored === '1'
}

function getGreeting() {
  const h = new Date().getHours()
  return GREETINGS.find(g => h >= g.from && h < g.to)?.text || 'Buenas noches'
}

function TareasHoy({ docenteId }) {
  const navigate = useNavigate()
  const [completed, setCompleted] = useState({})
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [tareasAgente, setTareasAgente] = useState([])

  useEffect(() => {
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    const reload = () => setTareasAgente(getTareasLocales().filter((t) => !t.done))
    reload()

    const onStorage = () => reload()

    window.addEventListener('storage', onStorage)
    window.addEventListener('profeia:tareas-updated', reload)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('profeia:tareas-updated', reload)
    }
  }, [])

  const TAREAS_SISTEMA = [
    {
      id: 'asistencia',
      icon: CalendarCheck,
      text: 'Tomar asistencia',
      priority: 'urgente',
      path: '/asistencia',
      created_at: '',
    },
    {
      id: 'bitacora',
      icon: BookOpen,
      text: 'Revisar bitácora',
      priority: 'normal',
      path: '/bitacora',
      created_at: '',
    },
    {
      id: 'planeacion',
      icon: FileText,
      text: 'Preparar planeación',
      priority: 'normal',
      path: '/planeacion',
      created_at: '',
    },
    {
      id: 'sugerencias',
      icon: AlertTriangle,
      text: 'Revisar sugerencias urgentes',
      priority: 'urgente',
      path: '/sugerencias',
      created_at: '',
    },
    {
      id: 'avisos',
      icon: Megaphone,
      text: 'Atender aviso del director',
      priority: 'urgente',
      path: '/avisos',
      created_at: '',
    },
  ]

  const todasLasTareas = [
    ...tareasAgente.map((item) => ({
      id: item.id,
      icon: ClipboardList,
      text: item.titulo,
      priority: item.prioridad || 'normal',
      path: item.action_path || '/dashboard',
      action_path: item.action_path || null,
      created_at: item.created_at || '',
      source: 'agent',
      isLocal: true,
    })),
    ...TAREAS_SISTEMA.filter((task) => !tareasAgente.some((ta) => ta.action_path && ta.action_path === task.path)).map((task) => ({
      ...task,
      source: 'system',
      isLocal: false,
    })),
  ]

  const pending = todasLasTareas
    .filter((task) => !completed[task.id])
    .sort((a, b) => {
      const priorityA = a.priority === 'urgente' ? 0 : 1
      const priorityB = b.priority === 'urgente' ? 0 : 1
      if (priorityA !== priorityB) return priorityA - priorityB
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

  const handleCompleteTask = (task) => {
    setCompleted((prev) => ({ ...prev, [task.id]: true }))
    if (!task.isLocal) return
    marcarTareaHecha(task.id)
  }

  return (
    <section className="sidebar-tasks glass-card">
      <div className="sidebar-tasks-header">
        <div>
          <p className="sidebar-tasks-kicker">Plan del día</p>
          <h3 className="sidebar-tasks-title">Tareas de hoy</h3>
        </div>
        {offline && (
          <span className="sidebar-tasks-offline">
            <WifiOff className="w-3 h-3" /> offline
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="sidebar-tasks-empty">
          <CheckCircle2 className="w-5 h-5 text-[#34A853]" />
          <span>¡Todo al día! Buen trabajo, profe.</span>
        </div>
      ) : (
        <div className="sidebar-tasks-list">
          {pending.map((task) => {
            const Icon = task.icon
            return (
              <article key={task.id} className="sidebar-task-item">
                <div className="sidebar-task-main">
                  <span className="sidebar-task-icon"><Icon className="w-3.5 h-3.5" /></span>
                  <div>
                    <p className="sidebar-task-text">{task.text}</p>
                    <span className={`sidebar-task-priority ${task.priority === 'urgente' ? 'is-urgent' : 'is-normal'}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
                <div className="sidebar-task-actions">
                  <button className="sidebar-task-go" onClick={() => navigate(task.path)}>
                    Abrir
                  </button>
                  <button
                    className="sidebar-task-done"
                    onClick={() => handleCompleteTask(task)}
                    aria-label={`Marcar ${task.text} como completada`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!docenteId && (
        <p className="sidebar-tasks-note">
          Sin docente seleccionado: mostrando tareas base del piloto.
        </p>
      )}
    </section>
  )
}

/**
 * Sidebar
 * Props:
 *   prefs: { genero, nombre } | null
 *   docenteId: number | null
 *   grado: number | null
 *   currentTier: number
 */
function Sidebar({ prefs, docenteId }) {
  const [collapsed, setCollapsed] = useState(false)
  const [reminderIdx, setReminderIdx] = useState(0)
  const [reminderVisible, setReminderVisible] = useState(true)
  const [showWeatherWidget, setShowWeatherWidget] = useState(() => readWeatherPreference())
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try { await signOut() } finally { navigate('/login', { replace: true }) }
  }

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    if (mq.matches) setCollapsed(true)
    const handler = (e) => { if (e.matches) setCollapsed(true) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setReminderVisible(false)
      setTimeout(() => {
        setReminderIdx(i => (i + 1) % REMINDERS.length)
        setReminderVisible(true)
      }, 400)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const refreshPreference = () => setShowWeatherWidget(readWeatherPreference())
    const onStorage = (event) => {
      if (!event.key || event.key === WEATHER_PREF_KEY) refreshPreference()
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('profeia:preferences-updated', refreshPreference)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('profeia:preferences-updated', refreshPreference)
    }
  }, [])

  const genero = prefs?.genero || 'maestro'
  const nombre = prefs?.nombre?.split(' ')[0] || 'Profe'
  const greeting = getGreeting()

  const TOOLS = [
    { icon: CalendarCheck, label: 'Asistencia',  color: '#34A853', path: '/asistencia' },
    { icon: BookOpen,      label: 'Bitácora',    color: '#FBBC04', path: '/bitacora' },
    { icon: FileText,      label: 'Planeación',  color: '#4285F4', path: '/planeacion' },
    { icon: Users,         label: 'Alumnos',     color: '#EA4335', path: '/alumnos' },
    { icon: ClipboardList, label: 'Evaluación',  color: '#A142F4', path: '/evaluacion' },
    { icon: FolderOpen,    label: 'Documentos',  color: '#0F9D58', path: '/admin' },
    { icon: Sparkles,      label: 'Sugerencias', color: '#F59E0B', path: '/sugerencias' },
    { icon: Zap,           label: 'Planes',      color: '#A142F4', path: '/planes' },
  ]

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="sidebar-toggle"
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-4 h-4" />
          : <ChevronLeft className="w-4 h-4" />
        }
      </button>

      <div className="sidebar-scroll-area">
        <div className={`sidebar-top ${collapsed ? 'sidebar-top-collapsed' : ''}`}>
          <div className="flex justify-center">
            <TeacherAvatar genero={genero} size={collapsed ? 40 : 72} animated />
          </div>

          {!collapsed && (
            <>
              <div className="text-center mt-2">
                <p className="text-sm font-bold text-[#202124]">
                  {greeting}, {nombre}
                </p>
                <p className="text-[10px] text-[#9aa0a6] capitalize">{genero}</p>
              </div>
              <div
                className="reminder-chip"
                style={{ opacity: reminderVisible ? 1 : 0 }}
              >
                {REMINDERS[reminderIdx]}
              </div>
            </>
          )}
        </div>

        {!collapsed && (
          <>
            <TareasHoy docenteId={docenteId} />

            {/* Weather Widget — only when expanded */}
            <div className="px-3 pb-2">
              {showWeatherWidget && <WeatherWidget />}
            </div>
          </>
        )}

        <div className={`sidebar-tools ${collapsed ? 'sidebar-tools-collapsed' : ''}`}>
          {TOOLS.map(({ icon: Icon, label, color, path }) => (
            <button
              key={label}
              className="tool-btn"
              title={label}
              aria-label={label}
              onClick={() => path && navigate(path)}
            >
              <Icon className="w-5 h-5" style={{ color }} />
              {!collapsed && <span className="tool-label">{label}</span>}
            </button>
          ))}
          <button
            className="tool-btn"
            title="Admin"
            aria-label="Panel de Admin"
            onClick={() => navigate('/admin')}
          >
            <Settings className="w-5 h-5 text-[#9aa0a6]" />
            {!collapsed && <span className="tool-label text-[#9aa0a6]">Admin</span>}
          </button>
          <button
            className="tool-btn"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            onClick={handleSignOut}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!collapsed && <span className="tool-label text-red-400">Salir</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
