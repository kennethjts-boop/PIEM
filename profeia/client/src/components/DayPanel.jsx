import { useState, useEffect } from 'react'
import { api } from '../api'

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

import {
  X, BookOpen, FileText, Users, Check, Plus, Clock,
  AlertTriangle, Save, GraduationCap, Calendar as CalendarIcon,
  Shield, Lightbulb, Star, Trash2
} from 'lucide-react'

const TIPOS_EVALUACION = [
  { value: 'trabajo',        label: 'Trabajo',       color: '#4285F4' },
  { value: 'tarea',          label: 'Tarea',          color: '#34A853' },
  { value: 'proyecto',       label: 'Proyecto',       color: '#A142F4' },
  { value: 'disciplina',     label: 'Disciplina',     color: '#EA4335' },
  { value: 'limpieza',       label: 'Limpieza',       color: '#06B6D4' },
  { value: 'puntualidad',    label: 'Puntualidad',    color: '#FBBC04' },
  { value: 'participacion',  label: 'Participación',  color: '#F59E0B' },
]

const CAMPO_COLORS_DP = {
  'Lenguajes': '#4285F4',
  'Saberes y Pensamiento Científico': '#34A853',
  'Ética, Naturaleza y Sociedades': '#EA4335',
  'De lo Humano y lo Comunitario': '#F59E0B',
}

const MATERIA_CAMPO_DP = {
  'Español':'Lenguajes','Inglés':'Lenguajes','Artes':'Lenguajes','Educación Artística':'Lenguajes',
  'Matemáticas':'Saberes y Pensamiento Científico','Ciencias':'Saberes y Pensamiento Científico',
  'Biología':'Saberes y Pensamiento Científico','Física':'Saberes y Pensamiento Científico','Química':'Saberes y Pensamiento Científico',
  'Historia':'Ética, Naturaleza y Sociedades','Geografía':'Ética, Naturaleza y Sociedades','Formación Cívica y Ética':'Ética, Naturaleza y Sociedades',
  'Educación Física':'De lo Humano y lo Comunitario','Taller':'De lo Humano y lo Comunitario',
  'Educación Socioemocional':'De lo Humano y lo Comunitario','Vida Saludable':'De lo Humano y lo Comunitario',
  'Tecnología':'De lo Humano y lo Comunitario','Lo Humano y lo Comunitario':'De lo Humano y lo Comunitario',
}

const TIPOS_BITACORA = [
  { value: 'general', label: 'General', icon: FileText, color: 'text-[#4285F4]' },
  { value: 'asunto', label: 'Asunto', icon: AlertTriangle, color: 'text-[#FBBC04]' },
  { value: 'reunion', label: 'Reunión', icon: Users, color: 'text-[#A142F4]' },
  { value: 'bullying', label: 'Bullying', icon: Shield, color: 'text-[#EA4335]' },
  { value: 'violencia', label: 'Violencia', icon: Shield, color: 'text-[#EA4335]' },
  { value: 'mal_trato', label: 'Mal trato', icon: Shield, color: 'text-[#F97316]' },
  { value: 'evaluacion', label: 'Evaluación', icon: GraduationCap, color: 'text-[#34A853]' },
]

