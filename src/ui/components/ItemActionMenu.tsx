import type { ItemAction } from '../../application/selectors/inventory'

interface ItemActionMenuProps {
  actions: ItemAction[]
  onAction: (action: ItemAction) => void
  onClose: () => void
}

export function ItemActionMenu({ actions, onAction, onClose }: ItemActionMenuProps) {
  if (actions.length === 0) return null

  return (
    <div className="item-action-menu" role="menu" aria-label="Item actions">
      {actions.map((action) => (
        <button
          key={action.type}
          className="item-action-menu__item"
          role="menuitem"
          onClick={() => {
            onAction(action)
            onClose()
          }}
        >
          {action.label}
        </button>
      ))}
      <button className="item-action-menu__close" onClick={onClose} aria-label="Close menu">
        Cancel
      </button>
    </div>
  )
}
