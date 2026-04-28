import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Megaphone, CheckCircle2 } from 'lucide-react'
import { getAvisosNoLeidos, getMergedAvisos, loadAvisosReadMap, marcarLeido, saveAvisosReadMap } from '../lib/avisos'

function badgeClasses(priority) {
  if (priority === 'urgente') return 'bg-[#ffe9e6] text-[#c43f2f] border-[#f8c4bc]'
  if (priority === 'normal') return 'bg-[#eef5ff] text-[#2f68bb] border-[#cfe2ff]'
  return 'bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]'
}

export default function AvisosPage() {
  const navigate = useNavigate()
  const [avisos, setAvisos] = useState(() => getMergedAvisos())

  const avisosNoLeidos = useMemo(() => getAvisosNoLeidos(avisos), [avisos])

  const handleMarkRead = (id) => {
    setAvisos((prev) => {
      const next = marcarLeido(prev, id)
      const readMap = loadAvisosReadMap()
      const updated = next.find((item) => item.id === id)
      if (updated?.read_at) {
        saveAvisosReadMap({ ...readMap, [id]: updated.read_at })
        window.dispatchEvent(new CustomEvent('profeia:avisos-updated'))
      }
      return next
    })
  }

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#EA4335] to-[#A142F4] flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Avisos</h1>
            <p className="text-xs text-[#9aa0a6]">Comunicados de dirección y administración</p>
          </div>
        </div>
        <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold bg-[#eef5ff] border border-[#cfe2ff] text-[#2f68bb]">
          {avisosNoLeidos.length} no leído{avisosNoLeidos.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="alumnos-body space-y-4">
        {avisosNoLeidos.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#5f6368]">
            No hay avisos pendientes
          </div>
        ) : (
          avisosNoLeidos.map((aviso) => (
            <article key={aviso.id} className="glass-card rounded-2xl p-5 border border-[#e8eaed]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#202124]">{aviso.title}</h2>
                  <p className="text-xs text-[#9aa0a6] mt-1">
                    {aviso.author_name} · {new Date(aviso.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClasses(aviso.priority)}`}>
                  {aviso.priority}
                </span>
              </div>

              <p className="text-sm text-[#4b5563] mt-3 leading-6">{aviso.body}</p>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => handleMarkRead(aviso.id)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />Marcar como leído
                </button>
                {aviso.action_path && (
                  <button
                    onClick={() => navigate(aviso.action_path)}
                    className="btn-primary text-xs py-2 px-3"
                  >
                    Ir a la acción
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
