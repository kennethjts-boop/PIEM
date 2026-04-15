import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import {
  ArrowLeft, Plus, Search, Users, User, Save, Trash2,
  ChevronRight, BookOpen, FileText, Activity, X, Edit2
} from 'lucide-react'

const GRADOS = [1, 2, 3]
const NIVELES = ['Inicial', 'Básico', 'En proceso', 'Satisfactorio', 'Destacado']
const SEXOS = ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir']

function emptyForm() {
  return {
    nombre: '', curp: '', fecha_nacimiento: '', sexo: '', direccion: '',
    telefono_familiar: '', nombre_tutor: '', telefono_tutor: '', email_tutor: '',
    grado: 1, grupo: 'Único', numero_lista: '', ciclo_escolar: '2025-2026',
    nivel_lectura: '', nivel_matematicas: '', observaciones_generales: '',
    necesidades_especiales: '', situacion_socioemocional: '', fecha_diagnostico: ''
  }
}

export default function AlumnosPage() {
  const navigate = useNavigate()
  const [docente, setDocente] = useState(null)
  const [alumnos, setAlumnos] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [filterGrado, setFilterGrado] = useState('')
  const [mode, setMode] = useState('list') // list | form | profile
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [diagnosticos, setDiagnosticos] = useState([])
  const [diagForm, setDiagForm] = useState({ trimestre: 1, fecha: '', avances: '', areas_oportunidad: '', ajuste_planeacion: '' })
  const [showDiagForm, setShowDiagForm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getDocentes().then(ds => { if (ds[0]) { setDocente(ds[0]); loadAlumnos(ds[0].id) } }).catch(() => {})
  }, [])

  useEffect(() => {
    let result = alumnos
    if (search) result = result.filter(a => a.nombre.toLowerCase().includes(search.toLowerCase()))
    if (filterGrado) result = result.filter(a => a.grado === parseInt(filterGrado))
    setFiltered(result)
  }, [alumnos, search, filterGrado])

  const loadAlumnos = async (id) => {
    try { setAlumnos(await api.getAlumnos(id)) } catch {}
  }

  const loadDiagnosticos = async (alumnoId) => {
    try { setDiagnosticos(await api.getDiagnosticos(alumnoId)) } catch {}
  }

  const openNew = () => { setForm(emptyForm()); setSelected(null); setMode('form') }
  const openEdit = (alumno) => { setForm({ ...alumno }); setSelected(alumno); setMode('form') }
  const openProfile = (alumno) => { setSelected(alumno); loadDiagnosticos(alumno.id); setMode('profile') }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!docente) return
    setSaving(true)
    try {
      if (selected) {
        await api.updateAlumno(selected.id, form)
      } else {
        await api.createAlumno(docente.id, form)
      }
      await loadAlumnos(docente.id)
      setMode('list')
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este alumno?')) return
    try { await api.deleteAlumno(id); await loadAlumnos(docente.id) } catch {}
  }

  const handleSaveDiag = async (e) => {
    e.preventDefault()
    if (!selected) return
    try {
      await api.createDiagnostico(selected.id, diagForm)
      await loadDiagnosticos(selected.id)
      setShowDiagForm(false)
    } catch {}
  }

  return (
    <div className="alumnos-page">
      {/* Header */}
      <header className="alumnos-header">
        <button onClick={() => navigate('/')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#EA4335] to-[#FBBC04] flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Mis Alumnos</h1>
            <p className="text-xs text-[#9aa0a6]">{alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''} registrado{alumnos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {mode === 'list' && (
          <button onClick={openNew} className="btn-primary text-sm py-2 px-4">
            <Plus className="w-4 h-4" />Agregar alumno
          </button>
        )}
        {mode !== 'list' && (
          <button onClick={() => setMode('list')} className="btn-secondary text-sm py-2 px-3">
            <X className="w-4 h-4" />Cerrar
          </button>
        )}
      </header>

      <div className="alumnos-body">

        {/* ===== LIST ===== */}
        {mode === 'list' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9aa0a6]" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="input-google pl-9 text-sm" placeholder="Buscar por nombre…" />
              </div>
              <select value={filterGrado} onChange={e => setFilterGrado(e.target.value)} className="input-google text-sm w-32">
                <option value="">Todos los grados</option>
                <option value="1">1° Grado</option>
                <option value="2">2° Grado</option>
                <option value="3">3° Grado</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 text-[#9aa0a6]">
                <Users className="w-16 h-16 mx-auto mb-4 text-[#e8eaed]" />
                <p className="font-medium text-lg">No hay alumnos registrados</p>
                <p className="text-sm mt-1">Agrega tu primer alumno para comenzar</p>
                <button onClick={openNew} className="btn-primary mt-6">
                  <Plus className="w-4 h-4" />Agregar primer alumno
                </button>
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden">
                <table className="alumnos-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Nombre</th><th>Grado</th><th>Grupo</th>
                      <th>Tutor</th><th>Teléfono</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => (
                      <tr key={a.id} onClick={() => openProfile(a)} className="cursor-pointer">
                        <td className="text-[#9aa0a6] text-xs">{a.numero_lista || '–'}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4285F4] to-[#A142F4] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {a.nombre.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-[#202124] text-sm">{a.nombre}</span>
                          </div>
                        </td>
                        <td><span className="badge-grado">{a.grado}°</span></td>
                        <td className="text-sm text-[#5f6368]">{a.grupo}</td>
                        <td className="text-sm text-[#5f6368]">{a.nombre_tutor || '–'}</td>
                        <td className="text-sm text-[#5f6368]">{a.telefono_tutor || a.telefono_familiar || '–'}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-[#f1f3f4] text-[#9aa0a6] hover:text-[#4285F4] transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-[#f1f3f4] text-[#9aa0a6] hover:text-[#EA4335] transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== FORM ===== */}
        {mode === 'form' && (
          <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <h2 className="text-base font-bold text-[#202124] flex items-center gap-2">
                <User className="w-4 h-4 text-[#4285F4]" />Datos Personales
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nombre completo *" className="col-span-2">
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    className="input-google" placeholder="Apellidos, Nombre" required />
                </FormField>
                <FormField label="CURP">
                  <input value={form.curp} onChange={e => setForm({...form, curp: e.target.value.toUpperCase()})}
                    className="input-google" placeholder="XXXX000000XXXXXX00" maxLength={18} />
                </FormField>
                <FormField label="Fecha de nacimiento">
                  <input type="date" value={form.fecha_nacimiento} onChange={e => setForm({...form, fecha_nacimiento: e.target.value})}
                    className="input-google" />
                </FormField>
                <FormField label="Sexo">
                  <select value={form.sexo} onChange={e => setForm({...form, sexo: e.target.value})} className="input-google">
                    <option value="">Seleccionar…</option>
                    {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Teléfono familiar">
                  <input value={form.telefono_familiar} onChange={e => setForm({...form, telefono_familiar: e.target.value})}
                    className="input-google" placeholder="10 dígitos" />
                </FormField>
                <FormField label="Dirección" className="col-span-2">
                  <input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})}
                    className="input-google" placeholder="Calle, número, colonia" />
                </FormField>
              </div>

              <h3 className="text-sm font-bold text-[#5f6368] pt-2 border-t border-[#f1f3f4]">Tutor / Padre / Madre</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nombre del tutor">
                  <input value={form.nombre_tutor} onChange={e => setForm({...form, nombre_tutor: e.target.value})}
                    className="input-google" />
                </FormField>
                <FormField label="Teléfono del tutor">
                  <input value={form.telefono_tutor} onChange={e => setForm({...form, telefono_tutor: e.target.value})}
                    className="input-google" />
                </FormField>
                <FormField label="Email del tutor" className="col-span-2">
                  <input type="email" value={form.email_tutor} onChange={e => setForm({...form, email_tutor: e.target.value})}
                    className="input-google" />
                </FormField>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 space-y-5">
              <h2 className="text-base font-bold text-[#202124] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#34A853]" />Datos Escolares
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <FormField label="Grado">
                  <select value={form.grado} onChange={e => setForm({...form, grado: parseInt(e.target.value)})} className="input-google">
                    {GRADOS.map(g => <option key={g} value={g}>{g}°</option>)}
                  </select>
                </FormField>
                <FormField label="Grupo">
                  <input value={form.grupo} onChange={e => setForm({...form, grupo: e.target.value})}
                    className="input-google" placeholder="Único, A, B…" />
                </FormField>
                <FormField label="Núm. de lista">
                  <input type="number" min="1" value={form.numero_lista} onChange={e => setForm({...form, numero_lista: e.target.value})}
                    className="input-google" />
                </FormField>
                <FormField label="Ciclo escolar">
                  <input value={form.ciclo_escolar} onChange={e => setForm({...form, ciclo_escolar: e.target.value})}
                    className="input-google" placeholder="2025-2026" />
                </FormField>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 space-y-5">
              <h2 className="text-base font-bold text-[#202124] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#EA4335]" />Diagnóstico Inicial
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nivel de lectura">
                  <select value={form.nivel_lectura} onChange={e => setForm({...form, nivel_lectura: e.target.value})} className="input-google">
                    <option value="">Seleccionar…</option>
                    {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </FormField>
                <FormField label="Nivel de matemáticas">
                  <select value={form.nivel_matematicas} onChange={e => setForm({...form, nivel_matematicas: e.target.value})} className="input-google">
                    <option value="">Seleccionar…</option>
                    {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </FormField>
                <FormField label="Fecha del diagnóstico">
                  <input type="date" value={form.fecha_diagnostico} onChange={e => setForm({...form, fecha_diagnostico: e.target.value})}
                    className="input-google" />
                </FormField>
              </div>
              <FormField label="Necesidades educativas especiales">
                <textarea value={form.necesidades_especiales} onChange={e => setForm({...form, necesidades_especiales: e.target.value})}
                  className="input-google resize-none" rows={2} />
              </FormField>
              <FormField label="Situación socioemocional inicial">
                <textarea value={form.situacion_socioemocional} onChange={e => setForm({...form, situacion_socioemocional: e.target.value})}
                  className="input-google resize-none" rows={2} />
              </FormField>
              <FormField label="Observaciones generales">
                <textarea value={form.observaciones_generales} onChange={e => setForm({...form, observaciones_generales: e.target.value})}
                  className="input-google resize-none" rows={3} />
              </FormField>
            </div>

            <div className="flex gap-3 pb-8">
              <button type="submit" disabled={saving} className="btn-primary flex-1 text-base py-3">
                <Save className="w-4 h-4" />{saving ? 'Guardando…' : selected ? 'Actualizar alumno' : 'Guardar alumno'}
              </button>
              <button type="button" onClick={() => setMode('list')} className="btn-secondary px-6">Cancelar</button>
            </div>
          </form>
        )}

        {/* ===== PROFILE ===== */}
        {mode === 'profile' && selected && (
          <div className="space-y-5 max-w-3xl">
            {/* Header card */}
            <div className="glass-card-elevated rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4285F4] to-[#A142F4] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {selected.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[#202124]">{selected.nombre}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="badge-grado">{selected.grado}° Grado</span>
                    <span className="text-sm text-[#5f6368]">Grupo: {selected.grupo}</span>
                    {selected.ciclo_escolar && <span className="text-sm text-[#9aa0a6]">{selected.ciclo_escolar}</span>}
                  </div>
                  {selected.curp && <p className="text-xs text-[#9aa0a6] mt-1 font-mono">{selected.curp}</p>}
                </div>
                <button onClick={() => openEdit(selected)} className="btn-secondary text-sm py-2 px-3 flex-shrink-0">
                  <Edit2 className="w-3.5 h-3.5" />Editar
                </button>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              <InfoCard title="Contacto familiar" color="#4285F4">
                {selected.nombre_tutor && <InfoRow label="Tutor" value={selected.nombre_tutor} />}
                {selected.telefono_tutor && <InfoRow label="Tel. tutor" value={selected.telefono_tutor} />}
                {selected.telefono_familiar && <InfoRow label="Tel. familiar" value={selected.telefono_familiar} />}
                {selected.email_tutor && <InfoRow label="Email" value={selected.email_tutor} />}
                {selected.direccion && <InfoRow label="Dirección" value={selected.direccion} />}
              </InfoCard>

              <InfoCard title="Diagnóstico inicial" color="#EA4335">
                {selected.nivel_lectura && <InfoRow label="Lectura" value={selected.nivel_lectura} colored />}
                {selected.nivel_matematicas && <InfoRow label="Matemáticas" value={selected.nivel_matematicas} colored />}
                {selected.fecha_diagnostico && <InfoRow label="Fecha diag." value={selected.fecha_diagnostico} />}
                {selected.necesidades_especiales && <InfoRow label="NEE" value={selected.necesidades_especiales} />}
                {selected.situacion_socioemocional && <InfoRow label="Socioemocional" value={selected.situacion_socioemocional} />}
              </InfoCard>
            </div>

            {selected.observaciones_generales && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs font-semibold text-[#9aa0a6] uppercase tracking-wide mb-1">Observaciones</p>
                <p className="text-sm text-[#5f6368]">{selected.observaciones_generales}</p>
              </div>
            )}

            {/* Trimestral diagnostics */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#202124] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#A142F4]" />Diagnósticos Trimestrales
                </h3>
                <button onClick={() => setShowDiagForm(v => !v)} className="btn-secondary text-sm py-1.5 px-3">
                  <Plus className="w-3.5 h-3.5" />Agregar
                </button>
              </div>

              {showDiagForm && (
                <form onSubmit={handleSaveDiag} className="bg-[#f8f9fa] rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Trimestre">
                      <select value={diagForm.trimestre} onChange={e => setDiagForm({...diagForm, trimestre: parseInt(e.target.value)})} className="input-google text-sm">
                        <option value={1}>Trimestre 1</option>
                        <option value={2}>Trimestre 2</option>
                        <option value={3}>Trimestre 3</option>
                      </select>
                    </FormField>
                    <FormField label="Fecha">
                      <input type="date" value={diagForm.fecha} onChange={e => setDiagForm({...diagForm, fecha: e.target.value})} className="input-google text-sm" />
                    </FormField>
                  </div>
                  <FormField label="Avances">
                    <textarea value={diagForm.avances} onChange={e => setDiagForm({...diagForm, avances: e.target.value})}
                      className="input-google resize-none text-sm" rows={2} placeholder="Logros y avances del trimestre…" />
                  </FormField>
                  <FormField label="Áreas de oportunidad">
                    <textarea value={diagForm.areas_oportunidad} onChange={e => setDiagForm({...diagForm, areas_oportunidad: e.target.value})}
                      className="input-google resize-none text-sm" rows={2} placeholder="Aspectos a reforzar…" />
                  </FormField>
                  <FormField label="Ajuste de planeación sugerido">
                    <textarea value={diagForm.ajuste_planeacion} onChange={e => setDiagForm({...diagForm, ajuste_planeacion: e.target.value})}
                      className="input-google resize-none text-sm" rows={2} placeholder="Estrategias recomendadas…" />
                  </FormField>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-sm py-2 flex-1"><Save className="w-3.5 h-3.5" />Guardar</button>
                    <button type="button" onClick={() => setShowDiagForm(false)} className="btn-secondary text-sm py-2">Cancelar</button>
                  </div>
                </form>
              )}

              {diagnosticos.length === 0 ? (
                <p className="text-sm text-[#9aa0a6] text-center py-4">Sin diagnósticos trimestrales registrados</p>
              ) : (
                <div className="space-y-3">
                  {diagnosticos.map(d => (
                    <div key={d.id} className="rounded-xl border border-[#e8eaed] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#A142F4]/10 text-[#A142F4]">
                          Trimestre {d.trimestre}
                        </span>
                        {d.fecha && <span className="text-xs text-[#9aa0a6]">{d.fecha}</span>}
                      </div>
                      {d.avances && <><p className="text-xs font-semibold text-[#34A853]">Avances</p><p className="text-sm text-[#5f6368] mb-2">{d.avances}</p></>}
                      {d.areas_oportunidad && <><p className="text-xs font-semibold text-[#FBBC04]">Áreas de oportunidad</p><p className="text-sm text-[#5f6368] mb-2">{d.areas_oportunidad}</p></>}
                      {d.ajuste_planeacion && <><p className="text-xs font-semibold text-[#4285F4]">Ajuste sugerido</p><p className="text-sm text-[#5f6368]">{d.ajuste_planeacion}</p></>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FormField({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-[#5f6368] mb-1">{label}</label>
      {children}
    </div>
  )
}

function InfoCard({ title, color, children }) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children)
  if (!hasContent) return null
  return (
    <div className="glass-card rounded-xl p-4" style={{ borderTop: `3px solid ${color}` }}>
      <p className="text-xs font-bold text-[#5f6368] uppercase tracking-wide mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, colored }) {
  if (!value) return null
  const levelColors = { 'Inicial': '#EA4335', 'Básico': '#FBBC04', 'En proceso': '#F59E0B', 'Satisfactorio': '#34A853', 'Destacado': '#4285F4' }
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-[#9aa0a6] min-w-[80px] text-xs">{label}</span>
      {colored && levelColors[value] ? (
        <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: levelColors[value] + '20', color: levelColors[value] }}>{value}</span>
      ) : (
        <span className="text-[#202124] text-xs">{value}</span>
      )}
    </div>
  )
}
