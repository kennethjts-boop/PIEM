import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Pencil, ShieldCheck, XCircle } from 'lucide-react'

function getToolIcon(toolId) {
  if (toolId === 'crear_planeacion') return '📋'
  if (toolId === 'guardar_bitacora') return '📓'
  if (toolId === 'crear_evaluacion') return '📊'
  if (toolId === 'crear_tarea_local') return '✅'
  if (toolId === 'marcar_aviso_leido') return '📢'
  return '🛠️'
}

export default function ActionConfirmCard({ confirmation, onConfirm, onEdit, onCancel, navigate }) {
  const [status, setStatus] = useState('pending')
  const [errorText, setErrorText] = useState('')
  const [successData, setSuccessData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editablePayload, setEditablePayload] = useState(() => confirmation?.payload || {})
  const [draftMessageText, setDraftMessageText] = useState(() => confirmation?.original_message || '')

  useEffect(() => {
    const nextPayload = confirmation?.payload || {}
    setEditablePayload(nextPayload)
    setDraftMessageText(confirmation?.original_message || '')
    setIsEditing(false)
    setStatus('pending')
    setErrorText('')
    setSuccessData(null)
  }, [confirmation?.payload, confirmation?.original_message])

  const beginEdit = () => {
    setIsEditing(true)
    setDraftMessageText(confirmation?.original_message || '')
    setStatus('pending')
    setErrorText('')
  }

  const applyEdit = async () => {
    const nextMessage = String(draftMessageText || '').trim()
    if (!nextMessage) {
      setErrorText('Escribe un mensaje válido antes de aplicar cambios.')
      return
    }

    try {
      setErrorText('')
      const result = await onEdit?.(nextMessage)
      if (result?.ok === false) {
        setErrorText(result.error || 'No se pudo aplicar el cambio. Revisa el mensaje e inténtalo de nuevo.')
        return
      }

      setIsEditing(false)
      setStatus('pending')
    } catch (err) {
      setErrorText(err?.message || 'No se pudo aplicar el cambio. Revisa el mensaje e inténtalo de nuevo.')
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setDraftMessageText(confirmation?.original_message || '')
    setStatus('pending')
    setErrorText('')
  }

  const execute = async () => {
    if (isEditing) return
    setStatus('executing')
    setErrorText('')
    try {
      const result = await onConfirm?.(editablePayload)
      setSuccessData(result || null)
      setStatus('success')
    } catch (err) {
      setErrorText(err?.message || 'No se pudo ejecutar la acción')
      setStatus('error')
    }
  }

  const cardClass = `action-confirm-card ${status === 'success' ? 'success' : status === 'error' ? 'error' : status === 'executing' ? 'executing' : ''}`.trim()
  const successText = successData?.data?.reporteTexto
    || successData?.reporteTexto
    || successData?.mensajeTexto
    || confirmation?.success_message
    || 'Acción completada correctamente.'
  const hasMissingFields = Array.isArray(confirmation?.missing_fields) && confirmation.missing_fields.length > 0
  const canConfirm = !isEditing && !hasMissingFields

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-1.5 text-[11px] text-[#5f6368] mb-1">
        <span>{getToolIcon(confirmation?.tool_id)}</span>
        <span className="font-semibold">{confirmation?.tool_label || 'Acción'}</span>
        {confirmation?.origin && (
          <span className={`action-confirm-origin ${confirmation.origin}`}>
            {confirmation.origin === 'openai' ? '🤖 OpenAI' : confirmation.origin === 'rules' ? '⚙️ Reglas' : '💾 Local'}
          </span>
        )}
      </div>

      <p className="action-confirm-preview">{confirmation?.preview}</p>

      {confirmation?.missing_fields?.length > 0 && (
        <div className="action-confirm-missing">
          <p>Faltan datos por completar antes de confirmar:</p>
          <ul>
            {confirmation.missing_fields.map((field) => <li key={field}>{field}</li>)}
          </ul>
          <p className="text-[11px] text-[#5f6368] mt-1">Edita tu mensaje para completar estos campos.</p>
        </div>
      )}

      {isEditing && (
        <div className="space-y-2 mb-2">
          <p className="text-[11px] text-[#5f6368]">Corrige el mensaje y aplica cambios antes de confirmar:</p>
          <textarea
            value={draftMessageText}
            onChange={(e) => setDraftMessageText(e.target.value)}
            className="profe-ia-textarea"
            style={{ minHeight: 110 }}
            placeholder="Escribe aquí tu mensaje corregido"
          />
          {errorText && (
            <p className="text-[11px] text-[#b42318]">{errorText}</p>
          )}
          <div className="action-confirm-btns">
            <button type="button" className="action-confirm-btn-confirm" onClick={applyEdit}>Aplicar cambios</button>
            <button type="button" className="action-confirm-btn-edit" onClick={cancelEdit}>Cancelar edición</button>
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="action-confirm-btns">
          <button type="button" className="action-confirm-btn-confirm" onClick={execute} disabled={!canConfirm}>Confirmar</button>
          <button type="button" className="action-confirm-btn-edit" onClick={beginEdit}>
            <Pencil className="w-3 h-3" />Editar
          </button>
          <button type="button" className="action-confirm-btn-cancel" onClick={() => onCancel?.()}>
            <XCircle className="w-3 h-3" />Cancelar
          </button>
        </div>
      )}

      {status === 'executing' && (
        <div className="inline-flex items-center gap-2 text-[#8a6500] text-[11px] font-semibold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ejecutando acción...
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[#1f7a44] text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> {successText}
          </div>
          {successData?.action?.type === 'navigate' && (
            <button type="button" className="agent-action-btn" onClick={() => navigate?.(successData.action.path)}>
              <ShieldCheck className="w-3 h-3" /> Ir a la sección
            </button>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[#b42318] text-[11px] font-semibold">
            <AlertCircle className="w-3.5 h-3.5" /> {errorText}
          </div>
          <button type="button" className="action-confirm-btn-cancel" onClick={execute} disabled={!canConfirm}>Reintentar</button>
        </div>
      )}
    </div>
  )
}
