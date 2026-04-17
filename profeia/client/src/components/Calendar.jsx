import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'
import {
  BookOpen, Calendar as CalendarIcon, Clock, Sparkles, ChevronRight, ChevronLeft
} from 'lucide-react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Monday–Friday only — Telesecundaria no trabaja sábado ni domingo
const DIAS_LABORALES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

// Per-day accent colors: Lun=blue, Mar=green, Mié=orange/amber, Jue=purple, Vie=red
const DIA_COLORS = ['#4285F4', '#34A853', '#F59E0B', '#A142F4', '#EA4335']

const CAMPO_COLORS = {
  'Lenguajes': '#4285F4',
  'Saberes y Pensamiento Científico': '#34A853',
  'Ética, Naturaleza y Sociedades': '#EA4335',
  'De lo Humano y lo Comunitario': '#F59E0B',
}

const MATERIA_CAMPO = {
  'Español': 'Lenguajes', 'Inglés': 'Lenguajes', 'Artes': 'Lenguajes',
  'Matemáticas': 'Saberes y Pensamiento Científico',
  'Ciencias': 'Saberes y Pensamiento Científico',
  'Biología': 'Saberes y Pensamiento Científico',
  'Física': 'Saberes y Pensamiento Científico',
  'Química': 'Saberes y Pensamiento Científico',
  'Historia': 'Ética, Naturaleza y Sociedades',
  'Geografía': 'Ética, Naturaleza y Sociedades',
  'Formación Cívica y Ética': 'Ética, Naturaleza y Sociedades',
  'Educación Física': 'De lo Humano y lo Comunitario',
  'Taller': 'De lo Humano y lo Comunitario',
  'Educación Socioemocional': 'De lo Humano y lo Comunitario',
  'Vida Saludable': 'De lo Humano y lo Comunitario',
  'Lo Humano y lo Comunitario': 'De lo Humano y lo Comunitario',
  'Educación Artística': 'Lenguajes',
  'Tecnología': 'De lo Humano y lo Comunitario',
}

const MATERIA_COLORS = Object.fromEntries(
  Object.entries(MATERIA_CAMPO).map(([m, c]) => [m, CAMPO_COLORS[c] || '#9aa0a6'])
)

const isWeekday = (date) => date.getDay() !== 0 && date.getDay() !== 6
const formatDate = (date) => date.toISOString().split('T')[0]

