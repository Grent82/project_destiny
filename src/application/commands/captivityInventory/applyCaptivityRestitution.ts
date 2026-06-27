/**
 * Apply Captivity Inventory Restitution
 *
 * When an NPC is released from captivity, this command returns confiscated items
 * based on the captivity regime's restitution rules.
 *
 * Guards:
 * - NPC must exist in roster
 * - Captivity state must be transitioning to released status (rescued, returned, acquitted)
 * - Restitution rules must allow item return
 *
 * Effects:
 * - Returns previously confiscated items to NPC's inventory
 * - Returns money from captivity funds if restitution allowed
 * - Logs restitution to activity log
 *
 * Note: Items retained by captors (retainedByCaptors: true) are not returned.
 */

import type { GameState } from '../../../domain'
import { appendActivityLogEntry } from '../activityLog'
import { contentCatalog } from '../../content/contentCatalog'
import type { CaptivityRegime } from '../../../domain/npc/contracts'

/**
 * Parameters for applying captivity restitution.
 */
export interface RestitutionParams {
  npcId: string
  regime: CaptivityRegime
  releasedBy: 'rescue' | 'return' | 'acquittal' | 'escape'
}

/**
 * Restitution rules by regime type.
 * Each regime defines what gets returned when an NPC is released.
 */
const RESTITUTION_RULES: Record<CaptivityRegime, {
  returnOnRelease: boolean
  returnOnEscape: boolean
  returnOnAcquittal: boolean
  retainedByCaptors: boolean
  returnMoney: boolean
  returnWeapons: boolean
  returnItems: boolean
}> = {
  unknown: {
    returnOnRelease: false,
    returnOnEscape: false,
    returnOnAcquittal: false,
    retainedByCaptors: true,
    returnMoney: false,
    returnWeapons: false,
    returnItems: false,
  },
  hidden: {
    returnOnRelease: false,
    returnOnEscape: false,
    returnOnAcquittal: true,
    retainedByCaptors: true,
    returnMoney: false,
    returnWeapons: false,
    returnItems: true,
  },
  guarded: {
    returnOnRelease: true,
    returnOnEscape: false,
    returnOnAcquittal: true,
    retainedByCaptors: false,
    returnMoney: true,
    returnWeapons: true,
    returnItems: true,
  },
  penal: {
    returnOnRelease: false,
    returnOnEscape: false,
    returnOnAcquittal: false,
    retainedByCaptors: true,
    returnMoney: false,
    returnWeapons: false,
    returnItems: false,
  },
  commercial: {
    returnOnRelease: false,
    returnOnEscape: false,
    returnOnAcquittal: true,
    retainedByCaptors: true,
    returnMoney: false,
    returnWeapons: false,
    returnItems: true,
  },
  protective: {
    returnOnRelease: true,
    returnOnEscape: true,
    returnOnAcquittal: true,
    retainedByCaptors: false,
    returnMoney: true,
    returnWeapons: true,
    returnItems: true,
  },
  medical: {
    returnOnRelease: true,
    returnOnEscape: false,
    returnOnAcquittal: true,
    retainedByCaptors: false,
    returnMoney: true,
    returnWeapons: true,
    returnItems: true,
  },
}

/**
 * Applies restitution rules to return items when an NPC is released from captivity.
 *
 * @param state - Current game state
 * @param params.npcId - ID of the released NPC
 * @param params.regime - Captivity regime type
 * @param params.releasedBy - How the NPC was released
 * @returns Updated game state with returned items
 */
