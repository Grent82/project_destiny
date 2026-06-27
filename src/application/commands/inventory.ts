import type { GameState } from '../../domain'
import type { OwnedItemLocation } from '../../domain/items/contracts'

/**
 * LEGACY INVENTORY FUNCTIONS - DEPRECATED
 *
 * These functions operate on the old `ownedItems` array and are kept only for
 * backward compatibility during the migration to the new `inventoryState` system.
 *
 * New code should use the functions in `inventory/inventoryHelpers.ts`:
 * - addPlayerItem (instead of addOwnedItem)
 * - removePlayerItem (instead of removeOwnedItem)
 * - findPlayerItem (instead of searching ownedItems directly)
 * - hasPlayerItem (instead of checking ownedItems directly)
 */

let _instanceCounter = 0
function nextInstanceId(itemId: string): string {
  return `inst-${itemId}-${Date.now()}-${++_instanceCounter}`
}

/**
 * @deprecated Use `addPlayerItem` from `inventory/inventoryHelpers.ts` instead.
 * This function operates on the legacy ownedItems array.
 */
export function addOwnedItem(
  state: GameState,
  itemId: string,
  quantity = 1,
  location: OwnedItemLocation = 'inventory',
  currentDurability?: number,
): GameState {
  const existing = state.ownedItems.find(
    (o) => o.itemId === itemId && o.location === location && !currentDurability,
  )
  if (existing) {
    return {
      ...state,
      ownedItems: state.ownedItems.map((o) =>
        o === existing ? { ...o, quantity: o.quantity + quantity } : o,
      ),
    }
  }
  return {
    ...state,
    ownedItems: [
      ...state.ownedItems,
      { instanceId: nextInstanceId(itemId), itemId, location, quantity, ...(currentDurability !== undefined ? { currentDurability } : {}) },
    ],
  }
}

/**
 * @deprecated Use `removePlayerItem` from `inventory/inventoryHelpers.ts` instead.
 * This function operates on the legacy ownedItems array.
 */
export function removeOwnedItem(
  state: GameState,
  itemId: string,
  quantity = 1,
  location: OwnedItemLocation = 'inventory',
): GameState {
  const existing = state.ownedItems.find(
    (o) => o.itemId === itemId && o.location === location,
  )
  if (!existing) return state
  if (existing.quantity <= quantity) {
    return { ...state, ownedItems: state.ownedItems.filter((o) => o !== existing) }
  }
  return {
    ...state,
    ownedItems: state.ownedItems.map((o) =>
      o === existing ? { ...o, quantity: o.quantity - quantity } : o,
    ),
  }
}

/**
 * @deprecated This function operates on the legacy ownedItems array.
 * Item movement is now handled through the moveItem reducer.
 */
export function moveOwnedItem(
  state: GameState,
  instanceId: string,
  newLocation: OwnedItemLocation,
): GameState {
  return {
    ...state,
    ownedItems: state.ownedItems.map((o) =>
      o.instanceId === instanceId ? { ...o, location: newLocation } : o,
    ),
  }
}

/**
 * @deprecated Legacy function no longer used. The inventory array has been
 * replaced by inventoryState.player.bagContainers.
 */
export function addInventoryEntry(
  _inventory: GameState['inventory'],
  _itemId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _quantity: number = 1,
): GameState['inventory'] {
  // This function is deprecated and no longer used
  return []
}
