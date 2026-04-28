import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight,
  CalendarCheck, BookOpen, FileText, Settings, Users,
  ClipboardList, FolderOpen, Sparkles, Zap
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TeacherAvatar from './TeacherAvatar'
import ProfeIAChat from './ProfeIAChat'
import WeatherWidget from './WeatherWidget'

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

function getGreeting() {
  const h = new Date().getHours()
  return GREETINGS.find(g => h >= g.from && h < g.to)?.text || 'Buenas noches'
}

/**
 * Sidebar
 * Props:
 *   prefs: { genero, nombre } | null
 *   docenteId: number | null
 *   grado: number | null
 *   currentTier: number
 */
function Sidebar({ prefs, docenteId, grado = null, currentTier = 1 }) {
  const [collapsed, setCollapsed] = useState(false)
  const [reminderIdx, setReminderIdx] = useState(0)
  const [reminderVisible, setReminderVisible] = useState(true)
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
        <div className="sidebar-chat">
          <ProfeIAChat docenteId={docenteId} grado={grado} currentTier={currentTier} navigate={navigate} />
        </div>
      )}

      {/* Weather Widget — only when expanded */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <WeatherWidget />
        </div>
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
    </aside>
  )
}

export default Sidebar
