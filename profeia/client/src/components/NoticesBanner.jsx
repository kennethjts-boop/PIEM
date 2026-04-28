import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { AVISOS_STUB, getAvisosNoLeidos } from '../lib/avisos'

const READ_KEY = 'profeia_avisos_read_v1'

const TICKER_ITEMS = [
  { source: 'SEP', color: '#EA4335', text: 'Nueva convocatoria Carrera Magisterial 2025-2026 — Registro del 15 al 30 de mayo' },
  { source: 'DOF', color: '#34A853', text: 'Acuerdo 14/03/25 — Modificaciones al calendario escolar ciclo 2024-2025 publicadas' },
  { source: 'SNTE', color: '#4285F4', text: 'Asamblea ordinaria de delegados el próximo 20 de mayo, 10:00 hrs' },
]

function loadReadMap() {
  try {
    const raw = localStorage.getItem(READ_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function NoticesBanner() {
  const navigate = useNavigate()
  const [paused, setPaused] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1)
    const onStorage = (event) => {
      if (!event.key || event.key === READ_KEY) refresh()
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('profeia:avisos-updated', refresh)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('profeia:avisos-updated', refresh)
    }
  }, [])

  const unread = useMemo(() => {
    const readMap = loadReadMap()
    const merged = AVISOS_STUB.map((item) => ({ ...item, read_at: readMap[item.id] || item.read_at }))
    return getAvisosNoLeidos(merged).sort((a, b) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      return bTime - aTime
    })
  }, [version])

  const latest = unread[0] || null

  if (!latest) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          background: 'rgba(248,250,255,0.97)',
          borderBottom: '1px solid rgba(66,133,244,0.14)',
          height: '32px',
          overflow: 'hidden',
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0 14px 0 12px',
            flexShrink: 0,
            borderRight: '1px solid rgba(66,133,244,0.18)',
            background: 'rgba(248,250,255,0.97)',
            zIndex: 2,
          }}
        >
          <Megaphone style={{ width: 13, height: 13, color: '#4285F4', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: '#4285F4', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Avisos
          </span>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              animation: paused ? 'none' : 'ticker 42s linear infinite',
              paddingLeft: 16,
            }}
          >
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, paddingRight: 20, fontSize: 13 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800, color: item.color, background: `${item.color}18` }}>
                  {item.source}
                </span>
                <span style={{ color: '#374151' }}>{item.text}</span>
                <span style={{ color: 'rgba(66,133,244,0.3)', margin: '0 4px' }}>·</span>
              </span>
            ))}
          </div>
        </div>

        <style>{`@keyframes ticker {0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/avisos')}
      className="w-full"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        background: 'rgba(248,250,255,0.97)',
        borderBottom: '1px solid rgba(66,133,244,0.14)',
        height: '32px',
        padding: '0 12px',
        cursor: 'pointer',
        animation: 'noticeFadeIn 0.25s ease',
      }}
      aria-label="Abrir avisos"
    >
      <span className="inline-flex items-center gap-2 min-w-0">
        <Megaphone style={{ width: 13, height: 13, color: '#EA4335', flexShrink: 0 }} />
        <span className="text-[12px] text-[#374151] truncate text-left">
          <strong className="text-[#2f68bb]">{latest.title}</strong> · {latest.body}
        </span>
      </span>
      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#EA4335] text-white text-[10px] font-bold px-1.5">
        {unread.length}
      </span>
      <style>{`@keyframes noticeFadeIn {from {opacity:0;transform:translateY(-4px)} to {opacity:1;transform:translateY(0)}}`}</style>
    </button>
  )
}
