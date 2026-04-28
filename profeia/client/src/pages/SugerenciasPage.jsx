import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ArrowLeft, Bot, Check, Sparkles, WifiOff, X } from 'lucide-react'

const PILOT_ORIGIN = 'ProfeIA · modo piloto'

function fallbackPiloto() {
  return [
    {
      id: `pilot-${Date.now()}-1`,
      titulo: 'Refuerza apertura de clase',
      descripcion: 'Inicia con una pregunta detonadora y cierre con evidencia rápida por equipo.',
      prioridad: 'media',
      origen: PILOT_ORIGIN,
      acciones_sugeridas: ['Pregunta de recuperación', 'Cierre de 3 minutos con rúbrica breve'],
      piloto: true,
      aceptada: false,
      rechazada: false,
    },
  ]
}

function normalizeAcciones(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object') return Object.values(parsed).map(String)
      return [value]
    } catch {
      return value ? [value] : []
    }
  }
  if (value && typeof value === 'object') return Object.values(value).map(String)
  return []
}

function toPriorityLabel(priority) {
  const normalized = String(priority || '').toLowerCase()
  if (normalized === 'urgente' || normalized === 'alta') return 'urgente'
  if (normalized === 'media') return 'recordatorio'
  return 'sugerencia'
}

function badgeClass(priority) {
  const normalized = String(priority || '').toLowerCase()
  if (normalized === 'urgente' || normalized === 'alta') return 'bg-[#ffe9e6] text-[#c43f2f] border-[#f8c4bc]'
  if (normalized === 'media') return 'bg-[#fff6df] text-[#9c6a00] border-[#f5df9f]'
  return 'bg-[#eaf8ef] text-[#1e7c44] border-[#bee8cd]'
}

function isOfflineError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = String(error?.message || '').toLowerCase()
  return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('network request failed')
}

export default function SugerenciasPage() {
  const navigate = useNavigate()
  const [docente, setDocente] = useState(null)
  const [sugerencias, setSugerencias] = useState([])
  const [tab, setTab] = useState('urgente')
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  const loadSugerencias = async (docenteId) => {
    setLoading(true)
    try {
      const data = await api.getSugerencias(docenteId)
      const filtered = (Array.isArray(data) ? data : []).filter((s) => !s?.aceptada && !s?.rechazada)
      setSugerencias(filtered)
      setOffline(false)
    } catch (error) {
      if (isOfflineError(error)) {
        setOffline(true)
        setSugerencias(fallbackPiloto())
      } else {
        setOffline(false)
        setSugerencias([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getDocentes()
      .then((ds) => {
        if (ds?.[0]) {
          setDocente(ds[0])
          return loadSugerencias(ds[0].id)
        }
        setLoading(false)
      })
      .catch(() => {
        setOffline(true)
        setSugerencias(fallbackPiloto())
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    return sugerencias.filter((s) => toPriorityLabel(s.prioridad) === tab)
  }, [sugerencias, tab])

  const handleResolve = async (item, action) => {
    const isPilot = item?.piloto || String(item?.id || '').startsWith('pilot-')

    if (isPilot || !docente?.id) {
      setSugerencias((prev) => prev.filter((s) => s.id !== item.id))
      return
    }

    try {
      if (action === 'accept') await api.aceptarSugerencia(docente.id, item.id)
      if (action === 'reject') await api.rechazarSugerencia(docente.id, item.id)
      await loadSugerencias(docente.id)
    } catch {
      setOffline(true)
      setSugerencias((prev) => prev.filter((s) => s.id !== item.id))
    }
  }

  const generatePilot = () => {
    const id = `pilot-${Date.now()}`
    setSugerencias((prev) => [
      {
        id,
        titulo: 'Sugerencia piloto instantánea',
        descripcion: 'ProfeIA propone una intervención breve de acompañamiento y evidencia de cierre.',
        prioridad: 'media',
        origen: PILOT_ORIGIN,
        acciones_sugeridas: ['Definir propósito visible', 'Aplicar salida de 1 minuto'],
        piloto: true,
        aceptada: false,
        rechazada: false,
      },
      ...prev,
    ])
  }

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#A142F4] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Sugerencias IA</h1>
            <p className="text-xs text-[#9aa0a6]">Priorizadas para tu contexto de aula</p>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full border border-[#d9def1] bg-[#f5f7ff] text-[#4b5ba8] font-semibold">ProfeIA · modo piloto</span>
      </header>

      <div className="alumnos-body space-y-4">
        {offline && (
          <div className="glass-card rounded-2xl p-4 flex items-center gap-2 text-sm text-[#b54708] border border-[#f8d8a5] bg-[#fffaf0]">
            <WifiOff className="w-4 h-4" />
            Modo offline: mostrando sugerencias piloto locales.
          </div>
        )}

        <div className="glass-card rounded-2xl p-3 flex gap-2 flex-wrap">
          {[
            { id: 'urgente', label: 'Urgente' },
            { id: 'recordatorio', label: 'Recordatorio' },
            { id: 'sugerencia', label: 'Sugerencia' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`btn-secondary text-xs py-2 px-3 ${tab === item.id ? '!border-[#4285F4] !text-[#4285F4]' : ''}`}
            >
              {item.label}
            </button>
          ))}
          <button onClick={generatePilot} className="btn-primary text-xs py-2 px-3 ml-auto">
            <Bot className="w-4 h-4" />Generar sugerencia piloto
          </button>
        </div>

        <div className="glass-card rounded-2xl p-5">
          {loading ? (
            <p className="text-sm text-[#6b7280]">Cargando sugerencias…</p>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Sparkles className="w-14 h-14 mx-auto text-[#d5dbe1]" />
              <p className="mt-3 font-semibold text-[#202124]">ProfeIA está analizando tu contexto</p>
              <p className="text-sm text-[#6b7280] mt-1">Vuelve en unos minutos o genera una sugerencia piloto manual.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => {
                const acciones = normalizeAcciones(s.acciones_sugeridas || s.acciones)
                return (
                  <article key={s.id} className="rounded-xl border border-[#eceff3] p-4 bg-white/80">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h3 className="font-semibold text-[#202124]">{s.titulo || 'Sugerencia pedagógica'}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${badgeClass(s.prioridad)}`}>
                        {s.prioridad || 'media'}
                      </span>
                    </div>
                    <p className="text-sm text-[#4b5563] mt-1">{s.descripcion}</p>
                    <p className="text-xs text-[#9aa0a6] mt-2">Origen: {s.origen || PILOT_ORIGIN}</p>

                    {acciones.length > 0 && (
                      <ul className="mt-2 text-xs text-[#4b5563] list-disc pl-5 space-y-1">
                        {acciones.map((accion, idx) => <li key={`${s.id}-${idx}`}>{accion}</li>)}
                      </ul>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button onClick={() => handleResolve(s, 'accept')} className="btn-primary text-xs py-2 px-3">
                        <Check className="w-3.5 h-3.5" />Aceptar
                      </button>
                      <button onClick={() => handleResolve(s, 'reject')} className="btn-secondary text-xs py-2 px-3 !border-[#f3c7c2] !text-[#EA4335]">
                        <X className="w-3.5 h-3.5" />Rechazar
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
