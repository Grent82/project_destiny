/**
 * installModule command
 *
 * Moves a householdModule item from ownedItems to installedHouseModules.
 * storage_expand effects are applied directly to houseStorageCapacity.
 * The item is removed from the storable pool permanently.
 *
 * Validation:
 * - Item must exist in ownedItems
 * - Item must be a householdModule category
 * - Item must not already be installed
 */

import type { GameState } from '../../domain/game/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'

export type InstallModuleResult =
  | { success: true; state: GameState }
  | { success: false; reason: 'item_not_found' | 'not_a_module' | 'already_installed' }

import { removePlayerItem } from './inventory/inventoryHelpers'

export function installModule(
  state: GameState,
  instanceId: string,
): InstallModuleResult {
  // Find item in player inventory by instanceId
  // In the new system, instanceId is stored as itemInstanceId in the slot
  const playerItem = state.inventoryState.player.bagContainers.flatMap(c => c.slots).find(s => s.itemInstanceId === instanceId)
  if (!playerItem || !playerItem.itemInstanceId) return { success: false, reason: 'item_not_found' }

  // The itemInstanceId is the itemId (for items without unique instances)
  const itemId = playerItem.itemInstanceId
  const def = contentCatalog.itemsById.get(itemId)
  if (!def || def.category !== 'householdModule') return { success: false, reason: 'not_a_module' }

  const alreadyInstalled = state.installedHouseModules.some(
    (m) => m.moduleItemId === itemId,
  )
  if (alreadyInstalled) return { success: false, reason: 'already_installed' }

  // Apply storage_expand effects to houseStorageCapacity directly
  const storageExpansion = def.typedEffects
    .filter((e): e is Extract<typeof e, { type: 'storage_expand' }> => e.type === 'storage_expand')
    .reduce((sum, e) => sum + e.value, 0)

  // Remove item from inventory first
  let next = removePlayerItem(state, itemId)

  next = appendActivityLogEntry(
    {
      ...next,
      installedHouseModules: [
        ...state.installedHouseModules,
        { moduleItemId: itemId, installedAtDay: state.day },
      ],
      houseStorageCapacity: state.houseStorageCapacity + storageExpansion,
    },
    'system',
    `${def.name} installed on Day ${state.day}.${storageExpansion > 0 ? ` Storage +${storageExpansion}.` : ''}`,
  )

  return { success: true, state: next }
}
