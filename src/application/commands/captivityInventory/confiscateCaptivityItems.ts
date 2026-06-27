/**
 * Apply Captivity Inventory Confiscation
 *
 * When an NPC is captured, this command confiscates items based on the captivity regime's rules.
 * Different regimes (kidnap, imprisonment, arrest, search) have different confiscation policies.
 *
 * Guards:
 * - NPC must exist in roster
 * - Captivity state must be transitioning to 'captive'
 * - Confiscation rules must be defined for the regime type
 *
 * Effects:
 * - Removes weapons, money, and/or items based on confiscationType
 * - Preserves basic clothing (tunic, trousers) for dignity
 * - Logs confiscation to activity log
 */

import type { GameState } from '../../../domain'
import { appendActivityLogEntry } from '../activityLog'
import { contentCatalog } from '../../content/contentCatalog'
import type { CaptivityRegime, ConfiscationType } from '../../../domain/npc/contracts'

/**
 * Parameters for applying captivity confiscation.
 */
export interface ConfiscateCaptivityItemsParams {
  npcId: string
  regime: CaptivityRegime
  confiscationType: ConfiscationType
}

/**
 * Confiscation rules by regime type.
 * Each regime defines what gets confiscated when an NPC is captured.
 */
const CONFISCATION_RULES: Record<CaptivityRegime, {
  [key in ConfiscationType]: {
    confiscateWeapons: boolean
    confiscateMoney: boolean
    confiscateItems: boolean
    confiscateSentimental: boolean
    allowedCategories: string[]
  }
}> = {
  unknown: {
    kidnap: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: false, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    imprisonment: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    arrest: { confiscateWeapons: true, confiscateMoney: false, confiscateItems: false, confiscateSentimental: false, allowedCategories: ['basic_clothing', 'personal'] },
    search: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: true, allowedCategories: [] },
  },
  hidden: {
    kidnap: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: false, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    imprisonment: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    arrest: { confiscateWeapons: true, confiscateMoney: false, confiscateItems: false, confiscateSentimental: false, allowedCategories: ['basic_clothing', 'personal'] },
    search: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
  },
  guarded: {
    kidnap: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    imprisonment: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    arrest: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: false, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    search: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
  },
  penal: {
    kidnap: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: true, allowedCategories: [] },
    imprisonment: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: true, allowedCategories: [] },
    arrest: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    search: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: true, allowedCategories: [] },
  },
  commercial: {
    kidnap: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    imprisonment: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    arrest: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    search: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
  },
  protective: {
    kidnap: { confiscateWeapons: true, confiscateMoney: false, confiscateItems: false, confiscateSentimental: false, allowedCategories: ['basic_clothing', 'personal'] },
    imprisonment: { confiscateWeapons: true, confiscateMoney: false, confiscateItems: false, confiscateSentimental: false, allowedCategories: ['basic_clothing', 'personal'] },
    arrest: { confiscateWeapons: true, confiscateMoney: false, confiscateItems: false, confiscateSentimental: false, allowedCategories: ['basic_clothing', 'personal'] },
    search: { confiscateWeapons: true, confiscateMoney: false, confiscateItems: false, confiscateSentimental: false, allowedCategories: ['basic_clothing', 'personal'] },
  },
  medical: {
    kidnap: { confiscateWeapons: true, confiscateMoney: false, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing', 'medical'] },
    imprisonment: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
    arrest: { confiscateWeapons: true, confiscateMoney: false, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing', 'medical'] },
    search: { confiscateWeapons: true, confiscateMoney: true, confiscateItems: true, confiscateSentimental: false, allowedCategories: ['basic_clothing'] },
  },
}

/**
 * Checks if an item category is allowed to be kept during confiscation.
 */
function isAllowedCategory(itemCategory: string, allowedCategories: string[]): boolean {
  return allowedCategories.some((allowed) => {
    if (allowed === 'basic_clothing') {
      return itemCategory === 'clothing' || itemCategory === 'consumable'
    }
    if (allowed === 'personal') {
      return itemCategory === 'clothing' || itemCategory === 'consumable' || itemCategory === 'sentimental'
    }
    if (allowed === 'medical') {
      return itemCategory === 'consumable' || itemCategory === 'medical'
    }
    return itemCategory === allowed
  })
}

/**
 * Applies confiscation rules to an NPC's inventory when captured.
 *
 * @param state - Current game state
 * @param params.npcId - ID of the captured NPC
 * @param params.regime - Captivity regime type
 * @param params.confiscationType - Type of confiscation (kidnap, imprisonment, arrest, search)
 * @returns Updated game state with confiscated items removed
 */
export function confiscateCaptivityItems(state: GameState, params: ConfiscateCaptivityItemsParams): GameState {
  const { npcId, regime, confiscationType } = params

  // Find NPC in roster
  const npcIndex = state.roster.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) {
    return state // NPC not found, no change
  }

  const npc = state.roster[npcIndex]

  // Get confiscation rules for this regime and type
  const rules = CONFISCATION_RULES[regime]?.[confiscationType]
  if (!rules) {
    return state // No rules defined, no change
  }

  // Track confiscated items for logging
  const confiscatedItems: string[] = []
  let moneyConfiscated = 0

  // Get NPC's current containers
  const npcContainers = state.inventoryState.npcInventories[npcId] || []

  // Process confiscation from inventory containers
  const updatedContainers = npcContainers.map((container) => {
    const updatedSlots = container.slots.filter((slot) => {
      if (!slot.itemInstanceId) return true

      // Check if this item should be confiscated
      const itemDef = contentCatalog.itemsById.get(slot.itemInstanceId)
      const itemCategory = itemDef?.category || 'general'
      const isSentimental = itemDef?.tags?.includes('sentimental') || false

      // Check if item is allowed
      if (isAllowedCategory(itemCategory, rules.allowedCategories)) {
        return true
      }

      // Apply confiscation rules
      let shouldConfiscate = false

      if (itemCategory === 'weapon' && rules.confiscateWeapons) {
        shouldConfiscate = true
      } else if ((itemCategory === 'consumable' && slot.itemInstanceId.includes('coin')) && rules.confiscateMoney) {
        shouldConfiscate = true
      } else if (rules.confiscateItems && !isSentimental) {
        shouldConfiscate = true
      } else if (rules.confiscateSentimental && isSentimental) {
        shouldConfiscate = true
      }

      if (shouldConfiscate) {
        confiscatedItems.push(itemDef?.name || slot.itemInstanceId)
        if (slot.itemInstanceId.includes('coin')) {
          moneyConfiscated += slot.quantity
        }
        return false // Remove item
      }

      return true // Keep item
    })

    return { ...container, slots: updatedSlots }
  })

  // Update inventory state
  let newState: GameState = state
  if (updatedContainers.length > 0 || npcContainers.length > 0) {
    newState = {
      ...newState,
      inventoryState: {
        ...newState.inventoryState,
        npcInventories: {
          ...newState.inventoryState.npcInventories,
          [npcId]: updatedContainers,
        },
      },
    }
  }

  // Remove carried cash from personalFunds if money confiscated
  if (moneyConfiscated > 0) {
    const npc = newState.roster[npcIndex]
    const confiscatedCash = Math.min(moneyConfiscated, npc.personalFunds.carriedCash)
    if (confiscatedCash > 0) {
      newState = {
        ...newState,
        roster: newState.roster.map((n, i) =>
          i === npcIndex
            ? {
                ...n,
                personalFunds: {
                  ...n.personalFunds,
                  carriedCash: n.personalFunds.carriedCash - confiscatedCash,
                },
              }
            : n,
        ),
      }
    }
  }

  // Log confiscation
  const itemName = confiscatedItems.length > 0 ? confiscatedItems.join(', ') : 'items'
  newState = appendActivityLogEntry(
    newState,
    'system',
    `${npc.name}'s ${confiscationType}: ${itemName} confiscated.`,
  )

  return newState
}
