import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'
import {
  BookOpen, Calendar as CalendarIcon, Users, GraduationCap,
  FileText, MessageSquare, Clock, ChevronRight, Sparkles, AlertCircle
} from 'lucide-react'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_SEMANA_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const MATERIA_COLORS = {
  'Español': '#3b82f6',
  'Matemáticas': '#8b5cf6',
  'Ciencias': '#10b981',
  'Geografía': '#f59e0b',
  'Historia': '#ef4444',
  'Formación Cívica y Ética': '#ec4899',
  'Educación Artística': '#a855f7',
  'Educación Física': '#06b6d4',
  'Tecnología': '#6366f1',
  'Lo Humano y lo Comunitario': '#f97316'
}

function Calendar({ currentDate, selectedDate, docenteId, onDayClick }) {
  const [planeaciones, setPlaneaciones] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!docenteId) return
    setLoading(true)
    const mes = currentDate.getMonth() + 1
    const anio = currentDate.getFullYear()

    Promise.all([
      api.getPlaneaciones(docenteId, mes, anio),
      api.getEventos(docenteId, mes, anio)
    ]).then(([p, e]) => {
      setPlaneaciones(p)
      setEventos(e)
    }).finally(() => {
      setTimeout(() => setLoading(false), 400)
    })
  }, [currentDate, docenteId])

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false })
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }
    return days
  }, [currentDate])

  // Current week: 7 day cards
  const currentWeek = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      return d
    })
  }, [])

  const getDayPlaneaciones = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return planeaciones.filter(p => p.fecha === dateStr)
  }

  const getDayEventos = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return eventos.filter(e => e.fecha === dateStr)
  }

  const formatDate = (date) => date.toISOString().split('T')[0]
  const isToday = (date) => formatDate(date) === formatDate(new Date())
  const isSelected = (date) => formatDate(date) === formatDate(selectedDate)
  const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6

  // Today progress (how far through the school day we are)
  const todayProgress = useMemo(() => {
    const now = new Date()
    const schoolStart = new Date(now)
    schoolStart.setHours(8, 0, 0, 0)
    const schoolEnd = new Date(now)
    schoolEnd.setHours(15, 0, 0, 0)
    const total = schoolEnd - schoolStart
    const elapsed = now - schoolStart
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ===== CURRENT WEEK — Large Cards ===== */}
      <section className="glass rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 via-neon-purple/5 to-neon-pink/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-neon-blue/40 to-transparent" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neon-blue" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Semana en curso</h2>
          </div>
          {/* Today progress bar */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{Math.round(todayProgress)}% del día escolar</span>
            <div className="w-20 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full transition-all duration-1000"
                style={{ width: `${todayProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Week cards — 7 columns */}
        <div className="relative grid grid-cols-7 gap-2 sm:gap-3">
          {currentWeek.map((date, idx) => {
            const dayPlanes = getDayPlaneaciones(date)
            const dayEvents = getDayEventos(date)
            const today = isToday(date)
            const selected = isSelected(date)
            const weekend = isWeekend(date)
            const dayNum = date.getDate()
            const dayName = DIAS_SEMANA[date.getDay()]

            return (
              <button
                key={idx}
                onClick={() => onDayClick(date)}
                className={`
                  group relative rounded-xl border p-3 text-left transition-all duration-200
                  min-h-[180px] sm:min-h-[200px] flex flex-col
                  ${today
                    ? 'border-neon-blue/50 bg-neon-blue/8 shadow-[0_0_30px_rgba(0,212,255,0.15)]'
                    : selected
                      ? 'border-neon-purple/50 bg-neon-purple/8 shadow-[0_0_30px_rgba(180,74,255,0.15)]'
                      : weekend
                        ? 'border-white/5 bg-red-500/[0.03] hover:border-red-500/20'
                        : 'border-white/8 bg-white/[0.02] hover:border-neon-blue/30 hover:bg-white/[0.04]'
                  }
                  hover:scale-[1.03] hover:z-10 hover:shadow-lg
                `}
              >
                {/* Date header */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${
                    today ? 'text-neon-blue' : selected ? 'text-neon-purple' : 'text-gray-500'
                  }`}>
                    {dayName}
                  </span>
                  <span className={`text-lg font-bold ${
                    today ? 'text-neon-blue' : selected ? 'text-neon-purple' : 'text-gray-300'
                  }`}>
                    {dayNum}
                  </span>
                </div>

                {/* Today pulsing dot */}
                {today && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
                )}

                {/* Content */}
                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayPlanes.length === 0 && dayEvents.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[10px] text-gray-600 italic">Sin actividades</span>
                    </div>
                  ) : (
                    <>
                      {/* Subjects as colored bars */}
                      {dayPlanes.slice(0, 4).map((p, i) => {
                        const color = MATERIA_COLORS[p.materia] || '#6b7280'
                        return (
                          <div key={i} className="flex items-center gap-1.5 group/item">
                            <div
                              className="w-1 h-5 rounded-full flex-shrink-0 transition-all group-hover/item:h-6"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-[10px] text-gray-400 truncate leading-tight">
                              {p.materia}
                            </span>
                          </div>
                        )
                      })}
                      {dayPlanes.length > 4 && (
                        <span className="text-[10px] text-neon-blue/60">+{dayPlanes.length - 4} más</span>
                      )}

                      {/* Event dots */}
                      {dayEvents.map((ev, i) => (
                        <div key={`ev-${i}`} className="flex items-center gap-1 text-purple-400/70">
                          <CalendarIcon className="w-2.5 h-2.5" />
                          <span className="text-[10px] truncate">{ev.titulo}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Bottom summary */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                  {dayPlanes.length > 0 && (
                    <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
                      <BookOpen className="w-2.5 h-2.5" />
                      {dayPlanes.length}
                    </span>
                  )}
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
                      <CalendarIcon className="w-2.5 h-2.5" />
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Hover arrow */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-3 h-3 text-neon-blue" />
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ===== MONTH GRID ===== */}
      <section className="glass rounded-2xl p-4 sm:p-5">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {DIAS_SEMANA.map((dia, i) => (
            <div key={dia} className={`text-center py-2 text-xs font-semibold ${
              i === 0 || i === 6 ? 'text-red-400/60' : 'text-gray-500'
            }`}>
              {dia}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {loading
            ? Array.from({ length: 42 }, (_, i) => (
                <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] min-h-[70px] sm:min-h-[85px] shimmer" />
              ))
            : calendarDays.map((day, idx) => {
                const dayPlanes = getDayPlaneaciones(day.date)
                const dayEvents = getDayEventos(day.date)
                const today = isToday(day.date)
                const selected = isSelected(day.date)
                const weekend = isWeekend(day.date)

                return (
                  <button
                    key={idx}
                    onClick={() => onDayClick(day.date)}
                    className={`
                      relative p-2 sm:p-2.5 rounded-lg border transition-all min-h-[70px] sm:min-h-[85px] text-left
                      ${!day.isCurrentMonth ? 'opacity-15 pointer-events-none' : ''}
                      ${today
                        ? 'border-neon-blue/40 bg-neon-blue/5'
                        : selected
                          ? 'border-neon-purple/40 bg-neon-purple/5'
                          : weekend
                            ? 'border-white/5 bg-red-500/[0.02]'
                            : 'border-white/5 hover:border-white/15 hover:bg-white/[0.02]'
                      }
                      hover:z-10
                    `}
                  >
                    <div className={`text-sm font-semibold mb-1 ${
                      today ? 'text-neon-blue' : selected ? 'text-neon-purple' : 'text-gray-400'
                    }`}>
                      {day.date.getDate()}
                    </div>

                    {/* Indicator dots */}
                    <div className="flex flex-wrap gap-0.5">
                      {dayPlanes.length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue/70" />
                      )}
                      {dayEvents.length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400/70" />
                      )}
                    </div>

                    {/* Subject abbreviations */}
                    <div className="mt-0.5 space-y-px">
                      {dayPlanes.slice(0, 2).map((p, i) => (
                        <div key={i} className="text-[8px] text-gray-600 truncate leading-none">
                          {p.materia?.substring(0, 8)}
                        </div>
                      ))}
                      {dayPlanes.length > 2 && (
                        <div className="text-[8px] text-neon-blue/40">+{dayPlanes.length - 2}</div>
                      )}
                    </div>

                    {today && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" />
                    )}
                  </button>
                )
              })
          }
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-neon-blue/70" />
            Planeaciones
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-purple-400/70" />
            Eventos
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full border border-neon-blue/60" />
            Hoy
          </div>
        </div>
      </section>
    </div>
  )
}

export default Calendar
