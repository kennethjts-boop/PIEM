import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

import {
  X, BookOpen, FileText, Users, Check, Plus, Clock,
  AlertTriangle, Save, GraduationCap, Calendar as CalendarIcon,
  Shield, Lightbulb, Star, Trash2, CheckCircle2, RotateCcw,
  Zap, Flame, Layers, ChevronRight, Sparkles, Timer, Package
} from 'lucide-react'

/* ─── constants ─── */
const MATERIA_COLORS = {
  'Español': '#4285F4', 'Matemáticas': '#A142F4', 'Ciencias': '#34A853',
  'Geografía': '#FBBC04', 'Historia': '#EA4335',
  'Formación Cívica y Ética': '#FF6B9D', 'Educación Artística': '#A142F4',
  'Educación Física': '#06B6D4', 'Tecnología': '#6366F1',
  'Lo Humano y lo Comunitario': '#F97316',
}

const CAMPO_COLORS_DP = {
  'Lenguajes': '#4285F4',
  'Saberes y Pensamiento Científico': '#34A853',
  'Ética, Naturaleza y Sociedades': '#EA4335',
  'De lo Humano y lo Comunitario': '#F59E0B',
}

const MATERIA_CAMPO_DP = {
  'Español':'Lenguajes','Inglés':'Lenguajes','Artes':'Lenguajes','Educación Artística':'Lenguajes',
  'Matemáticas':'Saberes y Pensamiento Científico','Ciencias':'Saberes y Pensamiento Científico',
  'Biología':'Saberes y Pensamiento Científico','Física':'Saberes y Pensamiento Científico',
  'Química':'Saberes y Pensamiento Científico',
  'Historia':'Ética, Naturaleza y Sociedades','Geografía':'Ética, Naturaleza y Sociedades',
  'Formación Cívica y Ética':'Ética, Naturaleza y Sociedades',
  'Educación Física':'De lo Humano y lo Comunitario','Taller':'De lo Humano y lo Comunitario',
  'Educación Socioemocional':'De lo Humano y lo Comunitario','Vida Saludable':'De lo Humano y lo Comunitario',
  'Tecnología':'De lo Humano y lo Comunitario','Lo Humano y lo Comunitario':'De lo Humano y lo Comunitario',
}

const TIPOS_EVALUACION = [
  { value: 'trabajo',       label: 'Trabajo',      color: '#4285F4' },
  { value: 'tarea',         label: 'Tarea',         color: '#34A853' },
  { value: 'proyecto',      label: 'Proyecto',      color: '#A142F4' },
  { value: 'disciplina',    label: 'Disciplina',    color: '#EA4335' },
  { value: 'limpieza',      label: 'Limpieza',      color: '#06B6D4' },
  { value: 'puntualidad',   label: 'Puntualidad',   color: '#FBBC04' },
  { value: 'participacion', label: 'Participación', color: '#F59E0B' },
]

const TIPOS_BITACORA = [
  { value: 'general',    label: 'General',    icon: FileText,    color: 'text-[#4285F4]' },
  { value: 'asunto',     label: 'Asunto',     icon: AlertTriangle, color: 'text-[#FBBC04]' },
  { value: 'reunion',    label: 'Reunión',    icon: Users,       color: 'text-[#A142F4]' },
  { value: 'bullying',   label: 'Bullying',   icon: Shield,      color: 'text-[#EA4335]' },
  { value: 'violencia',  label: 'Violencia',  icon: Shield,      color: 'text-[#EA4335]' },
  { value: 'mal_trato',  label: 'Mal trato',  icon: Shield,      color: 'text-[#F97316]' },
  { value: 'evaluacion', label: 'Evaluación', icon: GraduationCap, color: 'text-[#34A853]' },
]

function normalizePlaneacionEstado(estado) {
  const normalized = String(estado || '').toLowerCase().trim()
  if (!normalized) return 'pendiente'
  if (normalized === 'completada') return 'completado'
  if (normalized === 'activa' || normalized === 'actividad' || normalized === 'borrador') return 'pendiente'
  if (normalized === 'reprogramada') return 'reprogramado'
  return normalized
}

