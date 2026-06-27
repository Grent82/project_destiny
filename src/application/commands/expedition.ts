import type { GameState } from '../../domain/game/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { formatMarks } from '../../domain/game/currency'
import { addPlayerItem } from './inventory/inventoryHelpers'
import type { ExpeditionDiscovery } from '../../domain/expedition/contracts'

/**
 * Generate a random encounter for a given expedition day.
 * Injected random for testability.
 */
export function generateExpeditionEncounter(
  day: number,
  dangerLevel: number,
  random: number,
): { type: 'combat' | 'event' | 'discovery' | 'none'; label: string } {
  void day
  const combatChance = dangerLevel * 0.12 // level 2 = 24%, level 4 = 48%
  const discoveryChance = 0.35

  if (random < combatChance) {
    return { type: 'combat', label: 'Hostile contact on the road.' }
  } else if (random < combatChance + discoveryChance) {
    return { type: 'discovery', label: 'Something of value found.' }
  } else if (random < combatChance + discoveryChance + 0.2) {
    return { type: 'event', label: 'An unexpected encounter.' }
  }
  return { type: 'none', label: 'An uneventful stretch.' }
}

/**
 * Weighted random selection from discovery table.
 */
export function rollDiscovery(
  discoveryTable: Array<{
    type: string
    itemId?: string
    loreKey?: string
    label?: string
    amount?: number
    weight: number
  }>,
  random: number,
): ExpeditionDiscovery | null {
  const totalWeight = discoveryTable.reduce((sum, e) => sum + e.weight, 0)
  let cursor = random * totalWeight
  for (const entry of discoveryTable) {
    cursor -= entry.weight
    if (cursor <= 0) {
      return {
        type: entry.type as 'item' | 'lore' | 'marks',
        itemId: entry.itemId,
        loreKey: entry.loreKey,
        label: entry.label,
        amount: entry.amount,
      }
    }
  }
  return null
}

/**
 * Apply expedition discoveries to state. Pure function — takes/returns GameState.
 */
export function applyExpeditionDiscoveries(
  state: GameState,
  discoveries: ExpeditionDiscovery[],
): GameState {
  let next = state

  for (const discovery of discoveries) {
    if (discovery.type === 'marks' && discovery.amount) {
      next = { ...next, money: next.money + discovery.amount }
      next = appendActivityLogEntry(
        next,
        'economy',
        `Expedition return: +${formatMarks(discovery.amount)} recovered.`,
      )
    } else if (discovery.type === 'item' && discovery.itemId) {
      const instanceId = `inst-${discovery.itemId}-${Date.now()}`
      next = addPlayerItem(next, instanceId, 1)
      // Add to itemRegistry
      next = {
        ...next,
        inventoryState: {
          ...next.inventoryState,
          itemRegistry: {
            ...next.inventoryState.itemRegistry,
            [instanceId]: {
              itemId: discovery.itemId,
              uniqueId: instanceId,
              quantity: 1,
              locationType: 'player_inventory' as const,
              acquiredDay: next.day,
              flags: [],
            },
          },
        },
      }
      const itemDef = contentCatalog.itemsById.get(discovery.itemId)
      next = appendActivityLogEntry(
        next,
        'economy',
        `Expedition return: recovered ${itemDef?.name ?? discovery.itemId}.`,
      )
    } else if (discovery.type === 'lore') {
      next = appendActivityLogEntry(
        next,
        'system',
        `Expedition return: ${discovery.label ?? 'Unknown find.'}`,
      )
    }
  }

  return next
}
