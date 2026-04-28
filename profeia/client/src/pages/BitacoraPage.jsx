import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ArrowLeft, BookOpenText, Plus, Sparkles, WifiOff } from 'lucide-react'

const TIPOS = ['general', 'bullying', 'violencia', 'asunto', 'logro']

function toLocalYmd(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

function emptyForm(fecha) {
  return {
    fecha,
    tipo: 'general',
    descripcion: '',
    gravedad: 2,
    alumnos_involucrados: '',
    acciones_tomadas: '',
  }
}

export default function BitacoraPage() {
  const navigate = useNavigate()
  const [docente, setDocente] = useState(null)
  const [fecha, setFecha] = useState(toLocalYmd(new Date()))
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState(emptyForm(toLocalYmd(new Date())))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [offline, setOffline] = useState(false)
  const [iaBadge, setIaBadge] = useState(false)

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
    setForm((prev) => ({ ...prev, fecha }))
    if (!docente?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    api.getBitacora(docente.id, fecha)
      .then((data) => {
        setEntries(Array.isArray(data) ? data : [])
        setOffline(false)
      })
      .catch(() => {
        setOffline(true)
        setEntries([])
      })
      .finally(() => setLoading(false))
  }, [docente, fecha])

  const canSave = useMemo(() => form.descripcion.trim().length > 0, [form.descripcion])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!docente?.id || !canSave) return
    setSaving(true)
    try {
      const result = await api.createBitacora(docente.id, {
        fecha,
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        gravedad: Number(form.gravedad),
        alumnos_involucrados: form.alumnos_involucrados.trim(),
        acciones_tomadas: form.acciones_tomadas.trim(),
      })
      const generated = (form.tipo === 'bullying' || form.tipo === 'violencia') && Array.isArray(result?.recommendations) && result.recommendations.length > 0
      setIaBadge(generated)
      const updated = await api.getBitacora(docente.id, fecha)
      setEntries(Array.isArray(updated) ? updated : [])
      setForm(emptyForm(fecha))
      setOffline(false)
    } catch {
      setOffline(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FBBC04] to-[#EA4335] flex items-center justify-center">
            <BookOpenText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Bitácora diaria</h1>
            <p className="text-xs text-[#9aa0a6]">Registro pedagógico y de convivencia</p>
          </div>
        </div>
        <div className="w-full max-w-[220px]">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-google text-sm" />
        </div>
      </header>

      <div className="alumnos-body space-y-4">
        {offline && (
          <div className="glass-card rounded-2xl p-4 flex items-center gap-2 text-sm text-[#b54708] border border-[#f8d8a5] bg-[#fffaf0]">
            <WifiOff className="w-4 h-4" />
            Servidor no disponible. Revisa tu conexión e intenta nuevamente.
          </div>
        )}

        {iaBadge && (
          <div className="glass-card rounded-2xl p-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6b3fa0]">
            <Sparkles className="w-4 h-4" />Sugerencia IA generada
          </div>
        )}

        <form onSubmit={handleSave} className="glass-card rounded-2xl p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#5f6368]">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="input-google text-sm mt-1">
                {TIPOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#5f6368]">Gravedad (1-5)</label>
              <input type="number" min="1" max="5" value={form.gravedad} onChange={(e) => setForm({ ...form, gravedad: e.target.value })} className="input-google text-sm mt-1" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#5f6368]">Descripción</label>
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="input-google mt-1 resize-none" rows={3} placeholder="Describe brevemente lo ocurrido" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#5f6368]">Alumnos involucrados</label>
              <input value={form.alumnos_involucrados} onChange={(e) => setForm({ ...form, alumnos_involucrados: e.target.value })} className="input-google text-sm mt-1" placeholder="Nombre(s), separados por coma" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5f6368]">Acciones tomadas</label>
              <input value={form.acciones_tomadas} onChange={(e) => setForm({ ...form, acciones_tomadas: e.target.value })} className="input-google text-sm mt-1" placeholder="Seguimiento o intervención" />
            </div>
          </div>

          <button type="submit" disabled={!canSave || saving} className="btn-primary">
            <Plus className="w-4 h-4" />{saving ? 'Guardando…' : 'Guardar entrada'}
          </button>
        </form>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#202124] mb-3">Entradas del día</h2>
          {loading ? (
            <p className="text-sm text-[#6b7280]">Cargando bitácora…</p>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpenText className="w-14 h-14 mx-auto text-[#d5dbe1]" />
              <p className="mt-3 font-semibold text-[#202124]">Hoy no hay entradas registradas</p>
              <p className="text-sm text-[#6b7280] mt-1">Cada observación suma para tomar mejores decisiones pedagógicas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-[#eceff3] p-4 bg-white/80">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-[#f3f4f6] text-[#374151] font-medium uppercase">{entry.tipo}</span>
                    <span className="text-xs text-[#9aa0a6]">Gravedad {entry.gravedad || 1}</span>
                  </div>
                  <p className="text-sm text-[#202124] mt-2">{entry.descripcion}</p>
                  {(entry.alumnos_involucrados || entry.acciones_tomadas) && (
                    <p className="text-xs text-[#6b7280] mt-2">
                      {entry.alumnos_involucrados ? `Alumnos: ${entry.alumnos_involucrados}. ` : ''}
                      {entry.acciones_tomadas ? `Acciones: ${entry.acciones_tomadas}` : ''}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
