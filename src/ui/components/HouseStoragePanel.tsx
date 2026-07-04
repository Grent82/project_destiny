import { useState } from 'react'
import { useAppDispatch, useAppSelector, useAppStore } from '../app/hooks'
import {
  selectHouseholdStorageInfo,
  selectItemsByLocation,
  selectItemActions,
} from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { computeSellPrice } from '../../application/commands/sellItem'
import { ItemCard } from './ItemCard'
import { ItemActionMenu } from './ItemActionMenu'
import { TargetPickerModal } from './TargetPickerModal'
import { DocumentPreviewModal } from './DocumentPreviewModal'
import { ConfirmationModal } from './ConfirmationModal'
import type { ItemAction } from '../../application/selectors/inventory'
import { gameActions } from '../../application/store/gameSlice'
import { formatMarksAbbrev } from '../../domain/game/currency'

export function HouseStoragePanel() {
  const store = useAppStore()
  const dispatch = useAppDispatch()
  const storageInfo = useAppSelector(selectHouseholdStorageInfo)
  const storedItems = useAppSelector((s) => selectItemsByLocation(s, 'house_storage'))
  const inventoryItems = useAppSelector((s) => selectItemsByLocation(s, 'inventory'))
  const allVisible = [...storedItems, ...inventoryItems]

  const [menuForInstance, setMenuForInstance] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{ action: ItemAction; instanceId: string } | null>(null)
  const [previewDocument, setPreviewDocument] = useState<{ title: string; description: string } | null>(null)
  const [pendingSellConfirm, setPendingSellConfirm] = useState<{ instanceId: string; itemName: string; sellPrice: number } | null>(null)

  function handleAction(action: ItemAction, instanceId: string) {
    if (action.requiresTarget) {
      setPendingAction({ action, instanceId })
      return
    }
    if (action.type === 'open') {
      const inventoryState = store.getState().game.inventoryState
      const instanceDef = inventoryState.itemRegistry[instanceId]
      const def = instanceDef ? contentCatalog.itemsById.get(instanceDef.itemId) : null
      if (def) {
        setPreviewDocument({
          title: def.name,
          description: def.description ?? 'No readable notes are attached to this document yet.',
        })
      }
      return
    }
    if (action.type === 'sell') {
      const inventoryState = store.getState().game.inventoryState
      const instanceDef = inventoryState.itemRegistry[instanceId]
      const def = instanceDef ? contentCatalog.itemsById.get(instanceDef.itemId) : null
      const sellPrice = computeSellPrice(store.getState().game, instanceId)
      setPendingSellConfirm({ instanceId, itemName: def?.name ?? 'item', sellPrice })
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
      case 'sell':
        dispatch(gameActions.sellItem({ instanceId }))
        break
      default:
        break
    }
  }

  const pct = storageInfo.total > 0 ? (storageInfo.used / storageInfo.total) * 100 : 0

  return (
    <section className="house-storage-panel" aria-label="House Storage">
      <h2 className="house-storage-panel__title">House Storage</h2>

      <div className="house-storage-panel__capacity">
        <span>Stored: {storageInfo.used} / {storageInfo.total}</span>
        <div className="capacity-bar">
          <div className="capacity-bar__fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="house-storage-panel__items" role="list" aria-label="Stored items">
        {allVisible.length === 0 && (
          <p className="house-storage-panel__empty">House Storage is empty. Items deposited here can be accessed by all household members.</p>
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
                description={def?.description}
                quantity={owned.quantity}
                primaryAction={primary}
                onAction={(a) => handleAction(a, owned.instanceId)}
                onOpenMenu={secondary.length > 0 ? () => setMenuForInstance(owned.instanceId) : undefined}
                sourceLabel={storedItems.some((i) => i.instanceId === owned.instanceId) ? 'House Storage' : undefined}
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

      {previewDocument && (
        <DocumentPreviewModal
          title={previewDocument.title}
          description={previewDocument.description}
          onClose={() => setPreviewDocument(null)}
        />
      )}

      {pendingSellConfirm && (
        <ConfirmationModal
          heading={`Sell ${pendingSellConfirm.itemName}?`}
          consequence={`This will permanently sell the item. You will receive ${formatMarksAbbrev(pendingSellConfirm.sellPrice)}.`}
          confirmLabel="Sell item"
          onConfirm={() => {
            dispatch(gameActions.sellItem({ instanceId: pendingSellConfirm.instanceId }))
            setPendingSellConfirm(null)
          }}
          onCancel={() => setPendingSellConfirm(null)}
        />
      )}
    </section>
  )
}