function Calendar({ currentDate, selectedDate, docenteId, onDayClick, onPrevMonth, onNextMonth, onToday }) {
  const [planeaciones, setPlaneaciones] = useState([])
  const [eventos, setEventos] = useState([])
  const [evaluaciones, setEvaluaciones] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!docenteId) { setLoading(false); return }
    setLoading(true)
    const mes = currentDate.getMonth() + 1
    const anio = currentDate.getFullYear()
    Promise.all([
      api.getPlaneaciones(docenteId, mes, anio),
      api.getEventos(docenteId, mes, anio),
      api.getEvaluaciones(docenteId, { mes, anio })
    ]).then(([p, e, ev]) => {
      setPlaneaciones(Array.isArray(p) ? p : [])
      setEventos(Array.isArray(e) ? e : [])
      setEvaluaciones(Array.isArray(ev) ? ev : [])
    }).catch(() => {
      // backend not available — calendar shows empty state
    }).finally(() => setTimeout(() => setLoading(false), 300))
  }, [currentDate, docenteId])

  // Monday–Friday days for the current week
  const currentWeek = useMemo(() => {
    const today = new Date()
    const dow = today.getDay()
    const toMonday = dow === 0 ? -6 : 1 - dow
    const monday = new Date(today)
    monday.setDate(today.getDate() + toMonday)
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }, [])

  // Full month grid — Monday–Friday columns only
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstOfMonth = new Date(year, month, 1)
    const lastOfMonth  = new Date(year, month + 1, 0)

    // Offset to Monday of the week containing the 1st
    const dow = firstOfMonth.getDay()
    const toMonday = dow === 0 ? -6 : 1 - dow
    const start = new Date(year, month, 1 + toMonday)

    // End: Friday of the week containing the last of the month
    const lastDow = lastOfMonth.getDay()
    let toFriday
    if (lastDow === 0)      toFriday = -2  // Sunday → Friday two days prior
    else if (lastDow === 6) toFriday = -1  // Saturday → Friday one day prior
    else                    toFriday = 5 - lastDow
    const end = new Date(lastOfMonth.getTime() + toFriday * 86400000)

    const days = []
    const cur = new Date(start)
    while (cur <= end) {
      if (isWeekday(cur)) {
        days.push({ date: new Date(cur), isCurrentMonth: cur.getMonth() === month })
      }
      cur.setDate(cur.getDate() + 1)
    }
    return days
  }, [currentDate])

  const getDayPlaneaciones  = (date) => { const s = formatDate(date); return planeaciones.filter(p => p.fecha === s) }
  const getDayEventos       = (date) => { const s = formatDate(date); return eventos.filter(e => e.fecha === s) }
  const getDayEvaluaciones  = (date) => { const s = formatDate(date); return evaluaciones.filter(e => e.fecha === s) }
  const getCampoDots        = (planes) => {
    const set = new Set(planes.map(p => MATERIA_CAMPO[p.materia] || 'Lenguajes'))
    return Array.from(set).map(c => ({ campo: c, color: CAMPO_COLORS[c] || '#9aa0a6' }))
  }

  const isToday    = (date) => formatDate(date) === formatDate(new Date())
  const isSelected = (date) => formatDate(date) === formatDate(selectedDate)

  const todayProgress = useMemo(() => {
    const now = new Date()
    const s = new Date(now); s.setHours(8, 0, 0, 0)
    const e = new Date(now); e.setHours(15, 0, 0, 0)
    return Math.min(100, Math.max(0, (now - s) / (e - s) * 100))
  }, [])

  // Inline grid style — bypasses any Tailwind purge issues, guarantees 5 equal columns
  const GRID_5 = { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }

  return (
    <div className="space-y-3 animate-fade-in">

      {/* ===== SEMANA EN CURSO — 5 cards Lun-Vie ===== */}
      <section
        className="glass-card-elevated rounded-2xl p-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 55%, #fdf8ff 100%)', borderLeft: '4px solid #4285F4' }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#A142F4] to-[#FF6B9D] opacity-60" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#4285F4]" />
            <h2 className="text-xs font-bold text-[#4285F4] uppercase tracking-wider">Semana en curso</h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#9aa0a6]">
            <Clock className="w-3 h-3" />
            <span>{Math.round(todayProgress)}% del día</span>
            <div className="w-16 progress-bar">
              <div className="progress-bar-fill" style={{ width: `${todayProgress}%` }} />
            </div>
          </div>
        </div>

        {/* 5-column grid — inline style guarantees equal columns regardless of Tailwind */}
        <div style={{ ...GRID_5, gap: '8px' }}>
          {currentWeek.map((date, idx) => {
            const dayPlanes = getDayPlaneaciones(date)
            const dayEvents = getDayEventos(date)
            const today    = isToday(date)
            const selected = isSelected(date)

            return (
              <button
                key={idx}
                onClick={() => onDayClick(date)}
                className={`week-card ${today ? 'today' : ''} ${selected && !today ? 'selected' : ''}`}
                style={{ '--dayColor': DIA_COLORS[idx], minHeight: 110 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DIA_COLORS[idx] }}>
                    {DIAS_LABORALES[idx]}
                  </span>
                  <span
                    className="w-8 h-8 flex items-center justify-center text-[14px] font-bold rounded-full transition-all"
                    style={today
                      ? { background: '#4285F4', color: '#fff', boxShadow: '0 2px 8px rgba(66,133,244,0.38)' }
                      : selected
                        ? { background: '#A142F4', color: '#fff', boxShadow: '0 2px 8px rgba(161,66,244,0.32)' }
                        : { color: '#3c4043' }
                    }
                  >
                    {date.getDate()}
                  </span>
                </div>

                {today && <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#4285F4] animate-pulse" />}

                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayPlanes.length === 0 && dayEvents.length === 0 ? (
                    <div className="flex items-center justify-center py-3">
                      <span className="text-[10px] text-[#9aa0a6] italic">Libre</span>
                    </div>
                  ) : (
                    <>
                      {dayPlanes.slice(0, 3).map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="subject-bar" style={{ height: 16, backgroundColor: MATERIA_COLORS[p.materia] || '#9aa0a6' }} />
                          <span className="text-[10px] text-[#5f6368] truncate">{p.materia}</span>
                        </div>
                      ))}
                      {dayPlanes.length > 3 && (
                        <span className="text-[10px] text-[#4285F4]/70">+{dayPlanes.length - 3}</span>
                      )}
                      {dayEvents.map((ev, i) => (
                        <div key={`ev-${i}`} className="flex items-center gap-1 text-[#A142F4]/70">
                          <CalendarIcon className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="text-[9px] truncate">{ev.titulo}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f1f3f4]">
                  <div className="flex items-center gap-1.5">
                    {dayPlanes.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-[#4285F4] font-medium">
                        <BookOpen className="w-2.5 h-2.5" />{dayPlanes.length}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-3 h-3 text-[#9aa0a6] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ===== MONTH NAVIGATOR — between week cards and monthly grid ===== */}
      <div className="month-nav">
        <button className="month-nav-btn" onClick={onPrevMonth} aria-label="Mes anterior">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="month-nav-label">
          {MESES[currentDate.getMonth()]}{' '}
          <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: 15 }}>{currentDate.getFullYear()}</span>
        </span>
        <button className="month-nav-btn" onClick={onNextMonth} aria-label="Mes siguiente">
          <ChevronRight className="w-5 h-5" />
        </button>
        <button className="month-nav-hoy" onClick={onToday}>Hoy</button>
      </div>

      {/* ===== GRID MENSUAL — 5 columnas Lun-Vie ===== */}
      <section
        className="glass-card rounded-2xl p-4"
        style={{ background: 'linear-gradient(135deg, #fafbff 0%, #ffffff 60%, #fdf8ff 100%)', borderLeft: '4px solid #34A853' }}
      >
        {/* Day headers — per-day color */}
        <div className="mb-1.5" style={{ ...GRID_5, gap: '4px' }}>
          {DIAS_LABORALES.map((dia, dIdx) => (
            <div
              key={dia}
              className="text-center py-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: DIA_COLORS[dIdx] }}
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Grid — inline style guarantees 5 equal columns */}
        <div style={{ ...GRID_5, gap: '4px' }}>
          {loading
            ? Array.from({ length: 25 }, (_, i) => (
                <div key={i} className="skeleton" style={{ minHeight: 60 }} />
              ))
            : calendarDays.map((day, idx) => {
                const dayPlanes = getDayPlaneaciones(day.date)
                const dayEvents = getDayEventos(day.date)
                const dayEvals  = getDayEvaluaciones(day.date)
                const today    = isToday(day.date)
                const selected = isSelected(day.date)
                const campoDots = getCampoDots(dayPlanes)
                const rowIsOdd = Math.floor(idx / 5) % 2 === 1

                return (
                  <button
                    key={idx}
                    onClick={() => onDayClick(day.date)}
                    className={`calendar-cell-month ${!day.isCurrentMonth ? 'other-month' : ''} ${today ? 'today' : ''} ${selected && !today ? 'selected' : ''} ${!today && !selected && rowIsOdd ? 'cal-row-odd' : ''}`}
                    style={{ minHeight: 88, padding: '6px' }}
                  >
                    <div
                      className="w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded-full mb-1"
                      style={today
                        ? { background: '#4285F4', color: '#fff' }
                        : selected
                          ? { background: '#A142F4', color: '#fff' }
                          : { color: '#3c4043' }
                      }
                    >
                      {day.date.getDate()}
                    </div>

                    <div className="flex flex-wrap gap-[3px] mb-0.5">
                      {campoDots.map(({ campo, color }) => (
                        <div key={campo} style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: color }} />
                      ))}
                      {dayEvents.length > 0 && (
                        <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#A142F4' }} />
                      )}
                      {dayEvals.length > 0 && (
                        <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                      )}
                    </div>

                    {dayPlanes.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: MATERIA_COLORS[dayPlanes[0].materia] || '#9aa0a6' }} />
                        <span className="text-[8px] text-[#9aa0a6] truncate leading-none">{dayPlanes[0].materia?.substring(0, 8)}</span>
                      </div>
                    )}
                    {dayPlanes.length > 1 && (
                      <div className="text-[8px] text-[#4285F4]/60 font-medium">+{dayPlanes.length - 1}</div>
                    )}

                    {today && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#4285F4] animate-pulse" />
                    )}
                  </button>
                )
              })
          }
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2.5 pt-2.5 border-t border-[#f1f3f4]">
          {Object.entries(CAMPO_COLORS).map(([campo, color]) => (
            <div key={campo} className="flex items-center gap-1 text-[9px] text-[#5f6368]">
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
              {campo.split(' ')[0]}
            </div>
          ))}
          <div className="flex items-center gap-1 text-[9px] text-[#5f6368]">
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#A142F4' }} />
            Eventos
          </div>
          <div className="flex items-center gap-1 text-[9px] text-[#5f6368]">
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
            Evaluaciones
          </div>
        </div>
      </section>
    </div>
  )
}

export default Calendar
