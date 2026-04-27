import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { sendProfeIAMessage, getWebhookUrl } from '../api'

const QUICK_PROMPTS = [
  '¿Qué vemos hoy?',
  'Genera una planeación',
  'Ayuda con la bitácora',
  'Próximo proyecto NEM'
]

const INITIAL_MSG = {
  id: 0,
  role: 'ai',
  text: '¡Hola! Soy ProfeIA, tu asistente inteligente. ¿En qué te puedo ayudar hoy?'
}

function getPilotResponse(mensaje) {
  const lower = mensaje.toLowerCase()
  if (lower.includes('planeaci')) return '📋 ProfeIA modo piloto: Para generar una planeación, ve al calendario, selecciona un día y usa el panel de planeación. El modelo IA completo estará disponible próximamente.'
  if (lower.includes('bitácora') || lower.includes('bitacora')) return '📓 ProfeIA modo piloto: Registra incidentes en la bitácora desde el panel del día. Las sugerencias IA se generan automáticamente al guardar.'
  if (lower.includes('sugerencia')) return '💡 ProfeIA modo piloto: Las sugerencias IA están activas en modo stub. Revisa la campana 🔔 en el header para ver las sugerencias generadas.'
  if (lower.includes('hoy') || lower.includes('qué vemos')) return '📅 ProfeIA modo piloto: Revisa el calendario para ver las planeaciones del día. El asistente IA completo estará disponible cuando se configure el webhook.'
  return '🤖 ProfeIA está en modo piloto local. El asistente IA completo se activará cuando se configure el webhook en el Panel de Admin. Por ahora, usa el calendario, bitácora y sugerencias automáticas.'
}

/**
 * ProfeIAChat
 * Props:
 *   docenteId: number | null
 *   grado: number | null
 */
function ProfeIAChat({ docenteId, grado }) {
  const [messages, setMessages] = useState([INITIAL_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPilotMode] = useState(() => {
    const url = getWebhookUrl()
    return url.includes('n8n.tudominio.com') || url.includes('tudominio')
  })
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg = { id: Date.now(), role: 'user', text: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const webhookUrl = getWebhookUrl()
      const IS_PLACEHOLDER = webhookUrl.includes('n8n.tudominio.com') || webhookUrl.includes('tudominio')

      if (IS_PLACEHOLDER) {
        const aiMsg = {
          id: Date.now() + 1,
          role: 'ai',
          text: getPilotResponse(trimmed)
        }
        setMessages(prev => [...prev, aiMsg])
        setLoading(false)
        return
      }

      const result = await sendProfeIAMessage({
        mensaje: trimmed,
        docenteId,
        fecha: new Date().toISOString().split('T')[0],
        grado
      })
      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        text: typeof result === 'string' ? result : (result.respuesta || JSON.stringify(result))
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'error',
        text: 'Sin conexión con el asistente. Configura el webhook en el Panel de Admin.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
  }

  return (
    <div className="profe-ia-wrap">
      <div className="profe-ia-bar">
        <Sparkles className="w-3.5 h-3.5 text-[#4285F4] flex-shrink-0" />
        <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-widest">ProfeIA</span>
        {isPilotMode && (
          <span style={{ fontSize: 9, background: '#FFF3CD', color: '#856404', padding: '1px 6px', borderRadius: 999, fontWeight: 600 }}>
            MODO PILOTO
          </span>
        )}
      </div>

      <div className="profe-ia-msgs">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-row chat-row-${msg.role}`}>
            {msg.role === 'user' && <div className="bubble-user">{msg.text}</div>}
            {msg.role === 'ai' && <div className="bubble-ai">{msg.text}</div>}
            {msg.role === 'error' && <div className="bubble-error">{msg.text}</div>}
          </div>
        ))}
        {loading && (
          <div className="chat-row chat-row-ai">
            <div className="bubble-ai">
              <span className="typing-dots"><span /><span /><span /></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="profe-ia-chips">
        {QUICK_PROMPTS.map(p => (
          <button key={p} className="chip" onClick={() => send(p)}>{p}</button>
        ))}
      </div>

      <div className="profe-ia-input-row">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKey}
          placeholder="Escribe un mensaje…"
          className="profe-ia-textarea"
          rows={1}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="profe-ia-send"
          aria-label="Enviar"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default ProfeIAChat
