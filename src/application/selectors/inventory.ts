import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import type { OwnedItemLocation } from '../../domain/items/contracts'

export type ItemAction = {
  type: 'use' | 'give' | 'install' | 'sell' | 'open' | 'equip' | 'pack' | 'unpack'
  label: string
  requiresTarget: boolean
}

const CATEGORY_PRIMARY_ACTION: Record<string, ItemAction> = {
  consumable: { type: 'use', label: 'Use', requiresTarget: false },
  document: { type: 'open', label: 'Open', requiresTarget: false },
  gift: { type: 'give', label: 'Give', requiresTarget: true },
  tool: { type: 'equip', label: 'Equip', requiresTarget: false },
  householdModule: { type: 'install', label: 'Install in House', requiresTarget: false },
  module: { type: 'install', label: 'Install in House', requiresTarget: false },
  trade_good: { type: 'sell', label: 'Sell', requiresTarget: false },
  tradeGood: { type: 'sell', label: 'Sell', requiresTarget: false },
  material: { type: 'sell', label: 'Sell', requiresTarget: false },
  weapon: { type: 'equip', label: 'Equip', requiresTarget: false },
  armor: { type: 'equip', label: 'Equip', requiresTarget: false },
  accessory: { type: 'equip', label: 'Equip', requiresTarget: false },
}

/** Returns owned items filtered by storage location */
export function selectItemsByLocation(state: RootState, location: OwnedItemLocation) {
  return state.game.ownedItems.filter((i) => i.location === location)
}

/** Returns all available actions for a given owned item instance */
export function selectItemActions(state: RootState, instanceId: string): ItemAction[] {
  const owned = state.game.ownedItems.find((i) => i.instanceId === instanceId)
  if (!owned) return []

  const def = contentCatalog.itemsById.get(owned.itemId)
  if (!def) return []

  const actions: ItemAction[] = []
  const primary = CATEGORY_PRIMARY_ACTION[def.category]
  if (primary) actions.push(primary)

  // Secondary: pack/unpack between inventory and mission_pack
  if (owned.location === 'inventory' || owned.location === 'house_storage') {
    actions.push({ type: 'pack', label: 'Add to Pack', requiresTarget: false })
  }
  if (owned.location === 'mission_pack') {
    actions.push({ type: 'unpack', label: 'Remove from Pack', requiresTarget: false })
  }

  return actions
}
