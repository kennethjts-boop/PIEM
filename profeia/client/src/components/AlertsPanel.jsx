import { useState } from 'react'
import {
  AlertTriangle,
  Users, BookOpen, Calendar, Bell, ChevronRight, X, CheckCircle
} from 'lucide-react'

const URGENTES = [
  {
    id: 1, iconComponent: AlertTriangle, iconColor: '#EA4335',
    title: '3 alumnos con 5+ faltas',
    message: 'Luis M., Karen P. y Sofía R. acumulan más de 5 faltas consecutivas.',
    time: 'Hace 2 h', action: 'Ver asistencia', read: false,
  },
  {
    id: 2, iconComponent: AlertTriangle, iconColor: '#EA4335',
    title: 'Bitácora pendiente',
    message: 'Registro del martes requiere protocolo de actuación.',
    time: 'Ayer', action: 'Ver bitácora', read: false,
  },
  {
    id: 3, iconComponent: Users, iconColor: '#EA4335',
    title: '2 alumnos en riesgo',
    message: 'Miguel A. y Diana F. con promedio < 6. Evaluación en 5 días.',
    time: 'Hace 1 d', action: 'Ver evaluaciones', read: false,
  },
]

const RECORDATORIOS = [
  {
    id: 4, iconComponent: BookOpen, iconColor: '#FBBC04',
    title: 'Evaluación trimestral en 5 días',
    message: '4 alumnos sin calificación en Ciencias. Límite: 28 de mayo.',
    time: '5 días', action: 'Ir a evaluación', read: false,
  },
  {
    id: 5, iconComponent: Calendar, iconColor: '#FBBC04',
    title: 'Planeación semanal pendiente',
    message: 'Semana 20-24 de mayo sin planeaciones registradas.',
    time: 'Esta semana', action: 'Planear semana', read: true,
  },
  {
    id: 6, iconComponent: Bell, iconColor: '#FBBC04',
    title: 'Entrega de calificaciones',
    message: 'Sistema SEP cierra el 28 de mayo a las 23:59 hrs.',
    time: 'En 5 días', action: 'Marcar leído', read: true,
  },
]

const NOTICIAS = [
  {
    id: 7, source: 'SEP', sourceColor: '#EA4335', sourceBg: 'rgba(234,67,53,0.1)',
    title: 'Convocatoria Carrera Magisterial',
    message: 'Registro abierto del 15 al 30 de mayo 2025.',
    time: 'Hace 3 h', action: 'Ver convocatoria', read: false,
  },
  {
    id: 8, source: 'DOF', sourceColor: '#34A853', sourceBg: 'rgba(52,168,83,0.1)',
    title: 'Reforma Ley General de Educación',
    message: 'Nuevas disposiciones para Telesecundaria en vigor.',
    time: 'Ayer', action: 'Leer decreto', read: false,
  },
  {
    id: 9, source: 'SNTE', sourceColor: '#4285F4', sourceBg: 'rgba(66,133,244,0.1)',
    title: 'Cursos de actualización',
    message: 'Plataforma SNTE Digital: nuevos cursos sin costo.',
    time: 'Hace 2 d', action: 'Ver cursos', read: true,
  },
]

const TABS = [
  { key: 'urgentes',      label: 'Urg.',  dot: '#EA4335', data: URGENTES },
  { key: 'recordatorios', label: 'Rec.',  dot: '#FBBC04', data: RECORDATORIOS },
  { key: 'noticias',      label: 'Not.',  dot: '#34A853', data: NOTICIAS },
]

