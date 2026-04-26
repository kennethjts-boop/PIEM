import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function UnauthorizedPage() {
  const { userRole } = useAuth()
  const fallbackPath = userRole === 'admin' || userRole === 'superadmin' ? '/admin' : '/dashboard'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-[#e8eaed] p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#202124]">Acceso no autorizado</h1>
        <p className="text-[#5f6368] mt-3">
          Tu perfil actual no tiene permisos para entrar a esta sección.
        </p>
        <Link
          to={fallbackPath}
          className="inline-flex items-center justify-center mt-6 px-4 py-2 rounded-full bg-[#4285F4] text-white text-sm font-semibold hover:bg-[#3367D6] transition-colors"
        >
          Volver
        </Link>
      </div>
    </div>
  )
}
