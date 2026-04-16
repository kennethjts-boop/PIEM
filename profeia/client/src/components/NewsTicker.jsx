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
      className="relative overflow-hidden"
      style={{
        background: 'rgba(248,250,255,0.95)',
        borderBottom: '1px solid rgba(66,133,244,0.12)',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Label */}
      <div
        className="flex items-center gap-1.5 px-3 flex-shrink-0 z-10"
        style={{ borderRight: '1px solid rgba(66,133,244,0.15)' }}
      >
        <Newspaper className="w-3 h-3" style={{ color: '#4285F4' }} />
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#4285F4', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Noticias
        </span>
      </div>

      {/* Left fade */}
      <div className="absolute left-[88px] top-0 bottom-0 w-6 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(248,250,255,1), transparent)' }} />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgba(248,250,255,1), transparent)' }} />

      <div
        className="flex items-center whitespace-nowrap ml-2"
        style={{
          animation: paused ? 'none' : 'ticker 55s linear infinite',
          display: 'inline-flex',
          gap: '0',
        }}
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-1"
            style={{ fontSize: '12px' }}
          >
            <span
              className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-bold flex-shrink-0"
              style={{ color: item.color, background: `${item.color}18` }}
            >
              {item.source}
            </span>
            <span style={{ color: '#475569' }}>{item.text}</span>
            <span style={{ color: 'rgba(66,133,244,0.25)', margin: '0 8px' }}>·</span>
          </span>
        ))}
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
