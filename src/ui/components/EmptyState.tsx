import { Link } from 'react-router-dom'

interface EmptyStateCta {
  label: string
  onClick?: () => void
  to?: string
}

interface EmptyStateProps {
  message: string
  icon?: string
  cta?: EmptyStateCta
  className?: string
}

export function EmptyState({ message, icon, cta, className }: EmptyStateProps) {
  return (
    <div className={`empty-state${className ? ` ${className}` : ''}`} role="status">
      {icon && <span className="empty-state__icon" aria-hidden="true">{icon}</span>}
      <p className="empty-state__message">{message}</p>
      {cta && (
        cta.to ? (
          <Link to={cta.to} className="action-button action-button--ghost">{cta.label}</Link>
        ) : (
          <button type="button" className="action-button action-button--ghost" onClick={cta.onClick}>
            {cta.label}
          </button>
        )
      )}
    </div>
  )
}
