import { useEffect, useId } from 'react'

interface ConfirmationModalProps {
  heading: string
  consequence: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationModal({
  heading,
  consequence,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const headingId = useId()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="event-modal-overlay" onClick={onCancel}>
      <div
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="event-modal-kicker">Confirm action</p>
        <h2 id={headingId} className="event-modal-title">{heading}</h2>
        <p className="event-modal-description">{consequence}</p>
        <div className="event-modal-choices">
          <button
            className="action-button action-button--primary"
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            className="action-button"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
