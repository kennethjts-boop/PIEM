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
  const [draftPayloadText, setDraftPayloadText] = useState(() => JSON.stringify(confirmation?.payload || {}, null, 2))

  useEffect(() => {
    const nextPayload = confirmation?.payload || {}
    setEditablePayload(nextPayload)
    setDraftPayloadText(JSON.stringify(nextPayload, null, 2))
    setIsEditing(false)
    setStatus('pending')
    setErrorText('')
    setSuccessData(null)
  }, [confirmation?.payload])

  const beginEdit = () => {
    setIsEditing(true)
    setDraftPayloadText(JSON.stringify(editablePayload || {}, null, 2))
    setStatus('pending')
    setErrorText('')
  }

  const applyEdit = () => {
    try {
      const parsed = JSON.parse(draftPayloadText)
      setEditablePayload(parsed)
      setIsEditing(false)
      onEdit?.(parsed)
    } catch {
      setErrorText('JSON inválido. Revisa el formato antes de aplicar cambios.')
      setStatus('error')
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setDraftPayloadText(JSON.stringify(editablePayload || {}, null, 2))
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

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-1.5 text-[11px] text-[#5f6368] mb-1">
        <span>{getToolIcon(confirmation?.tool_id)}</span>
        <span className="font-semibold">{confirmation?.tool_label || 'Acción'}</span>
      </div>

      <p className="action-confirm-preview">{confirmation?.preview}</p>

      {isEditing && (
        <div className="space-y-2 mb-2">
          <p className="text-[11px] text-[#5f6368]">Edita el payload y aplica cambios antes de confirmar:</p>
          <textarea
            value={draftPayloadText}
            onChange={(e) => setDraftPayloadText(e.target.value)}
            className="profe-ia-textarea"
            style={{ minHeight: 110, fontFamily: 'monospace' }}
          />
          <div className="action-confirm-btns">
            <button type="button" className="action-confirm-btn-confirm" onClick={applyEdit}>Aplicar cambios</button>
            <button type="button" className="action-confirm-btn-edit" onClick={cancelEdit}>Cancelar edición</button>
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="action-confirm-btns">
          <button type="button" className="action-confirm-btn-confirm" onClick={execute} disabled={isEditing}>Confirmar</button>
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
            <CheckCircle2 className="w-3.5 h-3.5" /> {confirmation?.success_message || 'Acción completada correctamente.'}
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
          <button type="button" className="action-confirm-btn-cancel" onClick={execute}>Reintentar</button>
        </div>
      )}
    </div>
  )
}
