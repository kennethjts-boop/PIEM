import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ArrowLeft, ClipboardList, Plus, Trash2, WifiOff } from 'lucide-react'

function toLocalYmd(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

function emptyForm() {
  return {
    fecha: toLocalYmd(new Date()),
    alumno_nombre: '',
    grado: 1,
    tipo: 'examen',
    calificacion: '',
    observaciones: '',
  }
}

export default function EvaluacionPage() {
  const navigate = useNavigate()
  const now = new Date()
  const [docente, setDocente] = useState(null)
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [evaluaciones, setEvaluaciones] = useState([])
  const [form, setForm] = useState(emptyForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [offline, setOffline] = useState(false)

  const loadEvaluaciones = async (docenteId, mesActual, anioActual) => {
    setLoading(true)
    try {
      const data = await api.getEvaluaciones(docenteId, { mes: mesActual, anio: anioActual })
      setEvaluaciones(Array.isArray(data) ? data : [])
      setOffline(false)
    } catch {
      setOffline(true)
      setEvaluaciones([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getDocentes()
      .then((ds) => {
        if (ds?.[0]) {
          setDocente(ds[0])
          return
        }
        setLoading(false)
      })
      .catch(() => {
        setOffline(true)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!docente?.id) {
      setLoading(false)
      return
    }
    loadEvaluaciones(docente.id, mes, anio)
  }, [docente, mes, anio])

  const canSave = useMemo(() => {
    const score = Number(form.calificacion)
    return form.alumno_nombre.trim().length > 0 && score >= 0 && score <= 10
  }, [form])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!docente?.id || !canSave) return
    setSaving(true)
    try {
      await api.createEvaluacion(docente.id, {
        fecha: form.fecha,
        alumno_nombre: form.alumno_nombre.trim(),
        grado: Number(form.grado),
        grupo: 'Único',
        tipo: form.tipo,
        calificacion: Number(form.calificacion),
        observaciones: form.observaciones.trim(),
      })
      await loadEvaluaciones(docente.id, mes, anio)
      setForm(emptyForm())
      setOffline(false)
    } catch {
      setOffline(true)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta evaluación?')) return
    try {
      await api.deleteEvaluacion(id)
      if (docente?.id) await loadEvaluaciones(docente.id, mes, anio)
    } catch {
      setOffline(true)
    }
  }

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#A142F4] to-[#4285F4] flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Evaluaciones</h1>
            <p className="text-xs text-[#9aa0a6]">Registro mensual de desempeño</p>
          </div>
        </div>
        <div className="flex gap-2 w-full max-w-[280px]">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="input-google text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>Mes {m}</option>)}
          </select>
          <input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="input-google text-sm" min="2020" max="2100" />
        </div>
      </header>

      <div className="alumnos-body space-y-4">
        {offline && (
          <div className="glass-card rounded-2xl p-4 flex items-center gap-2 text-sm text-[#b54708] border border-[#f8d8a5] bg-[#fffaf0]">
            <WifiOff className="w-4 h-4" />
            No fue posible sincronizar evaluaciones en este momento.
          </div>
        )}

        <form onSubmit={handleCreate} className="glass-card rounded-2xl p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <input value={form.alumno_nombre} onChange={(e) => setForm({ ...form, alumno_nombre: e.target.value })} className="input-google text-sm" placeholder="Nombre del alumno" />
            <input type="number" min="1" max="3" value={form.grado} onChange={(e) => setForm({ ...form, grado: e.target.value })} className="input-google text-sm" placeholder="Grado" />
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="input-google text-sm">
              <option value="examen">Examen</option>
              <option value="tarea">Tarea</option>
              <option value="proyecto">Proyecto</option>
              <option value="participacion">Participación</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="input-google text-sm" />
            <input type="number" min="0" max="10" step="0.1" value={form.calificacion} onChange={(e) => setForm({ ...form, calificacion: e.target.value })} className="input-google text-sm" placeholder="Calificación (0-10)" />
            <input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} className="input-google text-sm" placeholder="Observaciones" />
          </div>
          <button type="submit" disabled={!canSave || saving} className="btn-primary">
            <Plus className="w-4 h-4" />{saving ? 'Guardando…' : 'Guardar evaluación'}
          </button>
        </form>

        <div className="glass-card rounded-2xl p-5">
          {loading ? (
            <p className="text-sm text-[#6b7280]">Cargando evaluaciones…</p>
          ) : evaluaciones.length === 0 ? (
            <div className="py-10 text-center">
              <ClipboardList className="w-14 h-14 mx-auto text-[#d5dbe1]" />
              <p className="mt-3 font-semibold text-[#202124]">Sin evaluaciones en este periodo</p>
              <p className="text-sm text-[#6b7280] mt-1">Registra una evaluación para iniciar el seguimiento de logro.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {evaluaciones.map((ev) => (
                <article key={ev.id} className="rounded-xl border border-[#eceff3] p-4 bg-white/80 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#202124]">{ev.alumno_nombre}</p>
                    <p className="text-sm text-[#4b5563]">{ev.tipo} · {ev.calificacion ?? 'N/A'} · {ev.fecha}</p>
                  </div>
                  <button onClick={() => handleDelete(ev.id)} className="btn-secondary text-xs py-2 px-3 !text-[#EA4335] !border-[#f3c7c2]">
                    <Trash2 className="w-4 h-4" />Eliminar
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
