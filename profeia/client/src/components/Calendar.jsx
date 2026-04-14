import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'
import {
  BookOpen, Calendar as CalendarIcon, Clock, Sparkles, ChevronRight
} from 'lucide-react'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const MATERIA_COLORS = {
  'Español': '#4285F4',
  'Matemáticas': '#A142F4',
  'Ciencias': '#34A853',
  'Geografía': '#FBBC04',
  'Historia': '#EA4335',
  'Formación Cívica y Ética': '#FF6B9D',
  'Educación Artística': '#A142F4',
  'Educación Física': '#06B6D4',
  'Tecnología': '#6366F1',
  'Lo Humano y lo Comunitario': '#F97316'
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
      setTimeout(() => setLoading(false), 300)
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

  const todayProgress = useMemo(() => {
    const now = new Date()
    const schoolStart = new Date(now); schoolStart.setHours(8, 0, 0, 0)
    const schoolEnd = new Date(now); schoolEnd.setHours(15, 0, 0, 0)
    const total = schoolEnd - schoolStart
    const elapsed = now - schoolStart
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }, [])

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ===== CURRENT WEEK — Vibrant Cards ===== */}
      <section className="glass-card-elevated rounded-2xl p-5 relative overflow-hidden">
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#A142F4] to-[#FF6B9D] opacity-60" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#4285F4]" />
            <h2 className="text-sm font-semibold text-[#5f6368] uppercase tracking-wider">Semana en curso</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#9aa0a6]">
            <Clock className="w-3.5 h-3.5" />
            <span>{Math.round(todayProgress)}% del día escolar</span>
            <div className="w-20 progress-bar">
              <div className="progress-bar-fill" style={{ width: `${todayProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Week Cards Grid */}
        <div className="grid grid-cols-7 gap-2.5 sm:gap-3">
          {currentWeek.map((date, idx) => {
            const dayPlanes = getDayPlaneaciones(date)
            const dayEvents = getDayEventos(date)
            const today = isToday(date)
            const selected = isSelected(date)
            const weekend = isWeekend(date)
            const dayName = DIAS_SEMANA[date.getDay()]
            const dayNum = date.getDate()

            return (
              <button
                key={idx}
                onClick={() => onDayClick(date)}
                className={`week-card ${today ? 'today' : ''} ${selected && !today ? 'selected' : ''} ${weekend ? 'weekend' : ''}`}
              >
                {/* Date header */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold ${
                    today ? 'text-[#4285F4]' : selected ? 'text-[#A142F4]' : 'text-[#9aa0a6]'
                  }`}>
                    {dayName}
                  </span>
                  <span className={`text-2xl font-extrabold ${
                    today ? 'text-[#4285F4]' : selected ? 'text-[#A142F4]' : 'text-[#202124]'
                  }`}>
                    {dayNum}
                  </span>
                </div>

                {/* Pulse dot for today */}
                {today && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#4285F4] animate-pulse" />
                )}

                {/* Content */}
                <div className="flex-1 space-y-1.5 overflow-hidden">
                  {dayPlanes.length === 0 && dayEvents.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-4">
                      <span className="text-[11px] text-[#9aa0a6] italic">Sin actividades</span>
                    </div>
                  ) : (
                    <>
                      {/* Subject bars */}
                      {dayPlanes.slice(0, 4).map((p, i) => {
                        const color = MATERIA_COLORS[p.materia] || '#9aa0a6'
                        return (
                          <div key={i} className="flex items-center gap-2 group/item">
                            <div
                              className="subject-bar"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-[11px] text-[#5f6368] truncate group-hover/item:font-medium transition-all">
                              {p.materia}
                            </span>
                          </div>
                        )
                      })}
                      {dayPlanes.length > 4 && (
                        <span className="text-[11px] text-[#4285F4]/70 font-medium">+{dayPlanes.length - 4} más</span>
                      )}

                      {/* Events */}
                      {dayEvents.map((ev, i) => (
                        <div key={`ev-${i}`} className="flex items-center gap-1.5 text-[#A142F4]/70">
                          <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="text-[10px] truncate">{ev.titulo}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Bottom */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#f1f3f4]">
                  <div className="flex items-center gap-2">
                    {dayPlanes.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#4285F4] font-medium">
                        <BookOpen className="w-3 h-3" />
                        {dayPlanes.length}
                      </span>
                    )}
                    {dayEvents.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#A142F4] font-medium">
                        <CalendarIcon className="w-3 h-3" />
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ===== MONTH GRID — Clean White ===== */}
      <section className="glass-card rounded-2xl p-5">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DIAS_SEMANA.map((dia, i) => (
            <div key={dia} className={`text-center py-2 text-xs font-semibold ${
              i === 0 || i === 6 ? 'text-[#EA4335]/60' : 'text-[#9aa0a6]'
            }`}>
              {dia}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {loading
            ? Array.from({ length: 42 }, (_, i) => (
                <div key={i} className="skeleton min-h-[85px]" />
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
                    className={`calendar-cell-month ${
                      !day.isCurrentMonth ? 'other-month' : ''
                    } ${today ? 'today' : ''} ${selected && !today ? 'selected' : ''} ${
                      weekend && day.isCurrentMonth ? 'weekend' : ''
                    }`}
                  >
                    <div className={`text-sm font-bold mb-1.5 ${
                      today ? 'text-[#4285F4]' : selected ? 'text-[#A142F4]' : 'text-[#202124]'
                    }`}>
                      {day.date.getDate()}
                    </div>

                    {/* Color dots */}
                    <div className="flex flex-wrap gap-1">
                      {dayPlanes.length > 0 && (
                        <div className="activity-dot-blue" />
                      )}
                      {dayEvents.length > 0 && (
                        <div className="activity-dot-purple" />
                      )}
                    </div>

                    {/* Subject names */}
                    <div className="mt-1 space-y-px">
                      {dayPlanes.slice(0, 2).map((p, i) => {
                        const color = MATERIA_COLORS[p.materia] || '#9aa0a6'
                        return (
                          <div key={i} className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[9px] text-[#9aa0a6] truncate leading-none">{p.materia?.substring(0, 10)}</span>
                          </div>
                        )
                      })}
                      {dayPlanes.length > 2 && (
                        <div className="text-[9px] text-[#4285F4]/60 font-medium">+{dayPlanes.length - 2}</div>
                      )}
                    </div>

                    {today && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#4285F4] animate-pulse" />
                    )}
                  </button>
                )
              })
          }
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-[#f1f3f4]">
          <div className="flex items-center gap-1.5 text-xs text-[#5f6368]">
            <div className="activity-dot-blue" />
            Planeaciones
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#5f6368]">
            <div className="activity-dot-purple" />
            Eventos
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#5f6368]">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-[#4285F4]" />
            Hoy
          </div>
        </div>
      </section>
    </div>
  )
}

export default Calendar