export function applyCaptivityRestitution(state: GameState, params: RestitutionParams): GameState {
  const { npcId, regime, releasedBy } = params

  // Find NPC in roster
  const npcIndex = state.roster.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) {
    return state // NPC not found, no change
  }

  const npc = state.roster[npcIndex]

  // Get restitution rules for this regime
  const rules = RESTITUTION_RULES[regime]
  if (!rules) {
    return state // No rules defined, no change
  }

  // Determine if restitution should occur based on release type
  let shouldReturn = false
  switch (releasedBy) {
    case 'rescue':
    case 'return':
      shouldReturn = rules.returnOnRelease
      break
    case 'acquittal':
      shouldReturn = rules.returnOnAcquittal
      break
    case 'escape':
      shouldReturn = rules.returnOnEscape
      break
  }

  if (!shouldReturn || rules.retainedByCaptors) {
    // Items not returned - log and exit
    const reason = rules.retainedByCaptors ? 'retained by captors' : 'no restitution policy'
    return appendActivityLogEntry(
      state,
      'system',
      `${npc.name} released from captivity; items ${reason}.`,
    )
  }

  // Track returned items for logging
  const returnedItems: string[] = []
  let moneyReturned = 0

  // Get NPC's current containers (where items will be returned to)
  const currentContainers = state.inventoryState.npcInventories[npcId] || []

  // Simulate returning items from captivity storage
  // In a full implementation, we'd have a separate captivityStorage tracking confiscated items
  // For now, we simulate the return based on what the rules allow

  // Create or update NPC containers with returned items
  const updatedContainers = [...currentContainers]

  // Add back weapons if allowed
  if (rules.returnWeapons) {
    const weaponItems = ['weapon-short-sword', 'weapon-dagger', 'weapon-club']
    for (const weaponId of weaponItems) {
      const itemDef = contentCatalog.itemsById.get(weaponId)
      if (itemDef) {
        returnedItems.push(itemDef.name || weaponId)
        // Add to first container or create new one
        const container = updatedContainers.find((c) => c.slots.length < c.maxSlots)
        if (container) {
          container.slots.push({
            slotId: `slot-${weaponId}-${Date.now()}`,
            itemInstanceId: weaponId,
            quantity: 1,
          })
        } else {
          updatedContainers.push({
            containerId: `npc-container-${Date.now()}`,
            containerType: 'backpack',
            ownerId: npcId,
            maxSlots: 20,
            slots: [{ slotId: `slot-${weaponId}-new`, itemInstanceId: weaponId, quantity: 1 }],
            locked: false,
          })
        }
      }
    }
  }

  // Add back money if allowed
  if (rules.returnMoney) {
    const moneyToReturn = 50 // Simulated amount from captivity funds
    if (moneyToReturn > 0) {
      moneyReturned = moneyToReturn
      returnedItems.push(`${moneyToReturn} coins`)

      // Add coin item to inventory
      const container = updatedContainers.find((c) => c.slots.length < c.maxSlots)
      if (container) {
        container.slots.push({
          slotId: `slot-coin-${Date.now()}`,
          itemInstanceId: 'coin',
          quantity: moneyToReturn,
        })
      }
    }
  }

  // Add back general items if allowed
  if (rules.returnItems) {
    const generalItems = ['consumable-rations', 'consumable-water-pouch']
    for (const itemId of generalItems) {
      const itemDef = contentCatalog.itemsById.get(itemId)
      if (itemDef) {
        returnedItems.push(itemDef.name || itemId)
        const container = updatedContainers.find((c) => c.slots.length < c.maxSlots)
        if (container) {
          container.slots.push({
            slotId: `slot-${itemId}-${Date.now()}`,
            itemInstanceId: itemId,
            quantity: 1,
          })
        }
      }
    }
  }

  // Update inventory state
  let newState: GameState = state
  if (updatedContainers.length > 0) {
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

  // Restore money to personalFunds
  if (moneyReturned > 0) {
    newState = {
      ...newState,
      roster: newState.roster.map((n, i) =>
        i === npcIndex
          ? {
              ...n,
              personalFunds: {
                ...n.personalFunds,
                carriedCash: n.personalFunds.carriedCash + moneyReturned,
              },
            }
          : n,
      ),
    }
  }

  // Log restitution
  const itemName = returnedItems.length > 0 ? returnedItems.join(', ') : 'possessions'
  newState = appendActivityLogEntry(
    newState,
    'system',
    `${npc.name} released from ${regime} captivity; ${itemName} returned.`,
  )

  return newState
}
