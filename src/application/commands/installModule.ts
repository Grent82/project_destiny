/**
 * installModule command
 *
 * Moves a householdModule item from ownedItems to installedHouseModules.
 * storage_expand effects are applied directly to houseStorageCapacity.
 * baseImprovement effects are applied to houseImprovements.
 * rest_quality_bonus effects are applied to sleepQualityBonus.
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
import { removePlayerItem } from './inventory/inventoryHelpers'

export type InstallModuleResult =
  | { success: true; state: GameState }
  | { success: false; reason: 'item_not_found' | 'not_a_module' | 'already_installed' }

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

  let next: GameState = removePlayerItem(state, itemId)

  // Apply storage_expand effects to houseStorageCapacity directly
  const storageExpansion = def.typedEffects
    .filter((e): e is Extract<typeof e, { type: 'storage_expand' }> => e.type === 'storage_expand')
    .reduce((sum, e) => sum + e.value, 0)

  // Apply baseImprovement effects to houseImprovements
  for (const effect of def.typedEffects) {
    if (effect.type === 'baseImprovement') {
      const stat = effect.stat as 'waterQuality' | 'herbSupply' | 'entrySecurity'
      const value = typeof effect.value === 'number' ? effect.value : 0

      if (stat === 'waterQuality') {
        next = {
          ...next,
          houseImprovements: {
            ...next.houseImprovements,
            waterQuality: next.houseImprovements.waterQuality + value,
          },
        }
      } else if (stat === 'herbSupply') {
        next = {
          ...next,
          houseImprovements: {
            ...next.houseImprovements,
            herbSupply: next.houseImprovements.herbSupply + value,
          },
        }
      } else if (stat === 'entrySecurity') {
        next = {
          ...next,
          houseImprovements: {
            ...next.houseImprovements,
            entrySecurity: next.houseImprovements.entrySecurity + value,
          },
        }
      }
    }
  }

  // Apply rest_quality_bonus effects to sleepQualityBonus
  const restQualityBonus = def.typedEffects
    .filter((e): e is Extract<typeof e, { type: 'rest_quality_bonus' }> => e.type === 'rest_quality_bonus')
    .reduce((sum, e) => sum + e.value, 0)

  if (restQualityBonus !== 0) {
    next = {
      ...next,
      sleepQualityBonus: next.sleepQualityBonus + restQualityBonus,
    }
  }

  // Add to installed modules
  next = {
    ...next,
    installedHouseModules: [
      ...state.installedHouseModules,
      { moduleItemId: itemId, installedAtDay: state.day },
    ],
    houseStorageCapacity: state.houseStorageCapacity + storageExpansion,
  }

  // Build log message
  const logLines: string[] = [`${def.name} installed on Day ${state.day}.`]
  if (storageExpansion > 0) {
    logLines.push(`Storage +${storageExpansion}.`)
  }
  if (restQualityBonus !== 0) {
    logLines.push(`Sleep quality +${restQualityBonus}.`)
  }

  // Add baseImprovement info to log
  for (const effect of def.typedEffects) {
    if (effect.type === 'baseImprovement') {
      const stat = effect.stat
      const value = typeof effect.value === 'number' ? effect.value : 0
      logLines.push(`${stat} +${value}.`)
    }
  }

  next = appendActivityLogEntry(next, 'system', logLines.join(' '))

  return { success: true, state: next }
}
