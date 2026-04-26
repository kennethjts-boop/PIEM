import { useState, useMemo, useEffect } from 'react'
import {
  CalendarDays, BarChart3, CheckSquare,
  BookOpen, FileText, Users, Star, GraduationCap,
  AlertTriangle, Clock, ChevronRight, CheckCircle2,
  Flame, TrendingUp, TrendingDown, Award, ClipboardList,
  Lightbulb, FilePen, Bell
} from 'lucide-react'
import { api } from '../api'

/* ─────────── helpers ─────────── */
function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function fmtDate(d) {
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtDateShort(d) {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
function diffDays(a, b) {
  return Math.round((b - a) / 86400000)
}

/* ─────────── event types ─────────── */
const ETYPES = {
  evaluacion:    { label: 'Evaluación',    color: '#4285F4', bg: 'rgba(66,133,244,0.10)',  Icon: BookOpen },
  entrega:       { label: 'Entrega',       color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  Icon: FileText },
  reunion:       { label: 'Reunión',       color: '#A142F4', bg: 'rgba(161,66,244,0.10)',  Icon: Users },
  festivo:       { label: 'Festivo',       color: '#EA4335', bg: 'rgba(234,67,53,0.10)',   Icon: Star },
  capacitacion:  { label: 'Capacitación',  color: '#34A853', bg: 'rgba(52,168,83,0.10)',   Icon: GraduationCap },
}

/* ─────────── mock data generators ─────────── */
function buildEvents() {
  const today = new Date(); today.setHours(0,0,0,0)
  return [
    { id: 1, date: addDays(today, 1),  tipo: 'evaluacion',  desc: 'Examen parcial — Matemáticas', grado: '1°A / 1°B', detail: 'Temas: fracciones, decimales y porcentajes. 45 minutos.' },
    { id: 2, date: addDays(today, 2),  tipo: 'entrega',     desc: 'Entrega de calificaciones al director', grado: null, detail: 'Incluir calificaciones de todos los grupos del trimestre.' },
    { id: 3, date: addDays(today, 3),  tipo: 'reunion',     desc: 'Reunión de padres de familia', grado: '2°C', detail: 'Salón de usos múltiples, 16:00 hrs. Asistencia obligatoria.' },
    { id: 4, date: addDays(today, 4),  tipo: 'evaluacion',  desc: 'Evaluación diagnóstica — Ciencias', grado: '3°A', detail: 'Ciencias Naturales — ecosistemas y biodiversidad.' },
    { id: 5, date: addDays(today, 5),  tipo: 'festivo',     desc: 'Día del Maestro', grado: null, detail: 'Sin clases. Actividad de reconocimiento en la escuela.' },
    { id: 6, date: addDays(today, 7),  tipo: 'entrega',     desc: 'Planeación semanal — Semana 20', grado: 'Todos los grupos', detail: 'Enviar vía sistema SEP antes de las 14:00 hrs.' },
    { id: 7, date: addDays(today, 8),  tipo: 'capacitacion',desc: 'Taller NEM — Nuevos enfoques pedagógicos', grado: null, detail: 'Plataforma SEP en línea. Duración: 3 horas. Genera constancia.' },
    { id: 8, date: addDays(today, 9),  tipo: 'evaluacion',  desc: 'Evaluación formativa — Español', grado: '1°A / 2°B / 3°C', detail: 'Comprensión lectora y escritura. Rúbrica en planeación.' },
    { id: 9, date: addDays(today, 11), tipo: 'reunion',     desc: 'Consejo técnico escolar', grado: null, detail: 'Tema: resultados diagnósticos y plan de mejora. 8:00 hrs.' },
    { id:10, date: addDays(today, 13), tipo: 'entrega',     desc: 'Bitácora mensual — cierre de mes', grado: null, detail: 'Registrar todos los incidentes y avances del mes.' },
    { id:11, date: addDays(today, 14), tipo: 'evaluacion',  desc: 'Prueba sumativa — Formación Cívica', grado: '2°A / 2°B', detail: 'Unidades 1-3. Examen escrito + portafolio de evidencias.' },
  ]
}

const GRUPOS = [
  {
    id: 'g1', grado: '1°A', alumnos: 28,
    asistencia: 91, asistenciaIcon: TrendingUp, asistenciaColor: '#34A853',
    enRiesgo: [
      { nombre: 'Luis M.',  razon: '6 faltas consecutivas' },
      { nombre: 'Karen P.', razon: 'Promedio < 6 en Mat.' },
    ],
    evaluaciones: { completadas: 8, pendientes: 2 },
    destacados: ['Sofía R. — proyecto ciencias 1er lugar', 'Equipo 3 — exposición sobresaliente'],
  },
  {
    id: 'g2', grado: '2°B', alumnos: 25,
    asistencia: 84, asistenciaIcon: TrendingDown, asistenciaColor: '#EA4335',
    enRiesgo: [
      { nombre: 'Miguel A.', razon: 'Bajo desempeño Español' },
    ],
    evaluaciones: { completadas: 10, pendientes: 1 },
    destacados: ['Diana F. — mayor progreso del mes'],
  },
  {
    id: 'g3', grado: '3°C', alumnos: 30,
    asistencia: 96, asistenciaIcon: TrendingUp, asistenciaColor: '#34A853',
    enRiesgo: [],
    evaluaciones: { completadas: 12, pendientes: 0 },
    destacados: ['Grupo con 100% entrega planeaciones', 'Pedro S. — olimpiada matemáticas'],
  },
]

const TAREAS = [
  {
    id: 't1', cat: 'planeacion', titulo: 'Planeación semana 20 — todos los grupos',
    prioridad: 'urgente', limite: 7, icono: FilePen, color: '#4285F4',
    desc: 'Semana del 19-23 de mayo. Incluir actividades NEM y evidencias.',
    accion: 'Abrir planeación',
  },
  {
    id: 't2', cat: 'documento', titulo: 'Bitácora mensual pendiente de cierre',
    prioridad: 'urgente', limite: 2, icono: ClipboardList, color: '#EA4335',
    desc: 'Registrar incidentes del mes y firmar. Entrega al director.',
    accion: 'Ir a bitácora',
  },
  {
    id: 't3', cat: 'proyecto', titulo: 'Proyecto: Periodismo escolar — 1°A',
    prioridad: 'normal', limite: 14, icono: Lightbulb, color: '#A142F4',
    desc: 'Sugerido por NEM: Lenguas y comunicación. Producción de un periódico mural.',
    accion: 'Ver proyecto',
  },
  {
    id: 't4', cat: 'planeacion', titulo: 'Planeación evaluación diagnóstica — 3°C',
    prioridad: 'normal', limite: 10, icono: FilePen, color: '#4285F4',
    desc: 'Ciencias Naturales y Matemáticas. Rúbrica incluida en plantilla.',
    accion: 'Abrir planeación',
  },
  {
    id: 't5', cat: 'proyecto', titulo: 'Proyecto STEAM: Reciclaje y medio ambiente',
    prioridad: 'normal', limite: 21, icono: Lightbulb, color: '#34A853',
    desc: 'Proyecto interdisciplinar sugerido para 2° grado. Duración: 3 semanas.',
    accion: 'Ver proyecto',
  },
  {
    id: 't6', cat: 'documento', titulo: 'Reporte de alumnos en riesgo — 1°A',
    prioridad: 'urgente', limite: 5, icono: AlertTriangle, color: '#F59E0B',
    desc: '2 alumnos requieren protocolo de atención. Llenar formato SEP.',
    accion: 'Ver reporte',
  },
]

/* ─────────── sub-components ─────────── */

function EventCard({ ev, onOpen, isLast }) {
  const { color, bg, Icon, label } = ETYPES[ev.tipo]
  const today = new Date(); today.setHours(0,0,0,0)
  const days = diffDays(today, ev.date)
  const isToday = days === 0
  const isTomorrow = days === 1

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 32, height: 32, background: bg, border: `2px solid ${color}`, zIndex: 1 }}
        >
          <Icon style={{ width: 14, height: 14, color }} />
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 20, background: 'rgba(0,0,0,0.07)', marginTop: 2 }} />}
      </div>

      {/* Card */}
      <button
        onClick={() => onOpen(ev)}
        className="flex-1 mb-3 text-left rounded-xl border transition-all group cursor-pointer"
        style={{
          background: isToday ? `${color}08` : 'white',
          borderColor: isToday ? color : '#edf1f9',
          borderLeft: `3px solid ${color}`,
          padding: '10px 14px',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 14px ${color}22`; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ color, background: bg }}
              >
                {label}
              </span>
              {isToday && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ color: '#EA4335', background: 'rgba(234,67,53,0.1)' }}>
                  Hoy
                </span>
              )}
              {isTomorrow && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)' }}>
                  Mañana
                </span>
              )}
            </div>
            <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>{ev.desc}</p>
            {ev.grado && (
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                <Users style={{ display: 'inline', width: 11, height: 11, marginRight: 3 }} />
                {ev.grado}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{fmtDateShort(ev.date)}</span>
            <ChevronRight style={{ width: 14, height: 14, color: '#CBD5E1' }} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </button>
    </div>
  )
}

function EventDetail({ ev, onClose }) {
  if (!ev) return null
  const { color, bg, Icon, label } = ETYPES[ev.tipo]
  return (
    <div
      className="animate-scale-in rounded-2xl border p-5"
      style={{ background: `${color}06`, borderColor: `${color}30`, borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl p-2" style={{ background: bg }}>
            <Icon style={{ width: 18, height: 18, color }} />
          </div>
          <div>
            <span className="text-xs font-semibold" style={{ color }}>{label}</span>
            <p className="text-base font-bold" style={{ color: '#1E293B' }}>{ev.desc}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.06)', color: '#64748B' }}>
          Cerrar
        </button>
      </div>
      <div className="flex items-center gap-4 flex-wrap text-sm" style={{ color: '#475569' }}>
        <span className="flex items-center gap-1.5">
          <CalendarDays style={{ width: 14, height: 14 }} />
          {fmtDate(ev.date)}
        </span>
        {ev.grado && (
          <span className="flex items-center gap-1.5">
            <Users style={{ width: 14, height: 14 }} />
            {ev.grado}
          </span>
        )}
      </div>
      {ev.detail && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: '#475569' }}>{ev.detail}</p>
      )}
    </div>
  )
}

function GrupoCard({ g }) {
  const pct = g.asistencia
  const pctColor = pct >= 90 ? '#34A853' : pct >= 80 ? '#F59E0B' : '#EA4335'
  const total = g.evaluaciones.completadas + g.evaluaciones.pendientes

  return (
    <div
      className="rounded-2xl border bg-white transition-all"
      style={{ borderColor: '#edf1f9', padding: '16px' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,41,59,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-bold" style={{ color: '#1E293B' }}>{g.grado}</h4>
          <p className="text-xs" style={{ color: '#94A3B8' }}>{g.alumnos} alumnos</p>
        </div>
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 44, height: 44, background: `${pctColor}14`, border: `2px solid ${pctColor}` }}
        >
          <span className="text-sm font-bold" style={{ color: pctColor }}>{pct}%</span>
        </div>
      </div>

      {/* Attendance bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: '#64748B' }}>
          <span className="font-medium">Asistencia semanal</span>
          <span className="font-bold" style={{ color: pctColor }}>{pct}%</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 6, background: '#f1f3f4' }}>
          <div
            className="rounded-full transition-all"
            style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${pctColor}, ${pctColor}cc)` }}
          />
        </div>
      </div>

      {/* Evaluaciones */}
      <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl" style={{ background: 'rgba(66,133,244,0.05)' }}>
        <CheckCircle2 style={{ width: 15, height: 15, color: '#4285F4', flexShrink: 0 }} />
        <div className="flex-1">
          <div className="flex justify-between text-xs">
            <span style={{ color: '#475569', fontWeight: 500 }}>Evaluaciones</span>
            <span style={{ color: '#4285F4', fontWeight: 700 }}>{g.evaluaciones.completadas}/{total}</span>
          </div>
          <div className="rounded-full overflow-hidden mt-1" style={{ height: 4, background: '#dbeafe' }}>
            <div
              className="rounded-full"
              style={{ width: `${total > 0 ? (g.evaluaciones.completadas/total)*100 : 0}%`, height: '100%', background: '#4285F4' }}
            />
          </div>
        </div>
        {g.evaluaciones.pendientes > 0 && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#D97706' }}>
            {g.evaluaciones.pendientes} pend.
          </span>
        )}
      </div>

      {/* En riesgo */}
      {g.enRiesgo.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#EA4335' }}>
            <AlertTriangle style={{ width: 12, height: 12 }} />
            Alumnos en riesgo
          </p>
          <div className="space-y-1">
            {g.enRiesgo.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(234,67,53,0.05)', border: '1px solid rgba(234,67,53,0.12)' }}>
                <span className="text-xs font-medium" style={{ color: '#1E293B' }}>{a.nombre}</span>
                <span className="text-xs" style={{ color: '#EA4335' }}>{a.razon}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Destacados */}
      {g.destacados.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#34A853' }}>
            <Award style={{ width: 12, height: 12 }} />
            Participaciones destacadas
          </p>
          <div className="space-y-1">
            {g.destacados.map((d, i) => (
              <p key={i} className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(52,168,83,0.06)', color: '#1E293B' }}>
                {d}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TareaCard({ t }) {
  const isUrgente = t.prioridad === 'urgente'
  const today = new Date(); today.setHours(0,0,0,0)
  const limiteDate = addDays(today, t.limite)
  const daysLeft = t.limite
  const daysColor = daysLeft <= 3 ? '#EA4335' : daysLeft <= 7 ? '#F59E0B' : '#34A853'

  const CAT_LABELS = {
    planeacion: { label: 'Planeación', bg: 'rgba(66,133,244,0.1)', color: '#4285F4' },
    documento:  { label: 'Documento',  bg: 'rgba(234,67,53,0.1)',  color: '#EA4335' },
    proyecto:   { label: 'Proyecto',   bg: 'rgba(161,66,244,0.1)', color: '#A142F4' },
  }
  const catStyle = CAT_LABELS[t.cat]

  return (
    <div
      className="rounded-2xl border bg-white flex flex-col transition-all"
      style={{
        borderColor: isUrgente ? `${t.color}30` : '#edf1f9',
        borderTop: `3px solid ${t.color}`,
        padding: '14px',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 20px ${t.color}18`; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5 flex-shrink-0" style={{ background: `${t.color}12` }}>
            <t.icono style={{ width: 15, height: 15, color: t.color }} />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: catStyle.color, background: catStyle.bg }}>
            {catStyle.label}
          </span>
        </div>
        {isUrgente && (
          <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: '#EA4335', background: 'rgba(234,67,53,0.1)' }}>
            <Flame style={{ width: 10, height: 10 }} />
            Urgente
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold mb-1.5 flex-1" style={{ color: '#1E293B', lineHeight: 1.4 }}>{t.titulo}</p>
      <p className="text-xs mb-3" style={{ color: '#64748B', lineHeight: 1.5 }}>{t.desc}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto gap-2">
        <span className="flex items-center gap-1 text-xs" style={{ color: daysColor }}>
          <Clock style={{ width: 12, height: 12 }} />
          <span className="font-semibold">{daysLeft === 0 ? 'Hoy' : daysLeft === 1 ? 'Mañana' : `${daysLeft} días`}</span>
          <span style={{ opacity: 0.7 }}>· {fmtDateShort(limiteDate)}</span>
        </span>
        <button
          className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all cursor-pointer"
          style={{ background: `${t.color}12`, color: t.color, border: `1px solid ${t.color}25` }}
          onMouseEnter={e => { e.currentTarget.style.background = t.color; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.background = `${t.color}12`; e.currentTarget.style.color = t.color }}
        >
          {t.accion}
          <ChevronRight style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  )
}

/* ─────────── main component ─────────── */
const TABS = [
  { key: 'eventos',  label: 'Próximos Eventos',  Icon: CalendarDays,   color: '#4285F4' },
  { key: 'semanal',  label: 'Resumen Semanal',    Icon: BarChart3,      color: '#34A853' },
  { key: 'tareas',   label: 'Tareas & Proyectos', Icon: CheckSquare,    color: '#A142F4' },
]

export default function DashboardTabs({ docenteId }) {
  const [activeTab, setActiveTab] = useState('eventos')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [events, setEvents] = useState([])
  const [weeklyStats, setWeeklyStats] = useState(null)
  const [grupos, setGrupos] = useState([])
  const active = TABS.find(t => t.key === activeTab)

  useEffect(() => {
    const loadEventos = async () => {
      if (!docenteId) {
        setEvents([])
        return
      }
      try {
        const now = new Date()
        const items = await api.getEventos(docenteId, now.getMonth() + 1, now.getFullYear())
        const mapped = (Array.isArray(items) ? items : []).map((ev, idx) => {
          const date = new Date(ev.fecha)
          const tipo = ['evaluacion', 'entrega', 'reunion', 'festivo', 'capacitacion'].includes(ev.tipo)
            ? ev.tipo
            : 'entrega'
          return {
            id: ev.id || `ev-${idx}`,
            date,
            tipo,
            desc: ev.titulo || ev.descripcion || 'Evento escolar',
            grado: ev.participantes || null,
            detail: ev.descripcion || '',
          }
        }).sort((a, b) => a.date - b.date)

        setEvents(mapped)
      } catch (err) {
        console.error('DashboardTabs eventos fallback:', err)
        setEvents(buildEvents())
      }
    }

    void loadEventos()
  }, [docenteId])

  useEffect(() => {
    const loadWeekly = async () => {
      if (!docenteId) {
        setWeeklyStats(null)
        setGrupos([])
        return
      }

      try {
        const [statsSemanal, alumnos] = await Promise.all([
          api.getStatsSemanal(docenteId),
          api.getAlumnos(docenteId),
        ])

        setWeeklyStats(statsSemanal)

        const alumnosList = Array.isArray(alumnos) ? alumnos : []
        const grouped = alumnosList.reduce((acc, a) => {
          const key = `${a.grado || 1}°${a.grupo || 'Único'}`
          if (!acc[key]) {
            acc[key] = {
              id: key,
              grado: key,
              alumnos: 0,
              asistencia: Number(statsSemanal?.asistencia?.pct || 0),
              asistenciaIcon: Number(statsSemanal?.asistencia?.pct || 0) >= 85 ? TrendingUp : TrendingDown,
              asistenciaColor: Number(statsSemanal?.asistencia?.pct || 0) >= 85 ? '#34A853' : '#EA4335',
              enRiesgo: [],
              evaluaciones: {
                completadas: Number(statsSemanal?.evaluaciones?.completadas || 0),
                pendientes: 0,
              },
              destacados: [],
            }
          }
          acc[key].alumnos += 1
          return acc
        }, {})

        const riesgo = Array.isArray(statsSemanal?.alumnosEnRiesgo) ? statsSemanal.alumnosEnRiesgo : []
        const riskIndex = new Map(riesgo.map((r) => [r.nombre, r.razon]))
        alumnosList.forEach((a) => {
          const key = `${a.grado || 1}°${a.grupo || 'Único'}`
          const razon = riskIndex.get(a.nombre)
          if (razon && grouped[key]) {
            grouped[key].enRiesgo.push({ nombre: a.nombre, razon })
          }
        })

        const groupedArr = Object.values(grouped)
        setGrupos(groupedArr)
      } catch (err) {
        console.error('DashboardTabs semanal fallback:', err)
        setWeeklyStats(null)
        setGrupos(GRUPOS)
      }
    }

    void loadWeekly()
  }, [docenteId])

  const resumen = useMemo(() => {
    if (!weeklyStats) {
      return {
        totalAlumnos: grupos.reduce((s, g) => s + g.alumnos, 0),
        asistenciaPromedio: Math.round(grupos.reduce((s, g) => s + g.asistencia, 0) / Math.max(grupos.length, 1)),
        enRiesgo: grupos.reduce((s, g) => s + g.enRiesgo.length, 0),
        evalCompletadas: grupos.reduce((s, g) => s + g.evaluaciones.completadas, 0),
      }
    }

    return {
      totalAlumnos: grupos.reduce((s, g) => s + g.alumnos, 0),
      asistenciaPromedio: Number(weeklyStats?.asistencia?.pct || 0),
      enRiesgo: Array.isArray(weeklyStats?.alumnosEnRiesgo) ? weeklyStats.alumnosEnRiesgo.length : 0,
      evalCompletadas: Number(weeklyStats?.evaluaciones?.completadas || 0),
    }
  }, [weeklyStats, grupos])

  return (
    <div
      className="rounded-2xl overflow-hidden mt-5 animate-slide-up"
      style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 4px 12px rgba(30,41,59,0.06), 0 1px 3px rgba(30,41,59,0.04)',
      }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center gap-0 border-b overflow-x-auto"
        style={{ borderColor: '#edf1f9', background: 'rgba(248,250,255,0.7)' }}
      >
        {TABS.map(({ key, label, Icon, color }) => {
          const isActive = key === activeTab
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSelectedEvent(null) }}
              className="relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0"
              style={{
                color: isActive ? color : '#64748B',
                background: isActive ? `${color}08` : 'transparent',
                borderBottom: isActive ? `2.5px solid ${color}` : '2.5px solid transparent',
                borderRight: 'none', borderLeft: 'none', borderTop: 'none',
                outline: 'none',
              }}
            >
              <Icon style={{ width: 16, height: 16 }} />
              {label}
              {key === 'eventos' && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold" style={{ background: `${color}18`, color }}>
                  {events.length}
                </span>
              )}
              {key === 'tareas' && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold" style={{ background: 'rgba(234,67,53,0.12)', color: '#EA4335' }}>
                  {TAREAS.filter(t => t.prioridad === 'urgente').length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="p-5">

        {/* ── TAB 1: Próximos Eventos ── */}
        {activeTab === 'eventos' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold" style={{ color: '#1E293B' }}>Próximos 14 días</h3>
                <p className="text-sm" style={{ color: '#64748B' }}>{events.length} eventos programados</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(ETYPES).map(([key, { color, label }]) => (
                  <span key={key} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: `${color}10`, color }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {selectedEvent && (
              <div className="mb-4">
                <EventDetail ev={selectedEvent} onClose={() => setSelectedEvent(null)} />
              </div>
            )}

            <div>
              {events.length === 0 ? (
                <div className="rounded-xl border p-6 text-center" style={{ borderColor: '#edf1f9', background: '#fff' }}>
                  <CalendarDays className="mx-auto mb-2" style={{ width: 20, height: 20, color: '#94A3B8' }} />
                  <p className="text-sm font-semibold" style={{ color: '#475569' }}>Sin eventos programados</p>
                  <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>No hay eventos para el periodo consultado.</p>
                </div>
              ) : (
                events.map((ev, idx) => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    isLast={idx === events.length - 1}
                    onOpen={(e) => setSelectedEvent(prev => prev?.id === e.id ? null : e)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: Resumen Semanal ── */}
        {activeTab === 'semanal' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold" style={{ color: '#1E293B' }}>Resumen de la semana</h3>
                <p className="text-sm" style={{ color: '#64748B' }}>Datos basados en bitácora y asistencia registrada</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(52,168,83,0.1)', color: '#34A853', fontWeight: 600 }}>
                <Bell style={{ width: 12, height: 12 }} />
                Actualizado hoy
              </span>
            </div>

            {/* Summary banner */}
            <div
              className="grid gap-4 mb-5"
              style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
            >
              {[
                { label: 'Total alumnos', value: resumen.totalAlumnos, color: '#4285F4', Icon: Users },
                { label: 'Asistencia promedio', value: `${resumen.asistenciaPromedio}%`, color: '#34A853', Icon: TrendingUp },
                { label: 'En riesgo', value: resumen.enRiesgo, color: '#EA4335', Icon: AlertTriangle },
                { label: 'Evals. completadas', value: resumen.evalCompletadas, color: '#A142F4', Icon: CheckCircle2 },
              ].map(({ label, value, color, Icon: Ic }) => (
                <div key={label} className="rounded-xl p-3 flex items-center gap-3" style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                  <div className="rounded-xl p-2 flex-shrink-0" style={{ background: `${color}18` }}>
                    <Ic style={{ width: 18, height: 18, color }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
            >
              {grupos.length === 0 ? (
                <div className="rounded-xl border p-6 text-center" style={{ borderColor: '#edf1f9', background: '#fff', gridColumn: '1 / -1' }}>
                  <Users className="mx-auto mb-2" style={{ width: 20, height: 20, color: '#94A3B8' }} />
                  <p className="text-sm font-semibold" style={{ color: '#475569' }}>Sin datos semanales</p>
                  <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>No hay alumnos o registros para construir el resumen.</p>
                </div>
              ) : (
                grupos.map(g => <GrupoCard key={g.id} g={g} />)
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: Tareas & Proyectos ── */}
        {activeTab === 'tareas' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold" style={{ color: '#1E293B' }}>Tareas & Proyectos pendientes</h3>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  {TAREAS.filter(t => t.prioridad === 'urgente').length} urgentes · {TAREAS.filter(t => t.prioridad === 'normal').length} normales
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-semibold" style={{ background: 'rgba(234,67,53,0.1)', color: '#EA4335' }}>
                  <Flame style={{ width: 12, height: 12 }} />
                  {TAREAS.filter(t => t.prioridad === 'urgente').length} urgentes
                </span>
              </div>
            </div>

            {/* Urgentes first */}
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#EA4335' }}>
                <Flame style={{ width: 13, height: 13 }} />
                Urgentes
              </p>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
                {TAREAS.filter(t => t.prioridad === 'urgente').map(t => <TareaCard key={t.id} t={t} />)}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#64748B' }}>
                <ClipboardList style={{ width: 13, height: 13 }} />
                Próximas tareas
              </p>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
                {TAREAS.filter(t => t.prioridad === 'normal').map(t => <TareaCard key={t.id} t={t} />)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
