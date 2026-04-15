import { useState, useRef, useEffect } from 'react'
import { Bell, AlertTriangle, Clock, Lightbulb, X, Check } from 'lucide-react'

const TABS = [
  { key: 'urgente',      label: 'Urgente',      icon: AlertTriangle, color: '#EA4335' },
  { key: 'recordatorio', label: 'Recordatorio',  icon: Clock,         color: '#FBBC04' },
  { key: 'sugerencia',   label: 'Sugerencia',    icon: Lightbulb,     color: '#4285F4' }
]

function mapTab(prioridad) {
  if (prioridad === 'urgente') return 'urgente'
  if (prioridad === 'alta' || prioridad === 'media') return 'recordatorio'
  return 'sugerencia'
}

/**
 * NotificationDropdown
 * Props:
 *   notifications: array of sugerencia objects
 *   onAccept: (id) => void
 *   onDismiss: (id) => void
 */
function NotificationDropdown({ notifications = [], onAccept, onDismiss }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('urgente')
  const [read, setRead] = useState(new Set())
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifications.filter(n => !read.has(n.id)).length

  const markRead = (id) => setRead(prev => new Set([...prev, id]))

  const tabItems = notifications.filter(n => mapTab(n.prioridad) === activeTab)

  const tabDot = (tabKey) => {
    const count = notifications.filter(n => mapTab(n.prioridad) === tabKey && !read.has(n.id)).length
    return count > 0 ? count : null
  }

  return (
    <div className="notif-root" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="notif-bell"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown animate-slide-down">
          <div className="notif-header">
            <h3 className="font-bold text-[#202124] text-sm">Notificaciones</h3>
            <button
              onClick={() => { notifications.forEach(n => markRead(n.id)); setOpen(false) }}
              className="text-xs text-[#4285F4] hover:underline"
            >
              Marcar todo como leído
            </button>
          </div>

          <div className="notif-tabs">
            {TABS.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`notif-tab ${activeTab === key ? 'notif-tab-active' : ''}`}
                style={activeTab === key ? { color, borderBottomColor: color } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {tabDot(key) && (
                  <span className="notif-tab-dot" style={{ background: color }}>
                    {tabDot(key)}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="notif-items">
            {tabItems.length === 0 ? (
              <div className="notif-empty">
                <Bell className="w-8 h-8 text-[#e8eaed] mx-auto mb-2" />
                <p className="text-sm text-[#9aa0a6]">Sin notificaciones</p>
              </div>
            ) : (
              tabItems.map(n => {
                const TabIcon = TABS.find(t => t.key === mapTab(n.prioridad))?.icon || Lightbulb
                const color = TABS.find(t => t.key === mapTab(n.prioridad))?.color || '#4285F4'
                return (
                  <div
                    key={n.id}
                    className={`notif-item ${!read.has(n.id) ? 'notif-item-unread' : ''}`}
                    onClick={() => markRead(n.id)}
                  >
                    <TabIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#202124] truncate">{n.titulo}</p>
                      <p className="text-xs text-[#5f6368] mt-0.5 line-clamp-2">{n.descripcion}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {onAccept && (
                        <button
                          onClick={e => { e.stopPropagation(); markRead(n.id); onAccept(n.id) }}
                          className="p-1 rounded-full hover:bg-[#34A853]/10 text-[#34A853]"
                          title="Aceptar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); markRead(n.id); onDismiss?.(n.id) }}
                        className="p-1 rounded-full hover:bg-[#f1f3f4] text-[#9aa0a6]"
                        title="Descartar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
