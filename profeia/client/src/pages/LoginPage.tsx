import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: {
      x: number; y: number; r: number
      dx: number; dy: number; color: string; opacity: number
    }[] = []

    const colors = ['#C8102E', '#006847', '#FFFFFF', '#F5A623', '#0057A8']

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 6 + 2,
        dx: (Math.random() - 0.5) * 0.6,
        dy: (Math.random() - 0.5) * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.5 + 0.2,
      })
    }

    let animId: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1
      })
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }
    draw()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white text-sm">Cargando...</p>
      </div>
    </div>
  )

  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #006847 0%, #004d35 40%, #1a1a2e 100%)' }}
    >
      {/* Canvas animado */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Franjas decorativas tricolor */}
      <div className="absolute top-0 left-0 w-full h-1.5 flex">
        <div className="flex-1 bg-green-700" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-red-700" />
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1.5 flex">
        <div className="flex-1 bg-green-700" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-red-700" />
      </div>

      {/* Card principal */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          className="rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          {/* Escudo / Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #C8102E, #006847)' }}
            >
              <span className="text-4xl">🦅</span>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-white tracking-wide">PROFEIA</h1>
              <p className="text-green-300 text-xs font-semibold tracking-widest uppercase">
                Nueva Escuela Mexicana
              </p>
            </div>
          </div>

          {/* Divisor */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/40 text-xs">Plataforma Docente</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Frase motivacional */}
          <p className="text-white/70 text-sm text-center italic leading-relaxed">
            "La educación es el arma más poderosa para transformar el mundo."
          </p>

          {/* Botón Google */}
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-semibold text-gray-800 transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
            style={{ background: 'white' }}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Ingresar con cuenta Google
          </button>

          {/* Nota */}
          <p className="text-white/30 text-xs text-center">
            Acceso exclusivo para docentes de telesecundaria
          </p>

          {/* Footer institucional */}
          <div className="flex items-center gap-2 text-white/20 text-xs">
            <span>SEP</span>
            <span>•</span>
            <span>Telesecundaria</span>
            <span>•</span>
            <span>México</span>
          </div>
        </div>
      </div>
    </div>
  )
}
