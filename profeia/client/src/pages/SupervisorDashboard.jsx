import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Telescope } from 'lucide-react'

export default function SupervisorDashboard() {
  const navigate = useNavigate()

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#A142F4] flex items-center justify-center">
            <Telescope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Panel de Supervisor</h1>
            <span className="inline-flex mt-1 rounded-full border border-[#e4dbf8] bg-[#f7f2ff] text-[#7e57c2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              Próximamente
            </span>
          </div>
        </div>
      </header>

      <div className="alumnos-body space-y-4">
        <div className="glass-card rounded-2xl p-5 text-sm text-[#5f6368]">
          Aquí podrás supervisar desempeño, cumplimiento y avances en múltiples escuelas desde una sola vista estratégica.
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#202124] mb-3">Funciones futuras</h2>
          <ul className="space-y-2 text-sm text-[#4b5563]">
            <li>• Supervisión multi-escuela</li>
            <li>• Reportes comparativos por zona</li>
            <li>• Seguimiento de indicadores pedagógicos</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
