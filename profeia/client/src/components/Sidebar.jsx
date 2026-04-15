import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight,
  CalendarCheck, BookOpen, FileText, Settings, Users
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
 */
function Sidebar({ prefs, docenteId }) {
  const [collapsed, setCollapsed] = useState(false)
  const [reminderIdx, setReminderIdx] = useState(0)
  const [reminderVisible, setReminderVisible] = useState(true)
  const navigate = useNavigate()

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
    { icon: CalendarCheck, label: 'Asistencia', color: '#34A853' },
    { icon: BookOpen,      label: 'Bitácora',   color: '#FBBC04' },
    { icon: FileText,      label: 'Planeación', color: '#4285F4' },
    { icon: Users,         label: 'Alumnos',    color: '#EA4335', path: '/alumnos' }
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
          <ProfeIAChat docenteId={docenteId} grado={null} />
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
      </div>
    </aside>
  )
}

export default Sidebar
