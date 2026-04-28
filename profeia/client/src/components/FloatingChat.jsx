import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import ProfeIAChat from './ProfeIAChat'

function FloatingChat({ docenteId, grado = null, userProfile = null, currentTier = 1 }) {
  const [isOpen, setIsOpen] = useState(false)
  const [renderPanel, setRenderPanel] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRenderPanel(true)
      setIsClosing(false)
      return
    }

    if (!renderPanel) return
    setIsClosing(true)
    const timeout = setTimeout(() => {
      setRenderPanel(false)
      setIsClosing(false)
    }, 180)

    return () => clearTimeout(timeout)
  }, [isOpen, renderPanel])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      {renderPanel && (
        <aside
          className={`floating-chat-panel ${isClosing ? 'is-closing' : ''}`}
          aria-label="Chat de ProfeIA"
        >
          <div className="floating-chat-header">
            <div className="floating-chat-title">
              <Sparkles className="w-4 h-4" />
              <span>ProfeIA</span>
            </div>
            <button
              type="button"
              className="floating-chat-close"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="floating-chat-content">
            <ProfeIAChat docenteId={docenteId} grado={grado} userProfile={userProfile} currentTier={currentTier} />
          </div>
        </aside>
      )}

      <button
        type="button"
        className="floating-chat-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Cerrar chat ProfeIA' : 'Abrir chat ProfeIA'}
      >
        <Sparkles className="w-5 h-5" />
      </button>
    </>
  )
}

export default FloatingChat
