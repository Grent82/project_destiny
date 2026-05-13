import { useState } from 'react'
import { useAppDispatch, useAppSelector, useAppStore } from '../app/hooks'
import { selectItemsByLocation, selectItemActions } from '../../application'
import { selectExpeditionCarryLoad } from '../../application/selectors/expeditionCarry'
import { contentCatalog } from '../../application/content/contentCatalog'
import { ItemCard } from './ItemCard'
import { CarryLimitBar } from './CarryLimitBar'
import { TargetPickerModal } from './TargetPickerModal'
import type { ItemAction } from '../../application/selectors/inventory'
import { gameActions } from '../../application/store/gameSlice'

export function MissionPackPanel() {
  const store = useAppStore()
  const dispatch = useAppDispatch()
  const packedItems = useAppSelector((s) => selectItemsByLocation(s, 'mission_pack'))
  const carrySlots = useAppSelector(selectExpeditionCarryLoad)

  const [pendingAction, setPendingAction] = useState<{ action: ItemAction; instanceId: string } | null>(null)

  function handleAction(action: ItemAction, instanceId: string) {
    if (action.requiresTarget) {
      setPendingAction({ action, instanceId })
      return
    }
    if (action.type === 'unpack') {
      dispatch(gameActions.moveItem({ instanceId, location: 'inventory' }))
    }
  }

  return (
    <section className="mission-pack-panel" aria-label="Mission Pack">
      <h2 className="mission-pack-panel__title">Mission Pack</h2>

      <div className="mission-pack-panel__carry-bars" aria-label="Carry limits">
        {carrySlots.map((slot) => (
          <CarryLimitBar
            key={slot.category}
            category={slot.category}
            current={slot.used}
            limit={slot.limit}
          />
        ))}
      </div>

      <div className="mission-pack-panel__items" role="list" aria-label="Packed items">
        {packedItems.length === 0 && (
          <p className="mission-pack-panel__empty">Pack is empty.</p>
        )}
        {packedItems.map((owned) => {
          const def = contentCatalog.itemsById.get(owned.itemId)
          const actions = selectItemActions(store.getState(), owned.instanceId)
          const unpackAction = actions.find((a) => a.type === 'unpack')

          return (
            <ItemCard
              key={owned.instanceId}
              instanceId={owned.instanceId}
              name={def?.name ?? owned.itemId}
              category={def?.category ?? '—'}
              quantity={owned.quantity}
              primaryAction={unpackAction}
              onAction={(a) => handleAction(a, owned.instanceId)}
            />
          )
        })}
      </div>

      {pendingAction && (
        <TargetPickerModal
          state={store.getState()}
          onSelect={(npcId) => {
            if (pendingAction.action.type === 'give') {
              dispatch(gameActions.giveItemToNpc({ instanceId: pendingAction.instanceId, npcId }))
            }
            setPendingAction(null)
          }}
          onClose={() => setPendingAction(null)}
        />
      )}
    </section>
  )
}
