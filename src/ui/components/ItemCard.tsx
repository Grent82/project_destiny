import type { ItemAction } from '../../application/selectors/inventory'

interface ItemCardProps {
  instanceId: string
  name: string
  category: string
  description?: string
  quantity: number
  primaryAction?: ItemAction
  onAction: (action: ItemAction) => void
  onOpenMenu?: () => void
  sourceLabel?: string
}

export function ItemCard({
  name,
  category,
  description,
  quantity,
  primaryAction,
  onAction,
  onOpenMenu,
  sourceLabel,
}: ItemCardProps) {
  return (
    <div className="item-card" role="listitem">
      <div className="item-card__info">
        <span className="item-card__name">{name}</span>
        <span className="item-card__category">{category}</span>
        {sourceLabel && <span className="item-card__source">{sourceLabel}</span>}
        {quantity > 1 && <span className="item-card__quantity">×{quantity}</span>}
        {description && <span className="item-card__description">{description}</span>}
      </div>
      <div className="item-card__actions">
        {primaryAction && (
          <button
            className="item-card__primary-btn"
            onClick={() => onAction(primaryAction)}
            aria-label={primaryAction.label}
          >
            {primaryAction.label}
          </button>
        )}
        {onOpenMenu && (
          <button
            className="item-card__menu-btn"
            onClick={onOpenMenu}
            aria-label="More actions"
          >
            ⋯
          </button>
        )}
      </div>
    </div>
  )
}
