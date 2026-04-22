import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500 text-lg">Cargando...</p>
    </div>
  )

  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <img
          src="/logo.png"
          alt="PROFEIA 2.0"
          className="w-20 h-20 object-contain"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">PROFEIA 2.0</h1>
          <p className="text-gray-500 text-sm mt-1">Plataforma docente inteligente</p>
        </div>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-3 w-full justify-center bg-white border border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:shadow-md transition-all duration-200"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Iniciar sesión con Google
        </button>
        <p className="text-xs text-gray-400 text-center">
          Solo para docentes autorizados
        </p>
      </div>
    </div>
  )
}
