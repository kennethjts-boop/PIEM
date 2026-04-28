import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useCurrentDocente } from '../lib/currentDocente'
import { ArrowLeft, CalendarDays, CheckCircle2, Users, WifiOff } from 'lucide-react'

function toLocalYmd(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

export default function AsistenciaPage() {
  const navigate = useNavigate()
  const {
    docente,
    docentes,
    loading: docenteLoading,
    sourceUnavailable,
    selectionRequired,
    selectDocente,
  } = useCurrentDocente()
  const [fecha, setFecha] = useState(toLocalYmd(new Date()))
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [offline, setOffline] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!docente?.id) {
      setRegistros([])
      setLoading(docenteLoading)
      return
    }

    setLoading(true)
    Promise.all([
      api.getAlumnos(docente.id),
      api.getAsistencia(docente.id, fecha),
    ])
      .then(([alumnos, asistencia]) => {
        const asistenciaMap = new Map(
          (Array.isArray(asistencia) ? asistencia : []).map((a) => [
            `${String(a.alumno_nombre || '').toLowerCase()}-${a.grado}-${a.grupo || 'Único'}`,
            a,
          ])
        )

        const base = Array.isArray(alumnos) ? alumnos : []
        const next = base.map((a) => {
          const key = `${String(a.nombre || '').toLowerCase()}-${a.grado}-${a.grupo || 'Único'}`
          const previo = asistenciaMap.get(key)
          return {
            alumno_nombre: a.nombre,
            grado: Number(a.grado || 1),
            grupo: a.grupo || 'Único',
            presente: previo ? Boolean(previo.presente) : true,
            justificacion: previo?.justificacion || '',
          }
        })

        setRegistros(next)
        setOffline(false)
      })
      .catch(() => {
        setOffline(true)
        setRegistros([])
      })
      .finally(() => setLoading(false))
  }, [docente?.id, fecha, docenteLoading])

  const totals = useMemo(() => {
    const presentes = registros.filter((r) => r.presente).length
    return {
      presentes,
      ausentes: registros.length - presentes,
      total: registros.length,
    }
  }, [registros])

  const toggleAsistencia = (index, presente) => {
    setRegistros((prev) => prev.map((item, idx) => {
      if (idx !== index) return item
      return {
        ...item,
        presente,
        justificacion: presente ? '' : item.justificacion,
      }
    }))
  }

  const updateJustificacion = (index, value) => {
    setRegistros((prev) => prev.map((item, idx) => idx === index ? { ...item, justificacion: value } : item))
  }

  const handleSave = async () => {
    if (!docente?.id || registros.length === 0) return
    setSaving(true)
    setNotice('')
    try {
      await api.saveAsistencia(docente.id, fecha, registros)
      setNotice('Asistencia guardada correctamente.')
      setOffline(false)
    } catch {
      setOffline(true)
      setNotice('No fue posible conectar con el servidor. Intenta nuevamente.')
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#34A853] to-[#4285F4] flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Asistencia diaria</h1>
            <p className="text-xs text-[#9aa0a6]">{new Date(fecha).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="w-full max-w-[220px]">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-google text-sm" />
        </div>
        {docentes.length > 1 && (
          <div className="w-full max-w-[220px]">
            <select
              value={docente?.id || ''}
              onChange={(e) => selectDocente(Number(e.target.value))}
              className="input-google text-sm"
            >
              <option value="">Selecciona docente</option>
              {docentes.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre || `Docente ${item.id}`}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      <div className="alumnos-body space-y-4">
        {(offline || sourceUnavailable) && (
          <div className="glass-card rounded-2xl p-4 flex items-center gap-2 text-sm text-[#b54708] border border-[#f8d8a5] bg-[#fffaf0]">
            <WifiOff className="w-4 h-4" />
            Modo offline: no pudimos sincronizar con el servidor.
          </div>
        )}

        {selectionRequired && (
          <div className="glass-card rounded-2xl p-4 text-sm text-[#5f6368]">
            Hay múltiples docentes disponibles. Selecciona uno para continuar.
          </div>
        )}

        {notice && (
          <div className="glass-card rounded-2xl p-4 text-sm font-medium text-[#1f2937]">{notice}</div>
        )}

        {loading ? (
          <div className="glass-card rounded-2xl p-8 text-sm text-[#5f6368]">Cargando asistencia…</div>
        ) : registros.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-[#d0d7de]" />
            <p className="font-semibold text-[#202124] text-lg">Aún no tienes alumnos registrados</p>
            <p className="text-sm text-[#6b7280] mt-1">Agrega alumnos para comenzar a pasar lista.</p>
            <button onClick={() => navigate('/alumnos')} className="btn-primary mt-6">Ir a Alumnos</button>
          </div>
        ) : (
          <>
            <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm text-[#5f6368]">Total: <strong>{totals.total}</strong></div>
              <div className="text-sm text-[#34A853] font-semibold">Presentes: {totals.presentes}</div>
              <div className="text-sm text-[#EA4335] font-semibold">Ausentes: {totals.ausentes}</div>
            </div>

            <div className="space-y-3">
              {registros.map((item, idx) => (
                <div key={`${item.alumno_nombre}-${idx}`} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-[#202124]">{item.alumno_nombre}</p>
                      <p className="text-xs text-[#9aa0a6]">{item.grado}° · {item.grupo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAsistencia(idx, true)}
                        className={`btn-secondary text-xs py-2 px-3 ${item.presente ? '!border-[#34A853] !text-[#34A853]' : ''}`}
                      >
                        Presente
                      </button>
                      <button
                        onClick={() => toggleAsistencia(idx, false)}
                        className={`btn-secondary text-xs py-2 px-3 ${!item.presente ? '!border-[#EA4335] !text-[#EA4335]' : ''}`}
                      >
                        Ausente
                      </button>
                    </div>
                  </div>

                  {!item.presente && (
                    <div className="mt-3">
                      <label className="text-xs text-[#5f6368] font-medium">Justificación</label>
                      <input
                        value={item.justificacion}
                        onChange={(e) => updateJustificacion(idx, e.target.value)}
                        className="input-google text-sm mt-1"
                        placeholder="Motivo de ausencia"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 text-base">
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Guardando…' : 'Guardar asistencia'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