/* ─── mock AI activities (placeholder until n8n endpoint is live) ─── */
function buildActividades(planeaciones) {
  const materia = planeaciones[0]?.materia || 'Español'
  const grado   = planeaciones[0]?.grado   || 1
  const campo   = MATERIA_CAMPO_DP[materia] || 'Lenguajes'
  const color   = CAMPO_COLORS_DP[campo] || '#4285F4'

  return [
    {
      id: 'a1', titulo: 'Lectura compartida y debate',
      duracion: '20 min', color,
      materiales: 'Texto de lectura, pizarrón',
      descripcion: `Los alumnos de ${grado}° leen un fragmento en voz alta por turnos. Al terminar, el docente plantea 3 preguntas de comprensión y abre un breve debate grupal.`,
      objetivo: 'Comprensión lectora + expresión oral',
      tipo: 'Colaborativa',
    },
    {
      id: 'a2', titulo: 'Resolución de problemas en equipo',
      duracion: '25 min', color,
      materiales: 'Hojas de trabajo, marcadores',
      descripcion: `Equipos de 3-4 alumnos resuelven un problema auténtico relacionado con ${materia}. Cada equipo presenta su solución en 2 minutos.`,
      objetivo: 'Pensamiento crítico + trabajo colaborativo',
      tipo: 'Proyecto',
    },
    {
      id: 'a3', titulo: 'Organizador gráfico individual',
      duracion: '15 min', color,
      materiales: 'Cuaderno, colores',
      descripcion: `Cada alumno elabora un mapa conceptual o diagrama sobre el tema del día. Sirve como evidencia de aprendizaje y diagnóstico rápido.`,
      objetivo: 'Síntesis + organización de ideas',
      tipo: 'Individual',
    },
    {
      id: 'a4', titulo: 'Evaluación formativa rápida',
      duracion: '10 min', color,
      materiales: 'Tarjetas de salida (exit tickets)',
      descripcion: `Al final de la clase, cada alumno escribe en una tarjeta: 1 cosa que aprendió, 1 duda que tiene. El docente las revisa para ajustar la siguiente sesión.`,
      objetivo: 'Metacognición + retroalimentación docente',
      tipo: 'Evaluación',
    },
  ]
}

/* ═════════════════════════════════════════
   DayPanel — main component
   ═════════════════════════════════════════ */
