import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

const PARTICLE_COLORS = ['#C8102E', '#006847', '#FFFFFF', '#F5A623', '#0057A8']

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let animId: number
    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      alpha: Math.random() * 0.5 + 0.2,
    }))

    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0
      }
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }

    draw()

    const onResize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  )
}

function Tricolor() {
  const stripe = { display: 'flex', width: '100%', height: 6 }
  const bar = (color: string) => ({ flex: 1, background: color })
  return (
    <>
      <div style={{ ...stripe, position: 'fixed', top: 0, left: 0, zIndex: 10 }}>
        <div style={bar('#006847')} />
        <div style={bar('#FFFFFF')} />
        <div style={bar('#C8102E')} />
      </div>
      <div style={{ ...stripe, position: 'fixed', bottom: 0, left: 0, zIndex: 10 }}>
        <div style={bar('#006847')} />
        <div style={bar('#FFFFFF')} />
        <div style={bar('#C8102E')} />
      </div>
    </>
  )
}

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [magicError, setMagicError] = useState<string | null>(null)
  const [magicLoading, setMagicLoading] = useState(false)

  const handleMagicLink = async () => {
    if (!email.trim()) return
    setMagicLoading(true)
    setMagicError(null)
    const { error } = await signInWithMagicLink(email)
    setMagicLoading(false)
    if (error) {
      setMagicError('No pudimos enviar el correo. Verifica tu dirección e intenta de nuevo.')
    } else {
      setMagicSent(true)
    }
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #006847 0%, #004d35 40%, #1a1a2e 100%)',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>Cargando...</p>
    </div>
  )

  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #006847 0%, #004d35 40%, #1a1a2e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <ParticleCanvas />
      <Tricolor />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 5,
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 24,
        padding: '2.5rem 2rem',
        width: '100%', maxWidth: 380,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        margin: '0 1rem',
      }}>

        {/* Eagle icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #C8102E, #006847)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, boxShadow: '0 4px 20px rgba(200,16,46,0.4)',
        }}>
          🦅
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{
            color: '#FFFFFF', fontSize: 28, fontWeight: 800,
            letterSpacing: '-0.5px', margin: 0,
          }}>
            PROFEIA
          </h1>
          <p style={{ color: '#6ee7b7', fontSize: 13, margin: 0, fontWeight: 500 }}>
            Nueva Escuela Mexicana
          </p>
        </div>

        {/* Quote */}
        <p style={{
          color: 'rgba(255,255,255,0.55)', fontSize: 11.5, textAlign: 'center',
          fontStyle: 'italic', lineHeight: 1.5, margin: 0, padding: '0 0.5rem',
          borderLeft: '2px solid rgba(200,16,46,0.5)', paddingLeft: '0.75rem',
        }}>
          "La educación es el arma más poderosa para transformar el mundo."
        </p>

        {/* Divider */}
        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.1)' }} />

        {/* Google button */}
        <button
          onClick={signInWithGoogle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', background: '#FFFFFF', color: '#3c4043',
            border: 'none', borderRadius: 10, padding: '12px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.25)'
          }}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            style={{ width: 20, height: 20 }}
          />
          Iniciar sesión con Google
        </button>

        {/* Divider con texto */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>o entra con correo</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Magic link section */}
        {!magicSent ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10,
                padding: '11px 14px',
                color: '#FFFFFF',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {magicError && (
              <p style={{ color: '#fca5a5', fontSize: 11, margin: 0 }}>{magicError}</p>
            )}
            <button
              onClick={handleMagicLink}
              disabled={magicLoading || !email.trim()}
              style={{
                width: '100%',
                background: magicLoading || !email.trim() ? 'rgba(255,255,255,0.1)' : 'rgba(110,231,183,0.15)',
                border: '1px solid rgba(110,231,183,0.3)',
                borderRadius: 10,
                padding: '11px 20px',
                color: magicLoading || !email.trim() ? 'rgba(255,255,255,0.3)' : '#6ee7b7',
                fontSize: 14,
                fontWeight: 600,
                cursor: magicLoading || !email.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {magicLoading ? 'Enviando...' : '✉️ Entrar con correo'}
            </button>
          </div>
        ) : (
          <div style={{
            width: '100%',
            background: 'rgba(110,231,183,0.1)',
            border: '1px solid rgba(110,231,183,0.3)',
            borderRadius: 12,
            padding: '14px 16px',
            textAlign: 'center',
          }}>
            <p style={{ color: '#6ee7b7', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>✅ ¡Revisa tu correo!</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>
              Enviamos un enlace mágico a <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{email}</strong>.
              Haz clic en el enlace para entrar.
            </p>
            <button
              onClick={() => { setMagicSent(false); setEmail('') }}
              style={{ marginTop: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}
            >
              Usar otro correo
            </button>
          </div>
        )}

        {/* SUPABASE SETUP REQUERIDO:
            Authentication → Providers → Email → Enable Email Provider ✅
            Authentication → URL Configuration → Redirect URLs:
              Agregar: https://[dominio-vercel].vercel.app/auth/callback
            Authentication → URL Configuration → Site URL:
              https://[dominio-vercel].vercel.app
        */}

        {/* Footer */}
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10.5, margin: 0, letterSpacing: '0.05em' }}>
          SEP • Telesecundaria • México
        </p>
      </div>
    </div>
  )
}
