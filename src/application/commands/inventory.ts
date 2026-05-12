import type { GameState } from '../../domain'

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
    entry.itemId === itemId
      ? { ...entry, quantity: entry.quantity + quantity }
      : entry,
  )
}