function DayPanel({ date, docenteId, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('planeaciones')
  const [planeaciones, setPlaneaciones] = useState([])
  const [eventos, setEventos] = useState([])
  const [bitacora, setBitacora] = useState([])
  const [asistencia, setAsistencia] = useState([])
  const [evaluaciones, setEvaluaciones] = useState([])
  const [showBitacoraForm, setShowBitacoraForm] = useState(false)
  const [showAsistencia, setShowAsistencia] = useState(false)
  const [normaActiva, setNormaActiva] = useState(null)
  const [alerts, setAlerts] = useState([])

  const fechaStr = date.toISOString().split('T')[0]
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
        api.getEvaluaciones(docenteId, { fecha: fechaStr })
      ])
      setPlaneaciones(p.filter(i => i.fecha === fechaStr))
      setEventos(e.filter(i => i.fecha === fechaStr))
      setBitacora(b)
      setAsistencia(a)
      setEvaluaciones(Array.isArray(ev) ? ev : [])
    } catch (e) { console.error('Load data error:', e) }
  }

  const handleAsistenciaSave = async (registros) => {
    try {
      const result = await api.saveAsistencia(docenteId, fechaStr, registros)
      setAlerts(result.alerts || [])
      loadData()
      onRefresh()
    } catch (e) { console.error('Save asistencia error:', e) }
  }

  const handleBitacoraSave = async (data) => {
    try {
      const result = await api.createBitacora(docenteId, { fecha: fechaStr, ...data })
      if (result.recommendations?.length > 0) {
        for (const rec of result.recommendations) {
          if (rec.tipo === 'protocolo' && rec.norma) setNormaActiva(rec.norma)
        }
      }
      loadData()
      onRefresh()
      setShowBitacoraForm(false)
    } catch (e) { console.error('Save bitacora error:', e) }
  }

  const tabs = [
    { id: 'planeaciones', label: 'Planeaciones', icon: BookOpen, count: planeaciones.length },
    { id: 'evaluacion',   label: 'Evaluación',   icon: Star,      count: evaluaciones.length },
    { id: 'bitacora',     label: 'Bitácora',     icon: FileText,  count: bitacora.length },
    { id: 'asistencia',   label: 'Asistencia',   icon: Users,     count: asistencia.length },
    { id: 'eventos',      label: 'Eventos',      icon: CalendarIcon, count: eventos.length },
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
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-[#f1f3f4] px-1.5 py-0.5 rounded-full text-[10px] font-bold">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === 'planeaciones' && (
            <PlaneacionesTab planeaciones={planeaciones} />
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
          {activeTab === 'asistencia' && (
            <AsistenciaTab
              fecha={fechaStr}
              asistencia={asistencia}
              onSave={handleAsistenciaSave}
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

// ===== Planeaciones Tab =====
function PlaneacionesTab({ planeaciones }) {
  if (planeaciones.length === 0) {
    return (
      <div className="text-center py-16 text-[#9aa0a6]">
        <BookOpen className="w-14 h-14 mx-auto mb-3 text-[#e8eaed]" />
        <p className="font-medium">No hay planeaciones para este día</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {planeaciones.map(p => {
        const campo = MATERIA_CAMPO_DP[p.materia] || 'Lenguajes'
        const campoColor = CAMPO_COLORS_DP[campo] || '#9aa0a6'
        return (
          <div key={p.id} className="glass-card rounded-xl p-4 hover:shadow-md transition-shadow" style={{ borderLeft: `3px solid ${campoColor}` }}>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="font-semibold text-[#202124] text-sm">{p.tema}</h3>
              <span className={`badge-activity ${p.tipo === 'codiseño' ? 'badge-evento' : 'badge-planeacion'}`}>
                {p.tipo}
              </span>
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
            {p.objetivo && <p className="text-xs text-[#5f6368] mb-2"><strong className="text-[#202124]">Objetivo:</strong> {p.objetivo}</p>}
            {p.actividades && (
              <div className="text-xs text-[#5f6368]">
                <strong className="text-[#202124]">Actividades:</strong>
                <pre className="whitespace-pre-wrap mt-1 font-sans text-xs">{p.actividades}</pre>
              </div>
            )}
            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
              p.estado === 'pendiente' ? 'bg-[#FBBC04]/10 text-[#e37400]' :
              p.estado === 'completado' ? 'bg-[#34A853]/10 text-[#34A853]' :
              'bg-[#f1f3f4] text-[#5f6368]'
            }`}>{p.estado}</span>
          </div>
        )
      })}
    </div>
  )
}

// ===== Evaluación Tab =====
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
    items: evaluaciones.filter(e => e.tipo === t.value)
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
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-[#f1f3f4]"
            style={{ backgroundColor: g.color + '12' }}>
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

// ===== Bitácora Tab =====
function BitacoraTab({ bitacora, onAdd, onSave, showForm, onCancelForm }) {
  const [formData, setFormData] = useState({
    tipo: 'general', descripcion: '', gravedad: 1,
    alumnos_involucrados: '', acciones_tomadas: ''
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
          <select
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value, gravedad: e.target.value === 'bullying' || e.target.value === 'violencia' ? 3 : 1 })}
            className="input-google"
          >
            {TIPOS_BITACORA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Descripción</label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            className="input-google min-h-[100px] resize-none"
            placeholder="Describe lo sucedido..."
            required
          />
        </div>

        <div>
          <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Gravedad</label>
          <input type="range" min="1" max="5" value={formData.gravedad}
            onChange={(e) => setFormData({ ...formData, gravedad: parseInt(e.target.value) })}
            className="w-full accent-[#4285F4]"
          />
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
          <button type="submit" className="btn-primary flex-1">
            <Save className="w-4 h-4" />Guardar
          </button>
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

// ===== Asistencia Tab =====
function AsistenciaTab({ fecha, asistencia, onSave }) {
  const [mode, setMode] = useState('list')
  const [alumnos, setAlumnos] = useState([{ nombre: '', grado: 1, grupo: 'Único', presente: true }])

  const addAlumno = () => setAlumnos([...alumnos, { nombre: '', grado: 1, grupo: 'Único', presente: true }])
  const updateAlumno = (idx, field, value) => {
    const n = [...alumnos]; n[idx] = { ...n[idx], [field]: value }; setAlumnos(n)
  }

  const handleSave = () => {
    onSave(alumnos.filter(a => a.nombre.trim()))
    setMode('list')
  }

  if (mode === 'list') {
    return asistencia.length === 0 ? (
      <div className="text-center py-16 text-[#9aa0a6]">
        <Users className="w-14 h-14 mx-auto mb-3 text-[#e8eaed]" />
        <p className="font-medium mb-4">No se ha pasado lista</p>
        <button onClick={() => setMode('form')} className="btn-primary">
          <Plus className="w-4 h-4" />Pasar lista
        </button>
      </div>
    ) : (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#202124]">Lista del día</h3>
          <button onClick={() => setMode('form')} className="btn-secondary text-sm py-1.5 px-3">Editar</button>
        </div>
        <div className="space-y-2">
          {asistencia.map((a, i) => (
            <div key={i} className="glass-card rounded-lg px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${a.presente ? 'bg-[#34A853]' : 'bg-[#EA4335]'}`} />
                <span className="text-sm font-medium text-[#202124]">{a.alumno_nombre}</span>
              </div>
              <span className="text-xs text-[#9aa0a6]">Grado {a.grado}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#202124] flex items-center gap-2">
          <Users className="w-4 h-4 text-[#4285F4]" />Pasar lista
        </h3>
        <button onClick={addAlumno} className="btn-secondary text-sm py-1.5 px-3">
          <Plus className="w-3.5 h-3.5" />Alumno
        </button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {alumnos.map((a, i) => (
          <div key={i} className="glass-card rounded-lg p-3 flex items-center gap-3">
            <button type="button"
              onClick={() => updateAlumno(i, 'presente', !a.presente)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                a.presente ? 'bg-[#34A853]/10 text-[#34A853]' : 'bg-[#EA4335]/10 text-[#EA4335]'
              }`}>
              {a.presente ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
            <input type="text" value={a.nombre}
              onChange={(e) => updateAlumno(i, 'nombre', e.target.value)}
              className="flex-1 px-2 py-1 text-sm bg-transparent focus:outline-none placeholder-[#9aa0a6]"
              placeholder="Nombre del alumno" />
            <select value={a.grado} onChange={(e) => updateAlumno(i, 'grado', parseInt(e.target.value))}
              className="px-2 py-1 rounded-lg bg-[#f8f9fa] text-sm border border-[#e8eaed]">
              <option value={1}>1°</option><option value={2}>2°</option><option value={3}>3°</option>
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} className="btn-primary flex-1">
          <Save className="w-4 h-4" />Guardar asistencia
        </button>
        <button onClick={() => setMode('list')} className="btn-secondary">Cancelar</button>
      </div>
    </div>
  )
}

// ===== Eventos Tab =====
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
            {e.lugar && <span>📍 {e.lugar}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default DayPanel
