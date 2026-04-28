import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function AdminDashboard() {
  const navigate = useNavigate()

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#EA4335] to-[#FBBC04] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Panel de Administración</h1>
            <span className="inline-flex mt-1 rounded-full border border-[#f1d7cf] bg-[#fff4f1] text-[#b74b3f] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              Próximamente
            </span>
          </div>
        </div>
      </header>

      <div className="alumnos-body space-y-4">
        <div className="glass-card rounded-2xl p-5 text-sm text-[#5f6368]">
          Este espacio centralizará la administración del sistema para operación institucional y control de catálogos.
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#202124] mb-3">Funciones futuras</h2>
          <ul className="space-y-2 text-sm text-[#4b5563]">
            <li>• Gestión de usuarios y roles</li>
            <li>• Gestión de escuelas y estructura académica</li>
            <li>• Gestión documental y control de recursos</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
