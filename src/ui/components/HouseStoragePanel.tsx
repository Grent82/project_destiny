import { useState } from 'react'
import { useAppDispatch, useAppSelector, useAppStore } from '../app/hooks'
import {
  selectHouseStorageInfo,
  selectItemsByLocation,
  selectItemActions,
} from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { ItemCard } from './ItemCard'
import { ItemActionMenu } from './ItemActionMenu'
import { TargetPickerModal } from './TargetPickerModal'
import type { ItemAction } from '../../application/selectors/inventory'
import { gameActions } from '../../application/store/gameSlice'

export function HouseStoragePanel() {
  const store = useAppStore()
  const dispatch = useAppDispatch()
  const storageInfo = useAppSelector(selectHouseStorageInfo)
  const storedItems = useAppSelector((s) => selectItemsByLocation(s, 'house_storage'))
  const inventoryItems = useAppSelector((s) => selectItemsByLocation(s, 'inventory'))
  const allVisible = [...storedItems, ...inventoryItems]

  const [menuForInstance, setMenuForInstance] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{ action: ItemAction; instanceId: string } | null>(null)

  function handleAction(action: ItemAction, instanceId: string) {
    if (action.requiresTarget) {
      setPendingAction({ action, instanceId })
      return
    }
    dispatchAction(action, instanceId, undefined)
  }

  function dispatchAction(action: ItemAction, instanceId: string, targetNpcId: string | undefined) {
    switch (action.type) {
      case 'install':
        dispatch(gameActions.installModuleItem({ instanceId }))
        break
      case 'pack':
        dispatch(gameActions.moveItem({ instanceId, location: 'mission_pack' }))
        break
      case 'unpack':
        dispatch(gameActions.moveItem({ instanceId, location: 'house_storage' }))
        break
      case 'give':
        if (targetNpcId) dispatch(gameActions.giveItemToNpc({ instanceId, npcId: targetNpcId }))
        break
      default:
        break
    }
  }

  const pct = storageInfo.capacity > 0 ? (storageInfo.usedSlots / storageInfo.capacity) * 100 : 0

  return (
    <section className="house-storage-panel" aria-label="House Storage">
      <h2 className="house-storage-panel__title">House Storage</h2>

      <div className="house-storage-panel__capacity">
        <span>Stored: {storageInfo.usedSlots} / {storageInfo.capacity}</span>
        <div className="capacity-bar">
          <div className="capacity-bar__fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="house-storage-panel__items" role="list" aria-label="Stored items">
        {allVisible.length === 0 && (
          <p className="house-storage-panel__empty">No items stored.</p>
        )}
        {allVisible.map((owned) => {
          const def = contentCatalog.itemsById.get(owned.itemId)
          const actions = selectItemActions(store.getState(), owned.instanceId)
          const primary = actions[0]
          const secondary = actions.slice(1)

          return (
            <div key={owned.instanceId}>
              <ItemCard
                instanceId={owned.instanceId}
                name={def?.name ?? owned.itemId}
                category={def?.category ?? '—'}
                quantity={owned.quantity}
                primaryAction={primary}
                onAction={(a) => handleAction(a, owned.instanceId)}
                onOpenMenu={secondary.length > 0 ? () => setMenuForInstance(owned.instanceId) : undefined}
              />
              {menuForInstance === owned.instanceId && (
                <ItemActionMenu
                  actions={secondary}
                  onAction={(a) => { handleAction(a, owned.instanceId); setMenuForInstance(null) }}
                  onClose={() => setMenuForInstance(null)}
                />
              )}
            </div>
          )
        })}
      </div>

      {pendingAction && (
        <TargetPickerModal
          state={store.getState()}
          onSelect={(npcId) => {
            dispatchAction(pendingAction.action, pendingAction.instanceId, npcId)
            setPendingAction(null)
          }}
          onClose={() => setPendingAction(null)}
        />
      )}
    </section>
  )
}