function DayPanel({ date, docenteId, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('planeaciones')
  const [planeaciones, setPlaneaciones] = useState([])
  const [eventos, setEventos] = useState([])
  const [bitacora, setBitacora] = useState([])
  const [asistencia, setAsistencia] = useState([])
  const [evaluaciones, setEvaluaciones] = useState([])
  const [showBitacoraForm, setShowBitacoraForm] = useState(false)
  const [normaActiva, setNormaActiva] = useState(null)
  const [alerts, setAlerts] = useState([])

  const fechaStr  = date.toISOString().split('T')[0]
  const diaNombre = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => { loadData() }, [fechaStr, docenteId])

  const loadData = async () => {
    if (!docenteId) return
    try {
      const [p, e, b, a, ev] = await Promise.all([
        api.getPlaneaciones(docenteId),
        api.getEventos(docenteId),
        api.getBitacora(docenteId, fechaStr),
        api.getAsistencia(docenteId, fechaStr),
        api.getEvaluaciones(docenteId, { fecha: fechaStr }),
      ])
      setPlaneaciones(p.filter(i => i.fecha === fechaStr))
      setEventos(e.filter(i => i.fecha === fechaStr))
      setBitacora(b)
      setAsistencia(a)
      setEvaluaciones(Array.isArray(ev) ? ev : [])
    } catch (err) { console.error('Load data error:', err) }
  }

  const handleAsistenciaSave = async (registros) => {
    try {
      const result = await api.saveAsistencia(docenteId, fechaStr, registros)
      setAlerts(result.alerts || [])
      loadData(); onRefresh()
    } catch (err) { console.error('Save asistencia error:', err) }
  }

  const handleBitacoraSave = async (data) => {
    try {
      const result = await api.createBitacora(docenteId, { fecha: fechaStr, ...data })
      if (result.recommendations?.length > 0) {
        for (const rec of result.recommendations) {
          if (rec.tipo === 'protocolo' && rec.norma) setNormaActiva(rec.norma)
        }
      }
      loadData(); onRefresh()
      setShowBitacoraForm(false)
    } catch (err) { console.error('Save bitacora error:', err) }
  }

  const tabs = [
    { id: 'planeaciones',  label: 'Planeaciones',    icon: BookOpen,      count: planeaciones.length },
    { id: 'asistencia',    label: 'Lista Rápida',     icon: Zap,           count: asistencia.length },
    { id: 'actividades',   label: 'Actividades IA',   icon: Sparkles,      count: null },
    { id: 'evaluacion',    label: 'Evaluación',       icon: Star,          count: evaluaciones.length },
    { id: 'bitacora',      label: 'Bitácora',         icon: FileText,      count: bitacora.length },
    { id: 'eventos',       label: 'Eventos',          icon: CalendarIcon,  count: eventos.length },
  ]

  return (
    <div className="fixed inset-0 z-[300] flex justify-end bg-black/15 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white border-l border-[#e8eaed] overflow-y-auto animate-slide-left shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#e8eaed] p-5 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#202124] capitalize">{diaNombre}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-[#5f6368]">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#4285F4]" />{planeaciones.length}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#A142F4]" />{eventos.length}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#FBBC04]" />{bitacora.length}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-[#f1f3f4] transition-colors">
              <X className="w-5 h-5 text-[#5f6368]" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="p-4 space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className={`p-3 rounded-xl border ${
                alert.nivel === 'critico'
                  ? 'bg-[#EA4335]/5 border-[#EA4335]/20 text-[#EA4335]'
                  : 'bg-[#FBBC04]/5 border-[#FBBC04]/20 text-[#e37400]'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{alert.mensaje}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Institutional Norm */}
        {normaActiva && (
          <div className="m-4 p-4 rounded-xl bg-[#EA4335]/5 border border-[#EA4335]/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#EA4335] flex items-center gap-2">
                <Shield className="w-5 h-5" />{normaActiva.titulo}
              </h3>
              <button onClick={() => setNormaActiva(null)} className="p-1 hover:bg-[#f1f3f4] rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[#5f6368] mb-3">{normaActiva.descripcion}</p>
            <div className="bg-[#f8f9fa] rounded-lg p-3">
              <h4 className="text-sm font-semibold text-[#5f6368] mb-2">Protocolo:</h4>
              <pre className="text-sm text-[#202124] whitespace-pre-wrap font-sans text-xs">{normaActiva.protocolo}</pre>
            </div>
            <p className="text-xs text-[#9aa0a6] mt-2">Ref: {normaActiva.referencia_legal}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#e8eaed] overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button flex-shrink-0 ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="bg-[#f1f3f4] px-1.5 py-0.5 rounded-full text-[10px] font-bold">{tab.count}</span>
              )}
              {tab.id === 'actividades' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(161,66,244,0.1)', color: '#A142F4' }}>IA</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'planeaciones' && (
            <PlaneacionesTab planeaciones={planeaciones} docenteId={docenteId} onRefresh={loadData} />
          )}
          {activeTab === 'asistencia' && (
            <AsistenciaRapidaTab
              fecha={fechaStr}
              asistencia={asistencia}
              onSave={handleAsistenciaSave}
            />
          )}
          {activeTab === 'actividades' && (
            <ActividadesTab planeaciones={planeaciones} fecha={fechaStr} />
          )}
          {activeTab === 'evaluacion' && (
            <EvaluacionTab
              fecha={fechaStr}
              docenteId={docenteId}
              evaluaciones={evaluaciones}
              onRefresh={loadData}
            />
          )}
          {activeTab === 'bitacora' && (
            <BitacoraTab
              bitacora={bitacora}
              onAdd={() => setShowBitacoraForm(true)}
              onSave={handleBitacoraSave}
              showForm={showBitacoraForm}
              onCancelForm={() => setShowBitacoraForm(false)}
            />
          )}
          {activeTab === 'eventos' && (
            <EventosTab eventos={eventos} />
          )}
        </div>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════
   Tab 1 — Planeaciones (with "Terminada" button)
   ═════════════════════════════════════════ */
function PlaneacionesTab({ planeaciones, docenteId, onRefresh }) {
  const [completedIds, setCompletedIds] = useState(new Set(
    planeaciones.filter(p => normalizePlaneacionEstado(p.estado) === 'completado').map(p => p.id)
  ))

  const handleTerminar = async (id) => {
    setCompletedIds(prev => new Set([...prev, id]))  // optimistic
    try {
      await api.updatePlaneacion?.(id, { estado: 'completado', completado_en: new Date().toISOString() })
      onRefresh?.()
    } catch { /* keep optimistic state */ }
  }

  const handleDeshacer = async (id) => {
    setCompletedIds(prev => { const s = new Set(prev); s.delete(id); return s })
    try {
      await api.updatePlaneacion?.(id, { estado: 'pendiente', completado_en: null })
      onRefresh?.()
    } catch {}
  }

  if (planeaciones.length === 0) {
    return (
      <div className="text-center py-16 text-[#9aa0a6]">
        <BookOpen className="w-14 h-14 mx-auto mb-3 text-[#e8eaed]" />
        <p className="font-medium">No hay planeaciones para este día</p>
      </div>
    )
  }

  const pending   = planeaciones.filter(p => !completedIds.has(p.id))
  const completed = planeaciones.filter(p =>  completedIds.has(p.id))

  return (
    <div className="space-y-3">
      {pending.map(p => {
        const campo      = MATERIA_CAMPO_DP[p.materia] || 'Lenguajes'
        const campoColor = CAMPO_COLORS_DP[campo] || '#9aa0a6'
        return (
          <div key={p.id} className="glass-card rounded-xl p-4 hover:shadow-md transition-shadow" style={{ borderLeft: `3px solid ${campoColor}` }}>
            <div className="flex items-start justify-between mb-1.5 gap-2">
              <h3 className="font-semibold text-[#202124] text-sm">{p.tema}</h3>
              <button
                onClick={() => handleTerminar(p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all cursor-pointer"
                style={{ background: 'rgba(52,168,83,0.1)', color: '#34A853', border: '1px solid rgba(52,168,83,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#34A853'; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,168,83,0.1)'; e.currentTarget.style.color = '#34A853' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terminada
              </button>
            </div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: campoColor + '18', color: campoColor }}>
                {campo.split(' ')[0]}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[#5f6368]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: campoColor }} />
                {p.materia}
              </span>
              <span className="text-xs text-[#9aa0a6]">Grado {p.grado} · {p.grupo}</span>
            </div>
            {p.objetivo && (
              <p className="text-xs text-[#5f6368] mb-2">
                <strong className="text-[#202124]">Objetivo:</strong> {p.objetivo}
              </p>
            )}
            {p.actividades && (
              <div className="text-xs text-[#5f6368]">
                <strong className="text-[#202124]">Actividades:</strong>
                <pre className="whitespace-pre-wrap mt-1 font-sans text-xs">{p.actividades}</pre>
              </div>
            )}
          </div>
        )
      })}

      {/* Completadas section */}
      {completed.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-[#34A853]" />
            <span className="text-sm font-semibold text-[#34A853]">Completadas ({completed.length})</span>
          </div>
          <div className="space-y-2">
            {completed.map(p => {
              const campo      = MATERIA_CAMPO_DP[p.materia] || 'Lenguajes'
              const campoColor = CAMPO_COLORS_DP[campo] || '#9aa0a6'
              return (
                <div key={p.id} className="rounded-xl p-3 flex items-center justify-between gap-3"
                  style={{ background: 'rgba(52,168,83,0.05)', border: '1px solid rgba(52,168,83,0.18)', opacity: 0.75 }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-[#34A853] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#5f6368] line-through truncate">{p.tema}</p>
                      <p className="text-xs text-[#9aa0a6]">{p.materia} · Grado {p.grado}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeshacer(p.id)}
                    className="flex items-center gap-1 text-xs text-[#9aa0a6] hover:text-[#4285F4] transition-colors flex-shrink-0 cursor-pointer"
                    title="Deshacer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Deshacer
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═════════════════════════════════════════
   Tab 2 — Asistencia Rápida
   ═════════════════════════════════════════ */
function AsistenciaRapidaTab({ fecha, asistencia, onSave }) {
  // Seed from existing records or provide empty roster
  const seed = asistencia.length > 0
    ? asistencia.map(a => ({ nombre: a.alumno_nombre, grado: a.grado, grupo: a.grupo || 'Único', presente: a.presente }))
    : []

  const [alumnos, setAlumnos] = useState(seed)
  const [focusIdx, setFocusIdx] = useState(0)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [saved, setSaved] = useState(false)
  const containerRef = useRef(null)
  const addRef = useRef(null)

  // Pre-existing saved state
  const alreadySaved = asistencia.length > 0 && alumnos === seed

  const toggle = useCallback((idx) => {
    setAlumnos(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], presente: !copy[idx].presente }
      return copy
    })
    setSaved(false)
  }, [])

  const addAlumno = () => {
    const name = nuevoNombre.trim()
    if (!name) return
    setAlumnos(prev => [...prev, { nombre: name, grado: 1, grupo: 'Único', presente: true }])
    setNuevoNombre('')
    setSaved(false)
    setTimeout(() => setFocusIdx(alumnos.length), 0)
  }

  const handleSave = async () => {
    const valid = alumnos.filter(a => a.nombre.trim())
    if (!valid.length) return
    await onSave(valid)
    setSaved(true)
  }

  // Keyboard shortcuts: arrows, P, F
  useEffect(() => {
    const handler = (e) => {
      if (alumnos.length === 0) return
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowDown')  { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, alumnos.length - 1)) }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'p' || e.key === 'P') {
        setAlumnos(prev => { const c=[...prev]; if(c[focusIdx]) c[focusIdx]={...c[focusIdx],presente:true}; return c })
        setFocusIdx(i => Math.min(i+1, alumnos.length-1))
        setSaved(false)
      }
      if (e.key === 'f' || e.key === 'F') {
        setAlumnos(prev => { const c=[...prev]; if(c[focusIdx]) c[focusIdx]={...c[focusIdx],presente:false}; return c })
        setFocusIdx(i => Math.min(i+1, alumnos.length-1))
        setSaved(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [focusIdx, alumnos.length])

  const presentes = alumnos.filter(a => a.presente).length
  const faltas    = alumnos.length - presentes
  const pct       = alumnos.length > 0 ? Math.round((presentes / alumnos.length) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(66,133,244,0.05)', border: '1px solid rgba(66,133,244,0.12)' }}>
        <div className="flex-1">
          <p className="text-xs text-[#5f6368] mb-1 font-medium">Asistencia del día</p>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 font-bold text-[#34A853]">
              <Check className="w-4 h-4" />{presentes} presentes
            </span>
            <span className="flex items-center gap-1.5 font-bold text-[#EA4335]">
              <X className="w-4 h-4" />{faltas} faltas
            </span>
          </div>
        </div>
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg viewBox="0 0 44 44" className="w-14 h-14 -rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="#f1f3f4" strokeWidth="5" />
            <circle cx="22" cy="22" r="18" fill="none"
              stroke={pct >= 90 ? '#34A853' : pct >= 75 ? '#FBBC04' : '#EA4335'}
              strokeWidth="5"
              strokeDasharray={`${pct * 1.131} 113.1`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#202124]">{pct}%</span>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="flex items-center gap-2 text-xs text-[#9aa0a6] px-1">
        <span>Atajos:</span>
        {[['↑↓','navegar'],['P','presente'],['F','falta']].map(([k,v]) => (
          <span key={k} className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[#f1f3f4] font-mono font-bold text-[#5f6368] text-[10px]">{k}</kbd>
            <span>{v}</span>
          </span>
        ))}
      </div>

      {/* Student grid — 2-column P | F */}
      {alumnos.length > 0 && (
        <div className="rounded-xl border border-[#e8eaed] overflow-hidden">
          {/* Column headers */}
          <div className="grid gap-0" style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px' }}>
            <div className="px-3 py-2 text-xs font-bold text-[#5f6368] bg-[#f8f9fa] border-b border-[#e8eaed]">Alumno</div>
            <div className="px-3 py-2 text-xs font-bold text-[#34A853] bg-[#f8f9fa] border-b border-[#e8eaed] text-center">P</div>
            <div className="px-3 py-2 text-xs font-bold text-[#EA4335] bg-[#f8f9fa] border-b border-[#e8eaed] text-center">F</div>
          </div>
          <div ref={containerRef} className="max-h-[340px] overflow-y-auto divide-y divide-[#f1f3f4]">
            {alumnos.map((a, idx) => {
              const isFocused = idx === focusIdx
              return (
                <div
                  key={idx}
                  onClick={() => { setFocusIdx(idx) }}
                  className="transition-colors"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 72px 72px',
                    background: isFocused ? 'rgba(66,133,244,0.06)' : idx % 2 === 0 ? 'white' : '#fafafa',
                  }}
                >
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    {isFocused && <ChevronRight className="w-3 h-3 text-[#4285F4] flex-shrink-0" />}
                    <span className="text-sm font-medium text-[#202124] truncate">{a.nombre}</span>
                    <span className="text-xs text-[#9aa0a6] flex-shrink-0">{a.grado}°</span>
                  </div>
                  {/* P button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setAlumnos(prev => { const c=[...prev]; c[idx]={...c[idx],presente:true}; return c }); setSaved(false) }}
                    className="flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      background: a.presente ? '#34A853' : 'transparent',
                      borderLeft: '1px solid #f1f3f4',
                    }}
                  >
                    {a.presente && <Check className="w-4 h-4 text-white" />}
                  </button>
                  {/* F button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setAlumnos(prev => { const c=[...prev]; c[idx]={...c[idx],presente:false}; return c }); setSaved(false) }}
                    className="flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      background: !a.presente ? '#EA4335' : 'transparent',
                      borderLeft: '1px solid #f1f3f4',
                    }}
                  >
                    {!a.presente && <X className="w-4 h-4 text-white" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add student */}
      <div className="flex gap-2">
        <input
          ref={addRef}
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addAlumno()}
          className="input-google flex-1 text-sm"
          placeholder="Nombre del alumno — Enter para agregar"
          style={{ padding: '8px 12px', fontSize: 14 }}
        />
        <button onClick={addAlumno} className="btn-secondary px-3 py-2 text-sm">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={alumnos.length === 0}
        className="w-full py-3.5 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-2 transition-all cursor-pointer"
        style={{
          background: saved ? '#34A853' : alumnos.length === 0 ? '#e8eaed' : 'linear-gradient(135deg, #4285F4, #34A853)',
          cursor: alumnos.length === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        {saved
          ? <><CheckCircle2 className="w-5 h-5" /> Lista guardada</>
          : <><Save className="w-5 h-5" /> Guardar asistencia ({alumnos.length} alumnos)</>
        }
      </button>
    </div>
  )
}

/* ═════════════════════════════════════════
   Tab 3 — Actividades sugeridas por IA
   ═════════════════════════════════════════ */
function ActividadesTab({ planeaciones, fecha }) {
  const [actividades] = useState(() => buildActividades(planeaciones))
  const [usadas, setUsadas] = useState(new Set())
  const [loading, setLoading] = useState(false)

  const materia = planeaciones[0]?.materia || null
  const grado   = planeaciones[0]?.grado   || null

  const handleUsar = (id) => {
    setUsadas(prev => new Set([...prev, id]))
    // TODO: POST to n8n webhook / api.addActividadADia(docenteId, fecha, actividad)
  }

  const TYPE_COLORS = {
    'Colaborativa': '#4285F4',
    'Proyecto':     '#A142F4',
    'Individual':   '#34A853',
    'Evaluación':   '#F59E0B',
  }

  return (
    <div className="space-y-4">
      {/* Context banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(161,66,244,0.06), rgba(66,133,244,0.06))', border: '1px solid rgba(161,66,244,0.15)' }}>
        <div className="rounded-xl p-2 flex-shrink-0" style={{ background: 'rgba(161,66,244,0.1)' }}>
          <Sparkles className="w-5 h-5" style={{ color: '#A142F4' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#202124]">Actividades generadas por IA</p>
          <p className="text-xs text-[#5f6368] mt-0.5">
            {materia
              ? `Basadas en ${materia} — ${grado}° grado · ${fecha}`
              : 'Sugerencias generales para el día'
            }
          </p>
          <p className="text-xs mt-1.5 px-2 py-0.5 rounded-full inline-block" style={{ background: 'rgba(161,66,244,0.1)', color: '#A142F4' }}>
            Conectar a n8n próximamente · Datos de muestra
          </p>
        </div>
      </div>

      {/* Activity cards */}
      <div className="space-y-3">
        {actividades.map(act => {
          const isUsada = usadas.has(act.id)
          const typeColor = TYPE_COLORS[act.tipo] || '#4285F4'
          return (
            <div
              key={act.id}
              className="rounded-xl border transition-all"
              style={{
                background: isUsada ? 'rgba(52,168,83,0.04)' : 'white',
                borderColor: isUsada ? 'rgba(52,168,83,0.3)' : '#edf1f9',
                borderLeft: `3px solid ${isUsada ? '#34A853' : act.color}`,
                padding: '14px',
                opacity: isUsada ? 0.8 : 1,
              }}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: typeColor, background: `${typeColor}12` }}>
                      {act.tipo}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#5f6368]">
                      <Timer className="w-3.5 h-3.5" />{act.duracion}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#202124]">{act.titulo}</h4>
                </div>
                <button
                  onClick={() => handleUsar(act.id)}
                  disabled={isUsada}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all cursor-pointer"
                  style={isUsada
                    ? { background: 'rgba(52,168,83,0.12)', color: '#34A853', cursor: 'default' }
                    : { background: `${act.color}12`, color: act.color, border: `1px solid ${act.color}25` }
                  }
                  onMouseEnter={e => { if (!isUsada) { e.currentTarget.style.background = act.color; e.currentTarget.style.color = 'white' } }}
                  onMouseLeave={e => { if (!isUsada) { e.currentTarget.style.background = `${act.color}12`; e.currentTarget.style.color = act.color } }}
                >
                  {isUsada
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Agregada</>
                    : <><Plus className="w-3.5 h-3.5" /> Usar actividad</>
                  }
                </button>
              </div>

              <p className="text-xs text-[#5f6368] leading-relaxed mb-2">{act.descripcion}</p>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                  <Package className="w-3.5 h-3.5" />
                  <span><strong>Materiales:</strong> {act.materiales}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                  <Layers className="w-3.5 h-3.5" />
                  <span><strong>Objetivo:</strong> {act.objetivo}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {usadas.size > 0 && (
        <div className="text-center p-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(52,168,83,0.07)', color: '#34A853' }}>
          <CheckCircle2 className="w-4 h-4 inline mr-1.5 mb-0.5" />
          {usadas.size} actividad{usadas.size > 1 ? 'es' : ''} agregada{usadas.size > 1 ? 's' : ''} al plan del día
        </div>
      )}
    </div>
  )
}

/* ═════════════════════════════════════════
   Tab 4 — Evaluación
   ═════════════════════════════════════════ */
function EvaluacionTab({ fecha, docenteId, evaluaciones, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ alumno_nombre: '', grado: 1, tipo: 'trabajo', calificacion: 10, observaciones: '' })

  const handleSave = async (e) => {
    e.preventDefault()
    if (!docenteId || !form.alumno_nombre.trim()) return
    try {
      await api.createEvaluacion(docenteId, { fecha, ...form })
      setForm({ alumno_nombre: '', grado: 1, tipo: 'trabajo', calificacion: 10, observaciones: '' })
      setShowForm(false)
      onRefresh()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id) => {
    try { await api.deleteEvaluacion(id); onRefresh() } catch {}
  }

  const grouped = TIPOS_EVALUACION.map(t => ({
    ...t,
    items: evaluaciones.filter(e => e.tipo === t.value),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-4">
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-[#e8eaed] text-[#9aa0a6] hover:border-[#F59E0B]/40 hover:text-[#F59E0B] transition-all flex items-center justify-center gap-2 font-medium">
          <Plus className="w-4 h-4" />Registrar evaluación
        </button>
      )}
      {showForm && (
        <form onSubmit={handleSave} className="glass-card rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-[#202124] flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-[#F59E0B]" />Nueva evaluación
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#5f6368] mb-1 font-medium">Alumno</label>
              <input value={form.alumno_nombre} onChange={e => setForm({...form, alumno_nombre: e.target.value})}
                className="input-google text-sm" placeholder="Nombre del alumno" required />
            </div>
            <div>
              <label className="block text-xs text-[#5f6368] mb-1 font-medium">Grado</label>
              <select value={form.grado} onChange={e => setForm({...form, grado: parseInt(e.target.value)})}
                className="input-google text-sm">
                <option value={1}>1°</option><option value={2}>2°</option><option value={3}>3°</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#5f6368] mb-1 font-medium">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                className="input-google text-sm">
                {TIPOS_EVALUACION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#5f6368] mb-1 font-medium">Calificación (0–10)</label>
              <input type="number" min="0" max="10" step="0.5" value={form.calificacion}
                onChange={e => setForm({...form, calificacion: parseFloat(e.target.value)})}
                className="input-google text-sm" />
            </div>
          </div>
          <input value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})}
            className="input-google text-sm" placeholder="Observaciones (opcional)" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 text-sm py-2"><Save className="w-3.5 h-3.5" />Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2">Cancelar</button>
          </div>
        </form>
      )}
      {grouped.length === 0 && !showForm && (
        <div className="text-center py-16 text-[#9aa0a6]">
          <Star className="w-14 h-14 mx-auto mb-3 text-[#e8eaed]" />
          <p className="font-medium">Sin evaluaciones registradas</p>
        </div>
      )}
      {grouped.map(g => (
        <div key={g.value} className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-[#f1f3f4]" style={{ backgroundColor: g.color + '12' }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
            <span className="text-sm font-semibold" style={{ color: g.color }}>{g.label}</span>
            <span className="ml-auto text-xs text-[#9aa0a6]">{g.items.length} registro{g.items.length > 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-[#f1f3f4]">
            {g.items.map(ev => (
              <div key={ev.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#202124]">{ev.alumno_nombre}</p>
                  <p className="text-xs text-[#9aa0a6]">Grado {ev.grado}{ev.observaciones ? ' · ' + ev.observaciones : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold" style={{ color: ev.calificacion >= 7 ? '#34A853' : ev.calificacion >= 6 ? '#FBBC04' : '#EA4335' }}>
                    {ev.calificacion}
                  </span>
                  <button onClick={() => handleDelete(ev.id)} className="p-1 rounded hover:bg-[#f1f3f4] text-[#9aa0a6] hover:text-[#EA4335] transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═════════════════════════════════════════
   Tab 5 — Bitácora
   ═════════════════════════════════════════ */
function BitacoraTab({ bitacora, onAdd, onSave, showForm, onCancelForm }) {
  const [formData, setFormData] = useState({
    tipo: 'general', descripcion: '', gravedad: 1,
    alumnos_involucrados: '', acciones_tomadas: '',
  })
  const handleSubmit = (e) => { e.preventDefault(); onSave(formData) }

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-[#202124] flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#4285F4]" />Nueva entrada
        </h3>
        <div>
          <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Tipo</label>
          <select value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value, gravedad: e.target.value === 'bullying' || e.target.value === 'violencia' ? 3 : 1 })}
            className="input-google">
            {TIPOS_BITACORA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Descripción</label>
          <textarea value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            className="input-google min-h-[100px] resize-none" placeholder="Describe lo sucedido..." required />
        </div>
        <div>
          <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Gravedad</label>
          <input type="range" min="1" max="5" value={formData.gravedad}
            onChange={(e) => setFormData({ ...formData, gravedad: parseInt(e.target.value) })}
            className="w-full accent-[#4285F4]" />
          <div className="flex justify-between text-xs text-[#9aa0a6]">
            <span>Leve</span>
            <span className={`font-bold ${formData.gravedad >= 4 ? 'text-[#EA4335]' : formData.gravedad >= 3 ? 'text-[#FBBC04]' : 'text-[#34A853]'}`}>
              Nivel {formData.gravedad}
            </span>
            <span>Grave</span>
          </div>
        </div>
        <input type="text" value={formData.alumnos_involucrados}
          onChange={(e) => setFormData({ ...formData, alumnos_involucrados: e.target.value })}
          className="input-google" placeholder="Alumnos involucrados (opcional)" />
        <textarea value={formData.acciones_tomadas}
          onChange={(e) => setFormData({ ...formData, acciones_tomadas: e.target.value })}
          className="input-google min-h-[60px] resize-none" placeholder="Acciones tomadas..." />
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary flex-1"><Save className="w-4 h-4" />Guardar</button>
          <button type="button" onClick={onCancelForm} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    )
  }

  return (
    <div>
      <button onClick={onAdd}
        className="w-full py-3 rounded-xl border-2 border-dashed border-[#e8eaed] text-[#9aa0a6] hover:border-[#A142F4]/40 hover:text-[#A142F4] transition-all mb-4 flex items-center justify-center gap-2 font-medium">
        <Plus className="w-4 h-4" />Agregar entrada de bitácora
      </button>
      {bitacora.length === 0 ? (
        <div className="text-center py-16 text-[#9aa0a6]">
          <FileText className="w-14 h-14 mx-auto mb-3 text-[#e8eaed]" />
          <p className="font-medium">No hay entradas para este día</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bitacora.map(entry => {
            const tipoInfo = TIPOS_BITACORA.find(t => t.value === entry.tipo) || TIPOS_BITACORA[0]
            const Icon = tipoInfo.icon
            return (
              <div key={entry.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${tipoInfo.color}`} />
                    <span className="font-medium text-sm text-[#202124]">{tipoInfo.label}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    entry.gravedad >= 4 ? 'bg-[#EA4335]/10 text-[#EA4335]' :
                    entry.gravedad >= 3 ? 'bg-[#FBBC04]/10 text-[#e37400]' :
                    'bg-[#34A853]/10 text-[#34A853]'
                  }`}>Gravedad {entry.gravedad}</span>
                </div>
                <p className="text-sm text-[#5f6368] mb-2">{entry.descripcion}</p>
                {entry.alumnos_involucrados && <p className="text-xs text-[#9aa0a6]"><strong>Alumnos:</strong> {entry.alumnos_involucrados}</p>}
                {entry.acciones_tomadas && <p className="text-xs text-[#9aa0a6] mt-1"><strong>Acciones:</strong> {entry.acciones_tomadas}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═════════════════════════════════════════
   Tab 6 — Eventos
   ═════════════════════════════════════════ */
function EventosTab({ eventos }) {
  if (eventos.length === 0) {
    return (
      <div className="text-center py-16 text-[#9aa0a6]">
        <CalendarIcon className="w-14 h-14 mx-auto mb-3 text-[#e8eaed]" />
        <p className="font-medium">No hay eventos para este día</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {eventos.map(e => (
        <div key={e.id} className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-[#202124]">{e.titulo}</h3>
            <span className="badge-activity badge-evento">{e.tipo}</span>
          </div>
          {e.descripcion && <p className="text-sm text-[#5f6368] mb-2">{e.descripcion}</p>}
          <div className="flex items-center gap-4 text-sm text-[#9aa0a6]">
            {e.hora_inicio && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />{e.hora_inicio} – {e.hora_fin || '—'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default DayPanel
