import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Sparkles } from 'lucide-react'
import { ACTION_REGISTRY, detectIntent, executeIntent } from '../lib/profeiaAgent'
import { isFeatureAvailable } from '../lib/tiers'

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

function ProfeIAChat({ docenteId, grado, navigate: navigateProp, currentTier = 1 }) {
  const routerNavigate = useNavigate()
  const navigate = navigateProp || routerNavigate
  const [messages, setMessages] = useState([INITIAL_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const availableCapabilities = useMemo(
    () => ACTION_REGISTRY.filter((action) => isFeatureAvailable(action.id, currentTier)),
    [currentTier]
  )

  const availableQuickPrompts = useMemo(
    () => QUICK_PROMPTS.filter((prompt) => {
      const intent = detectIntent(prompt)
      if (intent === 'general') return true
      return isFeatureAvailable(intent, currentTier)
    }),
    [currentTier]
  )

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg = { id: Date.now(), role: 'user', text: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const context = {
        docenteId,
        grado,
        tier: currentTier,
        fecha: new Date().toISOString().split('T')[0],
      }
      const intent = detectIntent(trimmed)
      const result = await executeIntent(intent, context, trimmed)

      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        text: result?.text || 'No encontré una respuesta para ese mensaje.',
        action: result?.action || null,
        actionLabel: result?.actionLabel || null,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'error',
        text: 'No pude procesar tu solicitud en este momento. Intenta de nuevo.'
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
            {msg.role === 'ai' && (
              <div className="bubble-ai">
                {msg.text}
                {msg.action?.type === 'navigate' && (
                  <button
                    onClick={() => navigate(msg.action.path)}
                    className="agent-action-btn"
                  >
                    {msg.actionLabel || 'Ir ahora'} →
                  </button>
                )}
              </div>
            )}
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

      {messages.length === 1 && (
        <div className="agent-capabilities">
          <p className="text-[10px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">Puedo ayudarte con:</p>
          {availableCapabilities.map((action) => (
            <button key={action.id} onClick={() => send(action.label)} className="capability-chip">
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      )}

      <div className="profe-ia-chips">
        {availableQuickPrompts.map(p => (
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
