import { useState } from 'react'
import {
  AlertTriangle, Clock, Newspaper, CloudSun,
  Users, BookOpen, Calendar, Bell, ChevronRight, X, CheckCircle
} from 'lucide-react'

const URGENTES = [
  {
    id: 1,
    icon: '🔴',
    iconComponent: AlertTriangle,
    iconColor: '#EA4335',
    title: '3 alumnos con 5+ faltas',
    message: 'Luis M., Karen P. y Sofía R. acumulan más de 5 faltas consecutivas. Se recomienda contactar tutores.',
    time: 'Hace 2 horas',
    action: 'Ver asistencia',
    read: false,
  },
  {
    id: 2,
    icon: '🔴',
    iconComponent: AlertTriangle,
    iconColor: '#EA4335',
    title: 'Situación en bitácora pendiente',
    message: 'Registro del martes requiere protocolo de actuación según normas institucionales.',
    time: 'Ayer',
    action: 'Ver bitácora',
    read: false,
  },
  {
    id: 3,
    icon: '🔴',
    iconComponent: Users,
    iconColor: '#EA4335',
    title: '2 alumnos en riesgo de reprobación',
    message: 'Matemáticas: Miguel A. y Diana F. con promedio menor a 6. Evaluación en 5 días.',
    time: 'Hace 1 día',
    action: 'Ver evaluaciones',
    read: false,
  },
]

const RECORDATORIOS = [
  {
    id: 4,
    icon: '🟡',
    iconComponent: BookOpen,
    iconColor: '#FBBC04',
    title: 'Evaluación trimestral en 5 días',
    message: '4 alumnos sin calificación en Ciencias. Fecha límite: 28 de mayo.',
    time: '5 días',
    action: 'Ir a evaluación',
    read: false,
  },
  {
    id: 5,
    icon: '🟡',
    iconComponent: Calendar,
    iconColor: '#FBBC04',
    title: 'Planeación semanal pendiente',
    message: 'Semana del 20-24 de mayo sin planeaciones registradas. Agrega actividades.',
    time: 'Esta semana',
    action: 'Planear semana',
    read: true,
  },
  {
    id: 6,
    icon: '🟡',
    iconComponent: Bell,
    iconColor: '#FBBC04',
    title: 'Entrega de calificaciones',
    message: 'Recuerda que el sistema SEP cierra el 28 de mayo a las 23:59 hrs.',
    time: 'En 5 días',
    action: 'Marcar como leído',
    read: true,
  },
]

const NOTICIAS = [
  {
    id: 7,
    icon: '🟢',
    source: 'SEP',
    sourceColor: '#EA4335',
    sourceBg: 'rgba(234,67,53,0.08)',
    title: 'Nueva convocatoria Carrera Magisterial',
    message: 'Registro abierto del 15 al 30 de mayo 2025. Requisitos y formularios disponibles en portal SEP.',
    time: 'Hace 3 horas',
    action: 'Ver convocatoria',
    read: false,
  },
  {
    id: 8,
    icon: '🟢',
    source: 'DOF',
    sourceColor: '#34A853',
    sourceBg: 'rgba(52,168,83,0.08)',
    title: 'Reforma Ley General de Educación',
    message: 'Nuevas disposiciones para Telesecundaria publicadas. Aplica desde el próximo ciclo escolar.',
    time: 'Ayer',
    action: 'Leer decreto',
    read: false,
  },
  {
    id: 9,
    icon: '🟢',
    source: 'SNTE',
    sourceColor: '#4285F4',
    sourceBg: 'rgba(66,133,244,0.08)',
    title: 'Cursos de actualización docente',
    message: 'Plataforma SNTE Digital: nuevos cursos en línea disponibles sin costo para afiliados.',
    time: 'Hace 2 días',
    action: 'Ver cursos',
    read: true,
  },
]

