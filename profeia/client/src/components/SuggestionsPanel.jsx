import { api } from '../api'
import {
  X, Check, ArrowRight, Bell, Lightbulb, AlertTriangle,
  Shield, Calendar as CalendarIcon, Sparkles
} from 'lucide-react'

function SuggestionsPanel({ suggestions, docenteId, onRefresh }) {
  const handleAccept = async (sugerenciaId) => {
    try {
      await api.aceptarSugerencia(docenteId, sugerenciaId)
      onRefresh()
    } catch (e) {
      console.error('Accept suggestion error:', e)
    }
  }

  const handleReject = async (sugerenciaId) => {
    try {
      await api.rechazarSugerencia(docenteId, sugerenciaId)
      onRefresh()
    } catch (e) {
      console.error('Reject suggestion error:', e)
    }
  }

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'protocolo': return Shield
      case 'ausencias': return AlertTriangle
      case 'codiseño': return CalendarIcon
      case 'seguimiento': return Lightbulb
      case 'sugerencia': return Lightbulb
      default: return Sparkles
    }
  }

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case 'urgente': return 'border-red-500/50 bg-red-500/5'
      case 'alta': return 'border-amber-500/50 bg-amber-500/5'
      case 'media': return 'border-neon-blue/50 bg-neon-blue/5'
      case 'baja': return 'border-gray-500/50 bg-gray-500/5'
      default: return 'border-white/10'
    }
  }

  const getPriorityBadge = (prioridad) => {
    const colors = {
      urgente: 'badge-urgente',
      alta: 'badge-bitacora',
      media: 'badge-planeacion',
      baja: 'text-gray-500'
    }
    return colors[prioridad] || ''
  }

  if (suggestions.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <Bell className="w-10 h-10 mx-auto mb-3 text-gray-500" />
        <h3 className="font-semibold text-gray-400 mb-1">Sin sugerencias</h3>
        <p className="text-sm text-gray-500">No hay sugerencias pendientes</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-bold text-gradient flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Sugerencias IA
        </h3>
        <p className="text-xs text-gray-500 mt-1">{suggestions.length} sugerencia(s) pendiente(s)</p>
      </div>

      <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-4 space-y-3">
        {suggestions.map((s, i) => {
          const Icon = getIcon(s.tipo)
          return (
            <div key={s.id || i} className={`rounded-xl border p-4 ${getPriorityColor(s.prioridad)} animate-slide-up`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${
                    s.prioridad === 'urgente' ? 'text-red-400' :
                    s.prioridad === 'alta' ? 'text-amber-400' :
                    'text-neon-blue'
                  }`} />
                  <span className={`text-xs px-2 py-0.5 rounded ${getPriorityBadge(s.prioridad)}`}>
                    {s.prioridad}
                  </span>
                </div>
              </div>
              
              <h4 className="font-semibold text-sm mb-1">{s.titulo}</h4>
              <p className="text-xs text-gray-400 mb-3">{s.descripcion}</p>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(s.id)}
                  className="flex-1 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-all flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Aceptar
                </button>
                <button
                  onClick={() => handleReject(s.id)}
                  className="flex-1 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-all flex items-center justify-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Rechazar
                </button>
              </div>

              {/* Protocol info */}
              {s.norma && (
                <div className="mt-3 p-2 rounded bg-black/20 text-xs">
                  <p className="text-gray-400 font-medium mb-1">Protocolo:</p>
                  <pre className="whitespace-pre-wrap font-sans text-gray-300">{s.norma.protocolo?.substring(0, 150)}...</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SuggestionsPanel
