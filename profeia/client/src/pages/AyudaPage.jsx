import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, LifeBuoy } from 'lucide-react'

const FAQ_ITEMS = [
  {
    id: 'que-es',
    q: '¿Qué es ProfeIA?',
    a: 'ProfeIA es tu asistente digital para organizar el trabajo docente diario, con enfoque en telesecundaria y contexto real del aula.',
  },
  {
    id: 'agente',
    q: '¿Cómo funciona el agente IA?',
    a: 'Analiza tu mensaje, detecta intención y propone o ejecuta acciones dentro de módulos como planeación, bitácora, asistencia y sugerencias.',
  },
  {
    id: 'asistencia',
    q: '¿Cómo registro asistencia?',
    a: 'Abre el módulo de Asistencia, marca presentes/ausentes y guarda. El sistema reemplaza el registro del día con validación de datos.',
  },
  {
    id: 'planeacion',
    q: '¿Cómo genero una planeación?',
    a: 'Puedes pedirlo al chat de ProfeIA o entrar a Planeación para consultar y dar seguimiento a los borradores del mes.',
  },
  {
    id: 'sugerencias',
    q: '¿Qué son las sugerencias IA?',
    a: 'Son recomendaciones priorizadas por urgencia para ayudarte a tomar decisiones pedagógicas y de convivencia durante el día.',
  },
  {
    id: 'bitacora',
    q: '¿Cómo funciona la bitácora?',
    a: 'En Bitácora registras hechos relevantes del aula (logros, incidentes, acciones) para mantener seguimiento formativo y evidencias.',
  },
  {
    id: 'planes',
    q: '¿Qué incluye cada plan?',
    a: 'Cada tier habilita capacidades del agente y módulos avanzados. Puedes revisar detalle y disponibilidad desde la sección de Planes.',
  },
]

export default function AyudaPage() {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(FAQ_ITEMS[0].id)

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-[#4285F4]" />
          <h1 className="text-lg font-bold text-[#202124]">Centro de ayuda ProfeIA</h1>
        </div>
      </header>

      <div className="alumnos-body space-y-3">
        {FAQ_ITEMS.map((item) => {
          const open = openId === item.id
          return (
            <article key={item.id} className="glass-card rounded-2xl overflow-hidden">
              <button
                className="w-full px-4 py-3 text-left flex items-center justify-between gap-3"
                onClick={() => setOpenId(open ? '' : item.id)}
              >
                <span className="text-sm font-semibold text-[#202124]">{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="px-4 pb-4 text-sm text-[#5f6368] leading-6 border-t border-[#edf1f7]">
                  <p className="pt-3">{item.a}</p>
                </div>
              )}
            </article>
          )
        })}

        <div className="glass-card rounded-2xl p-4 text-sm text-[#5f6368]">
          Para conocer funciones por nivel, revisa la sección de{' '}
          <Link to="/planes" className="font-semibold text-[#2f68bb] underline-offset-2 hover:underline">
            planes de ProfeIA
          </Link>
          .
        </div>
      </div>
    </div>
  )
}
