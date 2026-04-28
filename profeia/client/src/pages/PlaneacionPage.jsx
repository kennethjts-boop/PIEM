import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ArrowLeft, BookOpen, WifiOff } from 'lucide-react'

export default function PlaneacionPage() {
  const navigate = useNavigate()
  const today = new Date()
  const [docente, setDocente] = useState(null)
  const [mes, setMes] = useState(today.getMonth() + 1)
  const [anio, setAnio] = useState(today.getFullYear())
  const [planeaciones, setPlaneaciones] = useState([])
  const [materiaFiltro, setMateriaFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

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
    setLoading(true)
    api.getPlaneaciones(docente.id, mes, anio)
      .then((data) => {
        setPlaneaciones(Array.isArray(data) ? data : [])
        setOffline(false)
      })
      .catch(() => {
        setOffline(true)
        setPlaneaciones([])
      })
      .finally(() => setLoading(false))
  }, [docente, mes, anio])

  const materias = useMemo(() => {
    return [...new Set(planeaciones.map((p) => p.materia).filter(Boolean))]
  }, [planeaciones])

  const filtradas = useMemo(() => {
    return planeaciones.filter((p) => {
      if (materiaFiltro && p.materia !== materiaFiltro) return false
      if (estadoFiltro && String(p.estado || '').toLowerCase() !== estadoFiltro) return false
      return true
    })
  }, [planeaciones, materiaFiltro, estadoFiltro])

  const agrupadas = useMemo(() => {
    return filtradas.reduce((acc, item) => {
      const key = item.fecha || 'Sin fecha'
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }, [filtradas])

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#A142F4] flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Planeaciones del mes</h1>
            <p className="text-xs text-[#9aa0a6]">Consulta y seguimiento (solo lectura)</p>
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
            No fue posible cargar planeaciones. Mostrando estado local vacío.
          </div>
        )}

        <div className="glass-card rounded-2xl p-4 grid sm:grid-cols-2 gap-3">
          <select value={materiaFiltro} onChange={(e) => setMateriaFiltro(e.target.value)} className="input-google text-sm">
            <option value="">Todas las materias</option>
            {materias.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="input-google text-sm">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="completado">Completado</option>
            <option value="reprogramado">Reprogramado</option>
          </select>
        </div>

        <div className="glass-card rounded-2xl p-5">
          {loading ? (
            <p className="text-sm text-[#6b7280]">Cargando planeaciones…</p>
          ) : filtradas.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpen className="w-14 h-14 mx-auto text-[#d5dbe1]" />
              <p className="mt-3 font-semibold text-[#202124]">No hay planeaciones para este periodo</p>
              <p className="text-sm text-[#6b7280] mt-1">Ajusta filtros o cambia de mes para revisar otras sesiones.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(agrupadas).map(([fecha, items]) => (
                <section key={fecha}>
                  <h3 className="text-sm font-bold text-[#374151] mb-2">{fecha}</h3>
                  <div className="space-y-2">
                    {items.map((p) => (
                      <article key={p.id} className="rounded-xl border border-[#eceff3] p-4 bg-white/80">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="font-semibold text-[#202124]">{p.tema || 'Sin tema'}</p>
                          <span className="text-xs px-2 py-1 rounded-full bg-[#eef4ff] text-[#2d5da8] font-medium">{p.estado || 'pendiente'}</span>
                        </div>
                        <p className="text-sm text-[#4b5563] mt-1">{p.materia || 'Sin materia'} · Grado {p.grado || 'N/A'}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
