import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { sendProfeIAMessage } from '../api'

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
