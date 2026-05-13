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

export function installModule(
  state: GameState,
  instanceId: string,
): InstallModuleResult {
  const ownedItem = state.ownedItems.find((i) => i.instanceId === instanceId)
  if (!ownedItem) return { success: false, reason: 'item_not_found' }

  const def = contentCatalog.itemsById.get(ownedItem.itemId)
  if (!def || def.category !== 'householdModule') return { success: false, reason: 'not_a_module' }

  const alreadyInstalled = state.installedHouseModules.some(
    (m) => m.moduleItemId === ownedItem.itemId,
  )
  if (alreadyInstalled) return { success: false, reason: 'already_installed' }

  // Apply storage_expand effects to houseStorageCapacity directly
  const storageExpansion = def.typedEffects
    .filter((e): e is Extract<typeof e, { type: 'storage_expand' }> => e.type === 'storage_expand')
    .reduce((sum, e) => sum + e.value, 0)

  const next = appendActivityLogEntry(
    {
      ...state,
      ownedItems: state.ownedItems.filter((i) => i.instanceId !== instanceId),
      installedHouseModules: [
        ...state.installedHouseModules,
        { moduleItemId: ownedItem.itemId, installedAtDay: state.day },
      ],
      houseStorageCapacity: state.houseStorageCapacity + storageExpansion,
    },
    'system',
    `${def.name} installed on Day ${state.day}.${storageExpansion > 0 ? ` Storage +${storageExpansion}.` : ''}`,
  )

  return { success: true, state: next }
}
