import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Sparkles } from 'lucide-react'
import { ACTION_REGISTRY, detectIntent, executeIntent } from '../lib/profeiaAgent'
import { TOOL_REGISTRY, buildToolPayload } from '../lib/agentTools'
import { isFeatureAvailable } from '../lib/tiers'
import { addToActionLog } from '../lib/actionLog'
import { buildAgentContext } from '../lib/agentContext'
import { reason } from '../lib/agentReasoner'
import ActionConfirmCard from './ActionConfirmCard'

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

function ProfeIAChat({ docenteId, grado, userProfile = null, navigate: navigateProp, currentTier = 1 }) {
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
      const fullContext = await buildAgentContext(docenteId, userProfile)
      const context = {
        ...fullContext,
        grado: fullContext?.grado || grado || null,
        tier: currentTier,
      }

      const availableTools = ACTION_REGISTRY
        .filter((action) => isFeatureAvailable(action.id, currentTier))
        .map((action) => action.id)

      const reasoning = await reason(trimmed, context, availableTools)
      const intent = reasoning?.tool_id || reasoning?.intent || detectIntent(trimmed)
      const result = await executeIntent(intent, context, trimmed)

      const baseConfirmation = result?.confirmation || null
      let confirmation = baseConfirmation

      if (baseConfirmation) {
        const tool = TOOL_REGISTRY.find((item) => item.id === baseConfirmation.tool_id)
        const mergedPayload = reasoning?.payload_override && tool
          ? { ...(baseConfirmation.payload || {}), ...reasoning.payload_override }
          : (baseConfirmation.payload || {})

        confirmation = {
          ...baseConfirmation,
          payload: mergedPayload,
          preview: tool ? tool.preview(mergedPayload) : baseConfirmation.preview,
          origin: reasoning?.origin || 'local',
          missing_fields: Array.isArray(reasoning?.missing_fields) ? reasoning.missing_fields : [],
          original_message: trimmed,
          reasoning_explanation: reasoning?.explanation || '',
        }
      }

      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        text: result?.text || 'No encontré una respuesta para ese mensaje.',
        action: result?.action || null,
        actionLabel: result?.actionLabel || null,
        confirmation: confirmation
          ? { ...confirmation, execution_context: context }
          : null,
        cancelled: false,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'error',
        text: err?.message || 'No pude procesar tu solicitud en este momento. Intenta de nuevo.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleEditToolPayload = async (msg, nextMessage) => {
    const tool = TOOL_REGISTRY.find((item) => item.id === msg?.confirmation?.tool_id)
    if (!tool || !msg?.confirmation) return { ok: false, error: 'Herramienta no disponible para edición.' }

    const executionContext = msg?.confirmation?.execution_context || {
      docenteId,
      grado,
      userProfile,
      tier: currentTier,
    }

    const fallbackMessage = msg?.confirmation?.original_message || ''
    const revisedMessage = String(nextMessage || fallbackMessage).trim()
    if (!revisedMessage) return { ok: false, error: 'El mensaje no puede estar vacío.' }

    let nextPayload = null
    try {
      nextPayload = buildToolPayload(tool, revisedMessage, executionContext)
    } catch (err) {
      return { ok: false, error: err?.message || 'No se pudo interpretar tu mensaje editado.' }
    }

    setMessages((prev) => prev.map((item) => {
      if (item.id !== msg.id || !item.confirmation) return item
      return {
        ...item,
        cancelled: false,
        confirmation: {
          ...item.confirmation,
          original_message: revisedMessage,
          payload: nextPayload,
          preview: tool.preview(nextPayload),
        },
      }
    }))

    return { ok: true }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
  }

  const handleConfirmTool = async (msg, payload) => {
    const tool = TOOL_REGISTRY.find((item) => item.id === msg?.confirmation?.tool_id)
    if (!tool) {
      throw new Error('Herramienta no disponible')
    }

    try {
      const executionContext = msg?.confirmation?.execution_context || {
        docenteId,
        grado,
        userProfile,
        tier: currentTier,
      }

      const result = await tool.execute(payload, executionContext)

      addToActionLog({
        tool_id: tool.id,
        title: tool.label,
        status: 'success',
        payload_summary: tool.preview(payload),
      })

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'ai',
          text: msg?.confirmation?.success_message || tool.success_message || 'Acción ejecutada correctamente.',
          action: result?.action || null,
          actionLabel: result?.action?.type === 'navigate' ? 'Abrir sección' : null,
          confirmation: null,
        },
      ])

      return result
    } catch (err) {
      addToActionLog({
        tool_id: tool.id,
        title: tool.label,
        status: 'error',
        payload_summary: tool.preview(payload),
      })
      throw err
    }
  }

  const handleCancelTool = (msg) => {
    setMessages((prev) => prev.map((item) => (item.id === msg.id ? { ...item, cancelled: true } : item)))

    if (msg?.confirmation) {
      addToActionLog({
        tool_id: msg.confirmation.tool_id,
        title: msg.confirmation.tool_label,
        status: 'cancelled',
        payload_summary: msg.confirmation.preview,
      })
    }
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
                {msg.confirmation && !msg.cancelled && (
                  <ActionConfirmCard
                    confirmation={msg.confirmation}
                    onConfirm={(payload) => handleConfirmTool(msg, payload)}
                    onEdit={(payload) => handleEditToolPayload(msg, payload)}
                    onCancel={() => handleCancelTool(msg)}
                    navigate={navigate}
                  />
                )}
                {msg.confirmation && msg.cancelled && (
                  <p className="text-[11px] text-[#b42318] mt-2">Acción cancelada por el docente.</p>
                )}
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
