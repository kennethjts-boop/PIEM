import { api } from '../api'
import {
  X, Check, Bell, Lightbulb, AlertTriangle, Shield,
  Calendar as CalendarIcon, Sparkles, ArrowRight
} from 'lucide-react'

function SuggestionsPanel({ suggestions, docenteId, onRefresh }) {
  const handleAccept = async (sugerenciaId) => {
    try { await api.aceptarSugerencia(docenteId, sugerenciaId); onRefresh() }
    catch (e) { console.error('Accept error:', e) }
  }

  const handleReject = async (sugerenciaId) => {
    try { await api.rechazarSugerencia(docenteId, sugerenciaId); onRefresh() }
    catch (e) { console.error('Reject error:', e) }
  }

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'protocolo': return Shield
      case 'ausencias': return AlertTriangle
      case 'codiseño': return CalendarIcon
      default: return Lightbulb
    }
  }

  if (suggestions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <Bell className="w-10 h-10 mx-auto mb-3 text-[#e8eaed]" />
        <h3 className="font-semibold text-[#5f6368] mb-1">Sin sugerencias</h3>
        <p className="text-sm text-[#9aa0a6]">No hay sugerencias pendientes</p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#f1f3f4]">
        <h3 className="font-bold text-[#202124] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#4285F4]" />
          Sugerencias IA
        </h3>
        <p className="text-xs text-[#9aa0a6] mt-0.5">{suggestions.length} sugerencia(s) pendiente(s)</p>
      </div>

      {/* List */}
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-4 space-y-3">
        {suggestions.map((s, i) => {
          const Icon = getIcon(s.tipo)
          return (
            <div key={s.id || i} className={`suggestion-card ${s.prioridad || 'media'} animate-slide-up`}>
              <div className="flex items-start gap-2 mb-2">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  s.prioridad === 'urgente' ? 'text-[#EA4335]' :
                  s.prioridad === 'alta' ? 'text-[#FBBC04]' :
                  'text-[#4285F4]'
                }`} />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-[#202124]">{s.titulo}</h4>
                  <p className="text-xs text-[#5f6368] mt-1">{s.descripcion}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleAccept(s.id)}
                  className="flex-1 py-2 rounded-full bg-[#34A853]/10 text-[#34A853] text-xs font-semibold hover:bg-[#34A853]/15 transition-colors flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" />Aceptar
                </button>
                <button onClick={() => handleReject(s.id)}
                  className="flex-1 py-2 rounded-full bg-[#f1f3f4] text-[#5f6368] text-xs font-semibold hover:bg-[#EA4335]/10 hover:text-[#EA4335] transition-colors flex items-center justify-center gap-1">
                  <X className="w-3.5 h-3.5" />Rechazar
                </button>
              </div>

              {/* Protocol info */}
              {s.norma && (
                <div className="mt-3 p-3 rounded-lg bg-[#f8f9fa] text-xs">
                  <p className="text-[#5f6368] font-semibold mb-1">Protocolo:</p>
                  <pre className="whitespace-pre-wrap font-sans text-[#202124] text-[11px]">{s.norma.protocolo?.substring(0, 150)}…</pre>
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
