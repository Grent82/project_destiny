import type { GameState } from '../../domain'
import type { OwnedItemLocation } from '../../domain/items/contracts'

let _instanceCounter = 0
function nextInstanceId(itemId: string): string {
  return `inst-${itemId}-${Date.now()}-${++_instanceCounter}`
}

/**
 * Add an item to ownedItems (primary model).
 * Stacks quantity on existing inventory-location items; creates new instance otherwise.
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
 * Remove quantity from ownedItems. Removes the entry when quantity reaches 0.
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
 * Move an owned item instance to a new location.
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

/** @deprecated Use addOwnedItem. Kept for callers not yet migrated. */
export function addInventoryEntry(
  inventory: GameState['inventory'],
  itemId: string,
  quantity = 1,
): GameState['inventory'] {
  const existingEntry = inventory.find((entry) => entry.itemId === itemId)
  if (!existingEntry) {
    return [...inventory, { itemId, quantity }]
  }
  return inventory.map((entry) =>
    entry.itemId === itemId ? { ...entry, quantity: entry.quantity + quantity } : entry,
  )
}
