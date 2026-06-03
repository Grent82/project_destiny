interface DocumentPreviewModalProps {
  title: string
  description: string
  onClose: () => void
}

export function DocumentPreviewModal({ title, description, onClose }: DocumentPreviewModalProps) {
  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div
        className="event-modal document-preview-modal"
        role="dialog"
        aria-label={`${title} preview`}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="event-modal-kicker">Document</p>
        <h2 className="event-modal-title">{title}</h2>
        <p className="event-modal-description">{description}</p>
        <button className="action-button action-button--primary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
