import type { GameState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'

/**
 * Applies inventory restitution when an NPC is released from captivity.
 * Returns confiscated items based on the release type:
 * - rescued: All items returned
 * - returned: All items returned
 * - acquitted: All items returned
 */
export function applyCaptivityRestitution(state: GameState, payload: { npcId: string }): GameState {
  const { npcId } = payload

  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  // Only restitution if NPC is freed
  const captivityStatus = npc.captivityState?.status
  if (captivityStatus !== 'rescued' && captivityStatus !== 'returned') {
    return state
  }

  const captivityState = npc.captivityState
  if (!captivityState) return state

  // Check if there are any confiscated items for this NPC
  const hasConfiscatedItems = captivityState.confiscatedItems.length > 0
  const hasConfiscatedMoney = captivityState.confiscatedMoney !== null
  const hasConfiscatedEquipment = captivityState.confiscatedEquipment.weapon !== null ||
    captivityState.confiscatedEquipment.armor !== null ||
    captivityState.confiscatedEquipment.accessory.length > 0

  if (!hasConfiscatedItems && !hasConfiscatedMoney && !hasConfiscatedEquipment) {
    return state
  }

  let next: GameState = {
    ...state,
    roster: [...state.roster],
    inventoryState: {
      ...state.inventoryState,
      npcInventories: { ...state.inventoryState.npcInventories },
      itemRegistry: { ...state.inventoryState.itemRegistry },
    },
  }
  const nextNpc = { ...npc }

  // Get or create NPC inventory container
  const npcContainers = next.inventoryState.npcInventories[npcId] ? [...next.inventoryState.npcInventories[npcId]] : []
  if (npcContainers.length === 0) {
    npcContainers.push({
      containerId: `container-${npcId}-backpack`,
      containerType: 'backpack',
      ownerId: npcId,
      name: `${npc.name}'s Backpack`,
      maxSlots: 20,
      slots: [],
      locked: false,
    })
  }

  const container = npcContainers[0]
  const newContainer = { ...container, slots: container.slots.map((slot) => ({ ...slot })) }

  // Return confiscated items to inventory
  for (const confiscatedItem of captivityState.confiscatedItems) {
    // Find an empty slot or create new one
    let emptySlotIndex = newContainer.slots.findIndex((slot) => slot.itemInstanceId === null)
    if (emptySlotIndex === -1) {
      // Add new slot
      emptySlotIndex = newContainer.slots.length
      newContainer.slots.push({ slotId: `slot-${emptySlotIndex + 1}`, itemInstanceId: null, quantity: 1 })
    }

    // Place item in slot
    newContainer.slots[emptySlotIndex] = {
      slotId: newContainer.slots[emptySlotIndex].slotId,
      itemInstanceId: confiscatedItem.uniqueId,
      quantity: confiscatedItem.quantity,
    }

    // Add to item registry
    next.inventoryState.itemRegistry[confiscatedItem.uniqueId] = {
      uniqueId: confiscatedItem.uniqueId,
      itemId: confiscatedItem.itemId,
      quantity: confiscatedItem.quantity,
      locationType: 'npc_inventory',
      locationId: npcId,
      acquiredDay: state.day,
      acquiredFrom: 'restitution',
      flags: [],
    }
  }

  npcContainers[0] = newContainer
  next.inventoryState.npcInventories[npcId] = npcContainers

  // Return money
  if (captivityState.confiscatedMoney) {
    nextNpc.personalFunds = {
      ...nextNpc.personalFunds,
      savings: captivityState.confiscatedMoney.savings,
      carriedCash: captivityState.confiscatedMoney.carriedCash,
    }
  }

  // Return equipment
  if (captivityState.confiscatedEquipment.weapon) {
    nextNpc.equipment = { ...nextNpc.equipment, weapon: captivityState.confiscatedEquipment.weapon }
  }
  if (captivityState.confiscatedEquipment.armor) {
    nextNpc.equipment = { ...nextNpc.equipment, armor: captivityState.confiscatedEquipment.armor }
  }
  if (captivityState.confiscatedEquipment.accessory.length > 0) {
    nextNpc.equipment = { ...nextNpc.equipment, accessory: captivityState.confiscatedEquipment.accessory }
  }

  // Update captivity state - clear confiscated data
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
    confiscatedItems: [],
    confiscatedMoney: null,
    confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
  }

  // Update roster
  const nextRoster = next.roster.map((n) => (n.npcId === npcId ? nextNpc : n))
  next.roster = nextRoster

  // Add activity log entry
  next = appendActivityLogEntry(
    next,
    'system',
    `${npc.name}'s belongings returned upon ${captivityStatus}.`
  )

  return next
}