function AlertCard({ alert, onDismiss }) {
  const unread = !alert.read
  const Icon = alert.iconComponent

  return (
    <div className={`group relative rounded-lg border transition-all ${
      unread ? 'bg-white border-[#e8eaed]' : 'bg-[#f8f9fa]/70 border-[#f1f3f4]'
    }`} style={{ padding: '8px 10px' }}>
      {unread && (
        <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
      )}
      <div className="flex items-start gap-2">
        {Icon && (
          <div className="flex-shrink-0 mt-0.5 rounded-md p-1" style={{ background: `${alert.iconColor}12` }}>
            <Icon style={{ width: 11, height: 11, color: alert.iconColor }} />
          </div>
        )}
        <div className="flex-1 min-w-0 pr-3">
          {alert.source && (
            <span
              className="inline-flex items-center px-1.5 py-px rounded text-[9px] font-bold mb-1"
              style={{ color: alert.sourceColor, background: alert.sourceBg }}
            >
              {alert.source}
            </span>
          )}
          <p className={`text-[11px] font-semibold leading-tight mb-0.5 ${unread ? 'text-[#202124]' : 'text-[#5f6368]'}`}>
            {alert.title}
          </p>
          <p className="text-[10px] text-[#5f6368] leading-snug mb-1.5 line-clamp-2">{alert.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#9aa0a6]">{alert.time}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {alert.action && (
                <button className="text-[9px] text-[#4285F4] font-medium hover:underline flex items-center gap-0.5">
                  {alert.action}
                  <ChevronRight style={{ width: 10, height: 10 }} />
                </button>
              )}
              <button
                onClick={() => onDismiss(alert.id)}
                className="text-[#9aa0a6] hover:text-[#EA4335] transition-colors rounded p-0.5"
                title="Descartar"
              >
                <X style={{ width: 10, height: 10 }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AlertsPanel() {
  const [activeTab, setActiveTab] = useState('urgentes')
  const [dismissed, setDismissed] = useState(new Set())

  const handleDismiss = (id) => setDismissed(prev => new Set([...prev, id]))

  const getTabData = (tab) => tab.data.filter(a => !dismissed.has(a.id))

  const getBadge = (tab) => {
    const count = tab.data.filter(a => !a.read && !dismissed.has(a.id)).length
    return count > 0 ? count : null
  }

  const currentTab = TABS.find(t => t.key === activeTab)
  const currentData = getTabData(currentTab)

  return (
    <div className="flex flex-col glass-card-elevated rounded-2xl overflow-hidden animate-slide-left" style={{ maxHeight: 520 }}>
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 pt-3 pb-2 border-b border-[#f1f3f4] flex-shrink-0">
        <Bell style={{ width: 13, height: 13, color: '#4285F4' }} />
        <h3 className="text-xs font-semibold text-[#202124]">Centro de Alertas</h3>
        <span className="ml-auto text-[9px] text-[#9aa0a6]">
          {TABS.reduce((s, t) => s + t.data.filter(a => !a.read && !dismissed.has(a.id)).length, 0)} sin leer
        </span>
      </div>

      {/* Compact tabs */}
      <div className="flex border-b border-[#f1f3f4] flex-shrink-0">
        {TABS.map(tab => {
          const badge = getBadge(tab)
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-all border-b-2 ${
                isActive
                  ? 'text-[#4285F4] border-[#4285F4] bg-[#4285F4]/[0.04]'
                  : 'text-[#5f6368] border-transparent hover:text-[#202124] hover:bg-[#f8f9fa]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tab.dot }} />
              {tab.label}
              {badge && (
                <span className="min-w-[14px] h-3.5 bg-[#EA4335] text-white text-[8px] font-bold rounded-full flex items-center justify-center px-1">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Scrollable alerts list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ minHeight: 0 }}>
        {currentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <CheckCircle style={{ width: 22, height: 22, color: '#34A853' }} className="mb-1.5" />
            <p className="text-xs font-medium text-[#5f6368]">Sin alertas</p>
            <p className="text-[10px] text-[#9aa0a6]">Todo al día</p>
          </div>
        ) : (
          currentData.map(alert => (
            <AlertCard key={alert.id} alert={alert} onDismiss={handleDismiss} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-[#f1f3f4] bg-[#fafafa] flex-shrink-0">
        <p className="text-[9px] text-[#9aa0a6] text-center">Actualizado via n8n · Próximamente</p>
      </div>
    </div>
  )
}
