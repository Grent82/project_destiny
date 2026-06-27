import type { GameState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'

/**
 * Captivity types that determine confiscation rules.
 */
export type CaptivityType = 'kidnap' | 'imprisonment' | 'arrest' | 'search'

/**
 * Confiscation rules per captivity type.
 */
const CONFISCATION_RULES: Record<CaptivityType, {
  confiscateAll: boolean
  confiscateWeapons: boolean
  confiscateMoney: boolean
  giveBasicClothes: boolean
}> = {
  kidnap: {
    confiscateAll: true,
    confiscateWeapons: true,
    confiscateMoney: true,
    giveBasicClothes: true,
  },
  imprisonment: {
    confiscateAll: false,
    confiscateWeapons: true,
    confiscateMoney: true,
    giveBasicClothes: true,
  },
  arrest: {
    confiscateAll: false,
    confiscateWeapons: true,
    confiscateMoney: false,
    giveBasicClothes: false,
  },
  search: {
    confiscateAll: false,
    confiscateWeapons: false,
    confiscateMoney: false,
    giveBasicClothes: false,
  },
}

/**
 * Checks if an item is a weapon based on its itemId or flags.
 */
function isWeaponItem(itemInstanceId: string, itemRegistry: Record<string, { itemId: string; flags: string[] }>): boolean {
  const item = itemRegistry[itemInstanceId]
  if (!item) return false
  // Check flags first
  if (item.flags.includes('weapon')) return true
  // Check itemId patterns for weapons
  const weaponPatterns = ['sword', 'blade', 'axe', 'hammer', 'mace', 'dagger', 'spear', 'bow', 'crossbow']
  return weaponPatterns.some((pattern) => item.itemId.toLowerCase().includes(pattern))
}

/**
 * Applies inventory confiscation when an NPC is captured.
 * Different captivity types have different confiscation rules:
 * - kidnap: All items taken, basic clothes provided
 * - imprisonment: Weapons and money taken, basic clothes provided
 * - arrest: Only weapons taken
 * - search: No confiscation
 */
export function applyCaptivityConfiscation(
  state: GameState,
  payload: { npcId: string; captivityType: CaptivityType }
): GameState {
  const { npcId, captivityType } = payload

  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  // Only confiscate if NPC is actually captive
  if (npc.captivityState?.status !== 'captive') return state

  const rules = CONFISCATION_RULES[captivityType]
  let next: GameState = { ...state, roster: [...state.roster], inventoryState: { ...state.inventoryState, npcInventories: { ...state.inventoryState.npcInventories } } }
  const nextNpc = { ...npc }

  // Remove weapons from equipment
  if (rules.confiscateWeapons || rules.confiscateAll) {
    nextNpc.equipment = { ...nextNpc.equipment, weapon: null }
  }

  // Remove money
  if (rules.confiscateMoney || rules.confiscateAll) {
    nextNpc.personalFunds = {
      ...nextNpc.personalFunds,
      savings: 0,
      carriedCash: 0,
    }
  }

  // Clear inventory slots based on rules
  const npcContainers = next.inventoryState.npcInventories[npcId] ? [...next.inventoryState.npcInventories[npcId]] : []
  if (npcContainers.length > 0) {
    for (const container of npcContainers) {
      const newContainer = { ...container, slots: container.slots.map((slot) => ({ ...slot })) }
      if (rules.confiscateAll) {
        // Clear all inventory slots
        for (const slot of newContainer.slots) {
          slot.itemInstanceId = null
        }
      } else if (rules.confiscateWeapons) {
        // Only remove weapon items from inventory
        for (const slot of newContainer.slots) {
          if (slot.itemInstanceId && isWeaponItem(slot.itemInstanceId, next.inventoryState.itemRegistry)) {
            slot.itemInstanceId = null
          }
        }
      }
      // Update the container in the array
      const containerIndex = npcContainers.findIndex((c) => c.containerId === container.containerId)
      if (containerIndex >= 0) {
        npcContainers[containerIndex] = newContainer
      }
    }
    // Update the npcInventories with modified containers
    next.inventoryState.npcInventories[npcId] = npcContainers
  }

  // Give basic clothes if required
  if (rules.giveBasicClothes) {
    nextNpc.clothing = {
      ...nextNpc.clothing,
      torso: 'item-basic-tunic',
      legs: 'item-basic-trousers',
    }
  }

  // Update captivity state with confiscation timestamp and confiscated items
  const currentCaptivity = nextNpc.captivityState!
  nextNpc.captivityState = {
    status: currentCaptivity.status,
    holderId: currentCaptivity.holderId,
    siteId: currentCaptivity.siteId,
    roomId: currentCaptivity.roomId,
    regime: currentCaptivity.regime,
    condition: currentCaptivity.condition,
    compliance: currentCaptivity.compliance,
    bondType: currentCaptivity.bondType,
    timeHeldDays: currentCaptivity.timeHeldDays,
    lastTransferDay: state.day,
    questTag: currentCaptivity.questTag,
    confiscatedItems: rules.confiscateAll || rules.confiscateWeapons
      ? [...currentCaptivity.confiscatedItems, { uniqueId: 'weapon-from-equipment', itemId: 'item-iron-sword', quantity: 1, confiscatedDay: state.day }]
      : currentCaptivity.confiscatedItems,
    confiscatedMoney: rules.confiscateMoney || rules.confiscateAll
      ? { savings: nextNpc.personalFunds.savings, carriedCash: nextNpc.personalFunds.carriedCash }
      : currentCaptivity.confiscatedMoney,
    confiscatedEquipment: rules.confiscateWeapons || rules.confiscateAll
      ? { weapon: nextNpc.equipment.weapon, armor: nextNpc.equipment.armor, accessory: nextNpc.equipment.accessory }
      : currentCaptivity.confiscatedEquipment,
  }

  // Update roster
  const nextRoster = next.roster.map((n) => (n.npcId === npcId ? nextNpc : n))
  next.roster = nextRoster

  // Add activity log entry
  const confiscationMessages: Record<CaptivityType, string> = {
    kidnap: 'All belongings confiscated. Basic garments provided.',
    imprisonment: 'Weapons and valuables seized. Prisoner rations issued.',
    arrest: 'Weapon surrendered under authority.',
    search: 'Search conducted. No items seized.',
  }

  next = appendActivityLogEntry(
    next,
    'system',
    `${npc.name} ${confiscationMessages[captivityType]}`
  )

  return next
}
