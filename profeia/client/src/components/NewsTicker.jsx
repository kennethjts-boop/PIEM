import { useState } from 'react'

const TICKER_ITEMS = [
  { source: 'SEP', color: '#EA4335', bg: 'rgba(234,67,53,0.08)', text: 'Nueva convocatoria Carrera Magisterial 2025-2026 — Registro del 15 al 30 de mayo' },
  { source: 'DOF', color: '#34A853', bg: 'rgba(52,168,83,0.08)', text: 'Acuerdo 14/03/25 — Modificaciones al calendario escolar ciclo 2024-2025 publicadas en el DOF' },
  { source: 'SNTE', color: '#4285F4', bg: 'rgba(66,133,244,0.08)', text: 'Comunicado Sección 9 — Asamblea ordinaria de delegados el próximo 20 de mayo, 10:00 hrs' },
  { source: 'SEP', color: '#EA4335', bg: 'rgba(234,67,53,0.08)', text: 'Recordatorio: entrega de calificaciones primer trimestre — límite 28 de mayo' },
  { source: 'DOF', color: '#34A853', bg: 'rgba(52,168,83,0.08)', text: 'Decreto reforma Ley General de Educación — Nuevas disposiciones para Telesecundaria en vigor' },
  { source: 'SNTE', color: '#4285F4', bg: 'rgba(66,133,244,0.08)', text: 'Convocatoria actualización docente — Cursos en línea disponibles en plataforma SNTE Digital' },
  { source: 'SEP', color: '#EA4335', bg: 'rgba(234,67,53,0.08)', text: 'Aviso: nueva versión libros de texto NEM disponibles en portal SEP para descarga gratuita' },
]

export default function NewsTicker() {
  const [paused, setPaused] = useState(false)

  return (
    <div
      className="relative overflow-hidden py-1.5"
      style={{ background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(26,26,46,0.98), transparent)' }} />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgba(26,26,46,0.98), transparent)' }} />

      <div
        className="flex items-center gap-8 whitespace-nowrap"
        style={{
          animation: paused ? 'none' : 'ticker 60s linear infinite',
          display: 'inline-flex',
        }}
      >
        {/* Duplicate for seamless loop */}
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 text-xs cursor-pointer hover:opacity-80 transition-opacity px-1"
          >
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
              style={{ color: item.color, background: item.bg.replace('0.08', '0.22') }}
            >
              {item.source}
            </span>
            <span style={{ color: '#b8c6db' }}>{item.text}</span>
            <span style={{ color: 'rgba(255,255,255,0.18)' }} className="mx-2">·</span>
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
