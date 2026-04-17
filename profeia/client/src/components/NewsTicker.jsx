import { useState } from 'react'
import { Newspaper } from 'lucide-react'

const TICKER_ITEMS = [
  { source: 'SEP', color: '#EA4335', text: 'Nueva convocatoria Carrera Magisterial 2025-2026 — Registro del 15 al 30 de mayo' },
  { source: 'DOF', color: '#34A853', text: 'Acuerdo 14/03/25 — Modificaciones al calendario escolar ciclo 2024-2025 publicadas' },
  { source: 'SNTE', color: '#4285F4', text: 'Asamblea ordinaria de delegados el próximo 20 de mayo, 10:00 hrs' },
  { source: 'SEP', color: '#EA4335', text: 'Recordatorio: entrega de calificaciones primer trimestre — límite 28 de mayo' },
  { source: 'DOF', color: '#34A853', text: 'Decreto reforma Ley General de Educación — nuevas disposiciones para Telesecundaria en vigor' },
  { source: 'SNTE', color: '#4285F4', text: 'Cursos de actualización docente — plataforma SNTE Digital disponibles sin costo' },
  { source: 'SEP', color: '#EA4335', text: 'Aviso: nueva versión libros de texto NEM disponibles en portal SEP para descarga gratuita' },
]

export default function NewsTicker() {
  const [paused, setPaused] = useState(false)

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
      {/* Fixed label — its own overflow:hidden box so text can never bleed in */}
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
        <Newspaper style={{ width: 13, height: 13, color: '#4285F4', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: '#4285F4', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Noticias
        </span>
      </div>

      {/* Scroll track — isolated overflow:hidden prevents text bleeding into label */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Left fade */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(to right, rgba(248,250,255,1), transparent)',
        }} />
        {/* Right fade */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 32, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(to left, rgba(248,250,255,1), transparent)',
        }} />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            animation: paused ? 'none' : 'ticker 55s linear infinite',
            paddingLeft: 16,
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, paddingRight: 20, fontSize: 13 }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '1px 6px', borderRadius: 4,
                fontSize: 10, fontWeight: 800,
                color: item.color, background: `${item.color}18`,
                flexShrink: 0,
              }}>
                {item.source}
              </span>
              <span style={{ color: '#374151' }}>{item.text}</span>
              <span style={{ color: 'rgba(66,133,244,0.3)', margin: '0 4px' }}>·</span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