const CLIMA_ALERTS = [
  {
    id: 10,
    icon: '⛅',
    iconColor: '#4285F4',
    title: 'Condición climática de hoy',
    message: 'Consulta el widget de clima en la barra lateral para el estado del tiempo en tu localidad.',
    time: 'Actualizado',
    action: null,
    read: false,
  },
]

const TABS = [
  { key: 'urgentes',     label: 'Urgentes',      icon: '🔴', data: URGENTES },
  { key: 'recordatorios',label: 'Recordatorios', icon: '🟡', data: RECORDATORIOS },
  { key: 'noticias',     label: 'Noticias',      icon: '🟢', data: NOTICIAS },
  { key: 'clima',        label: 'Clima',          icon: '⛅', data: CLIMA_ALERTS },
]

function AlertCard({ alert, onDismiss }) {
  const unread = !alert.read

  return (
    <div className={`group relative rounded-xl border p-3.5 transition-all hover:shadow-sm ${
      unread
        ? 'bg-white border-[#e8eaed]'
        : 'bg-[#f8f9fa]/60 border-[#f1f3f4]'
    }`}>
      {unread && (
        <div className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#4285F4] animate-pulse" />
      )}

      <div className="flex items-start gap-2.5">
        <span className="text-lg leading-none mt-0.5 flex-shrink-0">{alert.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`text-xs font-semibold leading-tight ${unread ? 'text-[#202124]' : 'text-[#5f6368]'}`}>
              {alert.title}
            </p>
          </div>

          {/* Source badge for noticias */}
          {alert.source && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold mb-1.5"
              style={{ color: alert.sourceColor, background: alert.sourceBg }}
            >
              {alert.source}
            </span>
          )}

          <p className="text-[11px] text-[#5f6368] leading-relaxed mb-2">{alert.message}</p>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9aa0a6]">{alert.time}</span>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {alert.action && (
                <button className="text-[10px] text-[#4285F4] font-medium hover:underline flex items-center gap-0.5">
                  {alert.action}
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => onDismiss(alert.id)}
                className="text-[#9aa0a6] hover:text-[#EA4335] transition-colors p-0.5 rounded"
                title="Descartar"
              >
                <X className="w-3 h-3" />
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

  const handleDismiss = (id) => {
    setDismissed(prev => new Set([...prev, id]))
  }

  const getTabData = (tab) =>
    tab.data.filter(a => !dismissed.has(a.id))

  const getBadge = (tab) => {
    const count = tab.data.filter(a => !a.read && !dismissed.has(a.id)).length
    return count > 0 ? count : null
  }

  const currentTab = TABS.find(t => t.key === activeTab)
  const currentData = getTabData(currentTab)

  return (
    <div className="flex flex-col h-full glass-card-elevated rounded-2xl overflow-hidden animate-slide-left">
      {/* Panel header */}
      <div className="px-4 pt-4 pb-0 border-b border-[#f1f3f4]">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-[#4285F4]" />
          <h3 className="text-sm font-semibold text-[#202124]">Centro de Alertas</h3>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 overflow-x-auto">
          {TABS.map(tab => {
            const badge = getBadge(tab)
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? 'text-[#4285F4] border-[#4285F4]'
                    : 'text-[#5f6368] border-transparent hover:text-[#202124] hover:bg-[#f8f9fa]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {badge && (
                  <span className="min-w-[16px] h-4 bg-[#EA4335] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Alerts list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {currentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <CheckCircle className="w-8 h-8 text-[#34A853] mb-2" />
            <p className="text-sm font-medium text-[#5f6368]">Sin alertas pendientes</p>
            <p className="text-xs text-[#9aa0a6] mt-1">Todo al día en esta sección</p>
          </div>
        ) : (
          currentData.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={handleDismiss}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[#f1f3f4] bg-[#fafafa]">
        <p className="text-[10px] text-[#9aa0a6] text-center">
          Los datos de fuentes externas se actualizan vía n8n · Próximamente
        </p>
      </div>
    </div>
  )
}
