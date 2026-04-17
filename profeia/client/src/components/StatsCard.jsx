import { useState, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Minus,
  Users, CheckCircle2, AlertTriangle, BookOpen,
  RefreshCw, ChevronRight, X
} from 'lucide-react'

/* ─── helpers ─── */
function getWeekDates() {
  const today = new Date()
  const dow = today.getDay()
  const toMon = dow === 0 ? -6 : 1 - dow
  const mon = new Date(today)
  mon.setDate(today.getDate() + toMon)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function Ring({ pct, color, size = 52, stroke = 5 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f3f4" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

function Trend({ val }) {
  if (val > 0)  return <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: '#34A853' }}><TrendingUp className="w-3 h-3" />+{val}%</span>
  if (val < 0)  return <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: '#EA4335' }}><TrendingDown className="w-3 h-3" />{val}%</span>
  return <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#9aa0a6' }}><Minus className="w-3 h-3" />Sin cambio</span>
}

/* ─── detail overlays ─── */
function DetailOverlay({ stat, data, onClose }) {
  if (!stat || !data) return null

  const content = {
    asistencia: (
      <div className="space-y-2">
        <p className="text-xs text-[#5f6368] mb-3">Asistencia diaria — semana actual</p>
        {data.diasAsistencia.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs font-medium w-10 text-[#5f6368]">{d.dia}</span>
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: '#f1f3f4' }}>
              <div className="rounded-full" style={{ width: `${d.pct}%`, height: '100%', background: d.pct >= 90 ? '#34A853' : d.pct >= 75 ? '#F59E0B' : '#EA4335', transition: 'width 0.5s ease' }} />
            </div>
            <span className="text-xs font-bold w-9 text-right" style={{ color: d.pct >= 90 ? '#34A853' : d.pct >= 75 ? '#F59E0B' : '#EA4335' }}>{d.pct}%</span>
          </div>
        ))}
      </div>
    ),
    evaluaciones: (
      <div className="space-y-2">
        <p className="text-xs text-[#5f6368] mb-3">Evaluaciones registradas esta semana</p>
        {data.tiposEval.map((t, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#3c4043]">{t.label}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${t.color}12`, color: t.color }}>{t.count}</span>
          </div>
        ))}
        {data.tiposEval.every(t => t.count === 0) && (
          <p className="text-xs text-[#9aa0a6] text-center py-2">Sin evaluaciones esta semana</p>
        )}
      </div>
    ),
    riesgo: (
      <div className="space-y-2">
        <p className="text-xs text-[#5f6368] mb-3">Alumnos que requieren atención</p>
        {data.alumnosRiesgo.length === 0 ? (
          <div className="text-center py-3">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-1 text-[#34A853]" />
            <p className="text-xs text-[#34A853] font-medium">¡Sin alumnos en riesgo!</p>
          </div>
        ) : (
          data.alumnosRiesgo.map((a, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(234,67,53,0.04)', border: '1px solid rgba(234,67,53,0.12)' }}>
              <span className="text-xs font-semibold text-[#202124]">{a.nombre}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(234,67,53,0.1)', color: '#EA4335' }}>{a.razon}</span>
            </div>
          ))
        )}
      </div>
    ),
    planeaciones: (
      <div className="space-y-2">
        <p className="text-xs text-[#5f6368] mb-3">Estado de planeaciones — semana actual</p>
        {[
          { label: 'Completadas', count: data.planComp, color: '#34A853' },
          { label: 'Pendientes',  count: data.planTotal - data.planComp, color: '#F59E0B' },
          { label: 'Total',       count: data.planTotal, color: '#A142F4' },
        ].map(r => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#3c4043]">{r.label}</span>
            <span className="text-sm font-bold" style={{ color: r.color }}>{r.count}</span>
          </div>
        ))}
      </div>
    ),
  }

  return (
    <div className="animate-slide-down rounded-xl border mt-2 p-3" style={{ background: '#fafbff', borderColor: '#e8eaed' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#202124]">Detalle</span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-[#f1f3f4] transition-colors cursor-pointer">
          <X className="w-3.5 h-3.5 text-[#9aa0a6]" />
        </button>
      </div>
      {content[stat]}
    </div>
  )
}

/* ─── mock data (backend not deployed on Vercel) ─── */
const MOCK_DATA = {
  asistPct:       85,
  asistTrend:     3,
  diasAsistencia: [
    { dia: 'Lun', pct: 90 },
    { dia: 'Mar', pct: 88 },
    { dia: 'Mié', pct: 82 },
    { dia: 'Jue', pct: 80 },
    { dia: 'Vie', pct: 85 },
  ],
  evalCount:      5,
  evalTarget:     8,
  tiposEval: [
    { label: 'Trabajo',       color: '#4285F4', count: 2 },
    { label: 'Tarea',         color: '#34A853', count: 1 },
    { label: 'Participación', color: '#F59E0B', count: 2 },
  ],
  alumnosRiesgo: [
    { nombre: 'García López, Juan',    razon: 'Inasistencias' },
    { nombre: 'Martínez Ruiz, María',  razon: 'Bajo rendimiento' },
    { nombre: 'Hernández, Carlos',     razon: 'Tareas pendientes' },
  ],
  planComp:   3,
  planTotal:  5,
}

/* ─── main component ─── */
export default function StatsCard({ docenteId }) {
  const [data]        = useState(MOCK_DATA)
  const [loading]     = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [lastUpdated] = useState(() => new Date())

  // no-op kept so the refresh button still renders without wiring
  const load = useCallback(() => {}, [])

  const toggle = (key) => setExpanded(prev => prev === key ? null : key)

  if (!docenteId) return null

  // ── Derived colors ──
  const asistColor = data?.asistPct == null ? '#9aa0a6'
    : data.asistPct >= 90 ? '#34A853'
    : data.asistPct >= 70 ? '#F59E0B'
    : '#EA4335'

  const evalPct    = data ? Math.round((data.evalCount / Math.max(data.evalTarget, 1)) * 100) : 0
  const planPct    = data ? (data.planTotal > 0 ? Math.round((data.planComp / data.planTotal) * 100) : 0) : 0

  return (
    <div
      className="rounded-2xl overflow-hidden animate-slide-left"
      style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 4px 12px rgba(30,41,59,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: '#f1f3f4', background: 'rgba(248,250,255,0.8)' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📊</span>
          <span className="text-xs font-bold text-[#202124]">Esta Semana</span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[9px] text-[#9aa0a6]">
              {lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="p-1 rounded-md hover:bg-[#f1f3f4] transition-colors cursor-pointer"
            title="Actualizar"
          >
            <RefreshCw className={`w-3 h-3 text-[#9aa0a6] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2×2 stat grid */}
      <div className="p-2.5 space-y-1.5">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton rounded-xl" style={{ height: 62 }} />
            ))}
          </div>
        ) : (
          <>
            {/* ── Asistencia ── */}
            <StatTile
              id="asistencia"
              icon={<Users className="w-3.5 h-3.5" style={{ color: asistColor }} />}
              label="Asistencia"
              value={data?.asistPct != null ? `${data.asistPct}%` : '—'}
              valueColor={asistColor}
              sub={<Trend val={data?.asistTrend ?? 0} />}
              accent={asistColor}
              active={expanded === 'asistencia'}
              onClick={() => toggle('asistencia')}
              right={
                <div className="flex-shrink-0">
                  <Ring pct={data?.asistPct ?? 0} color={asistColor} size={40} stroke={4} />
                </div>
              }
            />
            {expanded === 'asistencia' && (
              <DetailOverlay stat="asistencia" data={data} onClose={() => setExpanded(null)} />
            )}

            {/* ── Evaluaciones ── */}
            <StatTile
              id="evaluaciones"
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#4285F4]" />}
              label="Evaluaciones"
              value={`${data?.evalCount ?? 0}/${data?.evalTarget ?? '—'}`}
              valueColor="#4285F4"
              sub={
                <div className="w-full mt-1">
                  <div className="rounded-full overflow-hidden" style={{ height: 4, background: '#dbeafe' }}>
                    <div className="rounded-full transition-all" style={{ width: `${evalPct}%`, height: '100%', background: 'linear-gradient(90deg, #4285F4, #34A853)' }} />
                  </div>
                </div>
              }
              accent="#4285F4"
              active={expanded === 'evaluaciones'}
              onClick={() => toggle('evaluaciones')}
              fullWidthSub
            />
            {expanded === 'evaluaciones' && (
              <DetailOverlay stat="evaluaciones" data={data} onClose={() => setExpanded(null)} />
            )}

            {/* ── Alumnos en riesgo ── */}
            <StatTile
              id="riesgo"
              icon={<AlertTriangle className="w-3.5 h-3.5 text-[#EA4335]" />}
              label="En riesgo"
              value={data?.alumnosRiesgo.length ?? 0}
              valueColor={data?.alumnosRiesgo.length > 0 ? '#EA4335' : '#34A853'}
              sub={
                data?.alumnosRiesgo.length > 0
                  ? <span className="text-[10px] text-[#EA4335]">{data.alumnosRiesgo.slice(0,2).map(a => a.nombre.split(' ')[0]).join(', ')}{data.alumnosRiesgo.length > 2 ? ` +${data.alumnosRiesgo.length - 2}` : ''}</span>
                  : <span className="text-[10px] text-[#34A853]">¡Todo bien!</span>
              }
              accent="#EA4335"
              active={expanded === 'riesgo'}
              onClick={() => toggle('riesgo')}
            />
            {expanded === 'riesgo' && (
              <DetailOverlay stat="riesgo" data={data} onClose={() => setExpanded(null)} />
            )}

            {/* ── Planeaciones ── */}
            <StatTile
              id="planeaciones"
              icon={<BookOpen className="w-3.5 h-3.5 text-[#A142F4]" />}
              label="Planeaciones"
              value={`${data?.planComp ?? 0}/${data?.planTotal ?? '—'}`}
              valueColor="#A142F4"
              sub={<span className="text-[10px] text-[#9aa0a6]">{planPct}% completado</span>}
              accent="#A142F4"
              active={expanded === 'planeaciones'}
              onClick={() => toggle('planeaciones')}
              right={
                <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
                  <Ring pct={planPct} color="#A142F4" size={40} stroke={4} />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#A142F4]">{planPct}%</span>
                </div>
              }
            />
            {expanded === 'planeaciones' && (
              <DetailOverlay stat="planeaciones" data={data} onClose={() => setExpanded(null)} />
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t" style={{ borderColor: '#f1f3f4', background: '#fafafa' }}>
        <p className="text-[9px] text-[#9aa0a6] text-center">Semana actual · Toca para ver detalles</p>
      </div>
    </div>
  )
}

/* ─── Stat tile sub-component ─── */
function StatTile({ id, icon, label, value, valueColor, sub, accent, active, onClick, right, fullWidthSub }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border transition-all cursor-pointer"
      style={{
        padding: '8px 10px',
        background: active ? `${accent}06` : 'white',
        borderColor: active ? `${accent}30` : '#edf1f9',
        borderLeft: `3px solid ${active ? accent : 'transparent'}`,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#fafbff' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'white' }}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {icon}
            <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wide">{label}</span>
          </div>
          <div className={`flex ${fullWidthSub ? 'flex-col' : 'items-center gap-2'}`}>
            <span className="text-lg font-bold leading-none" style={{ color: valueColor }}>{value}</span>
            {!fullWidthSub && <div className="flex-1 min-w-0">{sub}</div>}
            {fullWidthSub && <div className="w-full">{sub}</div>}
          </div>
        </div>
        {right && right}
        {!right && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform" style={{ color: '#CBD5E1', transform: active ? 'rotate(90deg)' : 'none' }} />}
      </div>
    </button>
  )
}
