import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import {
  X, BookOpen, FileText, Users, Check, Plus, Clock,
  AlertTriangle, ChevronDown, ChevronRight, Save, Trash2,
  GraduationCap, MessageSquare, Shield, Calendar as CalendarIcon
} from 'lucide-react'

const TIPOS_BITACORA = [
  { value: 'general', label: 'General', icon: FileText, color: 'text-blue-400' },
  { value: 'asunto', label: 'Asunto', icon: AlertTriangle, color: 'text-amber-400' },
  { value: 'reunion', label: 'Reunión', icon: Users, color: 'text-purple-400' },
  { value: 'bullying', label: 'Bullying', icon: Shield, color: 'text-red-400' },
  { value: 'violencia', label: 'Violencia', icon: Shield, color: 'text-red-500' },
  { value: 'mal_trato', label: 'Mal trato', icon: Shield, color: 'text-orange-400' },
  { value: 'evaluacion', label: 'Evaluación', icon: GraduationCap, color: 'text-green-400' },
]

function DayPanel({ date, docenteId, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('planeaciones')
  const [planeaciones, setPlaneaciones] = useState([])
  const [eventos, setEventos] = useState([])
  const [bitacora, setBitacora] = useState([])
  const [asistencia, setAsistencia] = useState([])
  const [showBitacoraForm, setShowBitacoraForm] = useState(false)
  const [showAsistencia, setShowAsistencia] = useState(false)
  const [normaActiva, setNormaActiva] = useState(null)
  const [alerts, setAlerts] = useState([])

  const fechaStr = date.toISOString().split('T')[0]
  const diaNombre = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    loadData()
  }, [fechaStr, docenteId])

  const loadData = async () => {
    try {
      const [p, e, b, a] = await Promise.all([
        api.getPlaneaciones(docenteId),
        api.getEventos(docenteId),
        api.getBitacora(docenteId, fechaStr),
        api.getAsistencia(docenteId, fechaStr)
      ])
      
      // Filter by exact date
      setPlaneaciones(p.filter(item => item.fecha === fechaStr))
      setEventos(e.filter(item => item.fecha === fechaStr))
      setBitacora(b)
      setAsistencia(a)
    } catch (e) {
      console.error('Load data error:', e)
    }
  }

  const handleAsistenciaSave = async (registros) => {
    try {
      const result = await api.saveAsistencia(docenteId, fechaStr, registros)
      setAlerts(result.alerts || [])
      loadData()
      onRefresh()
    } catch (e) {
      console.error('Save asistencia error:', e)
    }
  }

  const handleBitacoraSave = async (data) => {
    try {
      const result = await api.createBitacora(docenteId, { fecha: fechaStr, ...data })
      
      // Check for protocol suggestions
      if (result.recommendations && result.recommendations.length > 0) {
        for (const rec of result.recommendations) {
          if (rec.tipo === 'protocolo' && rec.norma) {
            setNormaActiva(rec.norma)
          }
        }
      }
      
      loadData()
      onRefresh()
      setShowBitacoraForm(false)
    } catch (e) {
      console.error('Save bitacora error:', e)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl glass border-l border-white/10 overflow-y-auto animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 glass border-b border-white/10 p-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gradient capitalize">{diaNombre}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-neon-blue" />
                  {planeaciones.length} planeaciones
                </span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                  {eventos.length} eventos
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  {bitacora.length} registros
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="p-4 space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className={`p-3 rounded-xl border ${
                alert.nivel === 'critico' 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{alert.mensaje}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Norma institucional modal */}
        {normaActiva && (
          <div className="m-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-red-400 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {normaActiva.titulo}
              </h3>
              <button onClick={() => setNormaActiva(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-300 mb-3">{normaActiva.descripcion}</p>
            <div className="bg-black/20 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Protocolo:</h4>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-['JetBrains_Mono'] text-xs">
                {normaActiva.protocolo}
              </pre>
            </div>
            <p className="text-xs text-gray-500 mt-2">Referencia: {normaActiva.referencia_legal}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto">
          {[
            { id: 'planeaciones', label: 'Planeaciones', icon: BookOpen, count: planeaciones.length },
            { id: 'bitacora', label: 'Bitácora', icon: FileText, count: bitacora.length },
            { id: 'asistencia', label: 'Asistencia', icon: Users, count: asistencia.length },
            { id: 'eventos', label: 'Eventos', icon: CalendarIcon, count: eventos.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-neon-blue text-neon-blue bg-neon-blue/5' 
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'planeaciones' && (
            <PlaneacionesTab planeaciones={planeaciones} docenteId={docenteId} onRefresh={loadData} />
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
              docenteId={docenteId}
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

// Planeaciones Tab
function PlaneacionesTab({ planeaciones, docenteId, onRefresh }) {
  if (planeaciones.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No hay planeaciones para este día</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {planeaciones.map(p => (
        <div key={p.id} className="glass-light rounded-xl p-4 hover:bg-white/5 transition-all">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-white">{p.tema}</h3>
            <span className={`badge ${p.tipo === 'codiseño' ? 'badge-evento' : 'badge-planeacion'}`}>
              {p.tipo}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-2">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-neon-blue" />
              {p.materia}
            </span>
            <span>Grado {p.grado} - Grupo {p.grupo}</span>
          </div>
          {p.objetivo && (
            <p className="text-sm text-gray-500 mb-2"><strong>Objetivo:</strong> {p.objetivo}</p>
          )}
          {p.actividades && (
            <div className="text-sm text-gray-500">
              <strong>Actividades:</strong>
              <pre className="whitespace-pre-wrap mt-1 font-sans text-xs">{p.actividades}</pre>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span className={`px-2 py-0.5 rounded ${
              p.estado === 'pendiente' ? 'bg-amber-500/20 text-amber-400' :
              p.estado === 'completado' ? 'bg-green-500/20 text-green-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {p.estado}
            </span>
            {p.evaluacion && (
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                {p.evaluacion.split(',')[0]}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Bitacora Tab
function BitacoraTab({ bitacora, onAdd, onSave, showForm, onCancelForm }) {
  const [formData, setFormData] = useState({
    tipo: 'general',
    descripcion: '',
    gravedad: 1,
    alumnos_involucrados: '',
    acciones_tomadas: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div>
      {showForm ? (
        <form onSubmit={handleSubmit} className="glass-light rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nueva entrada de bitácora
          </h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tipo</label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({...formData, tipo: e.target.value, gravedad: e.target.value === 'bullying' || e.target.value === 'violencia' ? 3 : 1})}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-neon-purple/50"
            >
              {TIPOS_BITACORA.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-neon-purple/50 min-h-[100px]"
              placeholder="Describe lo sucedido..."
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Gravedad (1-5)</label>
            <input
              type="range"
              min="1"
              max="5"
              value={formData.gravedad}
              onChange={(e) => setFormData({...formData, gravedad: parseInt(e.target.value)})}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Leve</span>
              <span className={`font-semibold ${formData.gravedad >= 4 ? 'text-red-400' : formData.gravedad >= 3 ? 'text-amber-400' : 'text-green-400'}`}>
                Nivel {formData.gravedad}
              </span>
              <span>Grave</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Alumnos involucrados (opcional)</label>
            <input
              type="text"
              value={formData.alumnos_involucrados}
              onChange={(e) => setFormData({...formData, alumnos_involucrados: e.target.value})}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-neon-purple/50"
              placeholder="Nombres separados por coma"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Acciones tomadas (opcional)</label>
            <textarea
              value={formData.acciones_tomadas}
              onChange={(e) => setFormData({...formData, acciones_tomadas: e.target.value})}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-neon-purple/50 min-h-[60px]"
              placeholder="¿Qué acciones se realizaron?"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2 rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple font-semibold hover:opacity-90 transition-all">
              <Save className="w-4 h-4 inline mr-1" />
              Guardar
            </button>
            <button type="button" onClick={onCancelForm} className="px-4 py-2 rounded-lg glass-light hover:bg-white/10 transition-all">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <button
            onClick={onAdd}
            className="w-full py-3 rounded-xl border-2 border-dashed border-white/20 text-gray-400 hover:border-neon-purple/50 hover:text-neon-purple transition-all mb-4 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar entrada de bitácora
          </button>

          <div className="space-y-3">
            {bitacora.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay entradas de bitácora para este día</p>
              </div>
            ) : (
              bitacora.map(entry => {
                const tipoInfo = TIPOS_BITACORA.find(t => t.value === entry.tipo) || TIPOS_BITACORA[0]
                const Icon = tipoInfo.icon
                return (
                  <div key={entry.id} className="glass-light rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${tipoInfo.color}`} />
                        <span className="font-medium text-sm">{tipoInfo.label}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        entry.gravedad >= 4 ? 'bg-red-500/20 text-red-400' :
                        entry.gravedad >= 3 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        Gravedad: {entry.gravedad}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{entry.descripcion}</p>
                    {entry.alumnos_involucrados && (
                      <p className="text-xs text-gray-500">
                        <strong>Alumnos:</strong> {entry.alumnos_involucrados}
                      </p>
                    )}
                    {entry.acciones_tomadas && (
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Acciones:</strong> {entry.acciones_tomadas}
                      </p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Asistencia Tab
function AsistenciaTab({ fecha, docenteId, asistencia, onSave }) {
  const [mode, setMode] = useState('list') // list | form
  const [alumnos, setAlumnos] = useState([
    { nombre: '', grado: 1, grupo: 'Único', presente: true }
  ])

  const addAlumno = () => {
    setAlumnos([...alumnos, { nombre: '', grado: 1, grupo: 'Único', presente: true }])
  }

  const updateAlumno = (idx, field, value) => {
    const newAlumnos = [...alumnos]
    newAlumnos[idx] = { ...newAlumnos[idx], [field]: value }
    setAlumnos(newAlumnos)
  }

  const handleSave = () => {
    const validos = alumnos.filter(a => a.nombre.trim())
    onSave(validos)
    setMode('list')
  }

  if (mode === 'list') {
    return (
      <div>
        {asistencia.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="mb-4">No se ha pasado lista este día</p>
            <button
              onClick={() => setMode('form')}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-neon-green to-neon-blue text-gray-900 font-semibold hover:opacity-90 transition-all"
            >
              Pasar lista
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Lista del día</h3>
              <button
                onClick={() => setMode('form')}
                className="px-4 py-2 rounded-lg glass-light text-sm hover:bg-white/10 transition-all"
              >
                Editar
              </button>
            </div>
            <div className="space-y-2">
              {asistencia.map((a, i) => (
                <div key={i} className="flex items-center justify-between glass-light rounded-lg px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${a.presente ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-sm">{a.alumno_nombre}</span>
                  </div>
                  <span className="text-xs text-gray-500">Grado {a.grado}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Pasar lista
        </h3>
        <button onClick={addAlumno} className="px-3 py-1 rounded-lg glass-light text-sm hover:bg-white/10">
          <Plus className="w-3.5 h-3.5 inline mr-1" />
          Alumno
        </button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {alumnos.map((a, i) => (
          <div key={i} className="glass-light rounded-lg p-3 flex items-center gap-3">
            <button
              onClick={() => updateAlumno(i, 'presente', !a.presente)}
              className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                a.presente ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
              }`}
            >
              {a.presente ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={a.nombre}
              onChange={(e) => updateAlumno(i, 'nombre', e.target.value)}
              placeholder="Nombre del alumno"
              className="flex-1 px-2 py-1 rounded bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-neon-blue/50"
            />
            <select
              value={a.grado}
              onChange={(e) => updateAlumno(i, 'grado', parseInt(e.target.value))}
              className="px-2 py-1 rounded bg-white/5 text-sm border border-white/10"
            >
              <option value={1}>1°</option>
              <option value={2}>2°</option>
              <option value={3}>3°</option>
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 py-2 rounded-lg bg-gradient-to-r from-neon-green to-neon-blue text-gray-900 font-semibold hover:opacity-90 transition-all"
        >
          <Save className="w-4 h-4 inline mr-1" />
          Guardar asistencia
        </button>
        <button
          onClick={() => setMode('list')}
          className="px-4 py-2 rounded-lg glass-light hover:bg-white/10 transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// Eventos Tab
function EventosTab({ eventos }) {
  if (eventos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No hay eventos para este día</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {eventos.map(e => (
        <div key={e.id} className="glass-light rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{e.titulo}</h3>
            <span className="badge badge-evento">{e.tipo}</span>
          </div>
          {e.descripcion && <p className="text-sm text-gray-400 mb-2">{e.descripcion}</p>}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {e.hora_inicio && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {e.hora_inicio} - {e.hora_fin || 'Sin hora fin'}
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
