import { appendActivityLogEntry } from '../activityLog'
import { type GameState } from '../../../domain/game/contracts'
import { type EquipItemParams, type EquipmentSlotType } from '../../../domain/inventory/contracts'
import { contentCatalog } from '../../content/contentCatalog'

/**
 * Equip an item instance on player or NPC.
 *
 * @param state - Current game state
 * @param params.ownerId - 'player' or npcId
 * @param params.itemInstanceId - The unique ID of the item instance to equip
 * @param params.slot - Equipment slot to use
 * @returns Updated game state
 */
export function equipItem(state: GameState, params: EquipItemParams): GameState {
  const { ownerId, itemInstanceId, slot } = params

  if (ownerId === 'player') {
    return equipItemToPlayer(state, itemInstanceId, slot)
  }

  return equipItemToNpc(state, ownerId, itemInstanceId, slot)
}

/**
 * Equip an item to the player character.
 */
function equipItemToPlayer(state: GameState, itemInstanceId: string, slot: EquipmentSlotType): GameState {
  const currentEquipped = state.inventoryState.player.equipmentSlots[slot]

  // If something is already equipped, unequip it first
  let newState = state
  if (currentEquipped) {
    newState = unequipItemFromPlayer(newState, slot)
  }

  // Find the item in player inventory
  let itemFound = false
  const updatedContainers = state.inventoryState.player.bagContainers.map((container) => {
    if (itemFound) return container

    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (slotIndex === -1) return container

    itemFound = true
    const updatedSlots = [...container.slots]
    updatedSlots.splice(slotIndex, 1) // Remove from inventory when equipped

    return { ...container, slots: updatedSlots }
  })

  if (!itemFound) return state

  const usedSlots = updatedContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  const updatedEquipment = {
    ...state.inventoryState.player.equipmentSlots,
    [slot]: itemInstanceId,
  }

  const itemName = getItemName(itemInstanceId)

  appendActivityLogEntry(newState, 'system', `Equipped ${itemName} in ${formatSlotName(slot)}`)

  return {
    ...newState,
    inventoryState: {
      ...newState.inventoryState,
      player: {
        ...newState.inventoryState.player,
        equipmentSlots: updatedEquipment,
        bagContainers: updatedContainers,
        usedBagSlots: usedSlots,
      },
    },
  }
}

/**
 * Unequip an item from the player character.
 */
function unequipItemFromPlayer(state: GameState, slot: EquipmentSlotType): GameState {
  const itemInstanceId = state.inventoryState.player.equipmentSlots[slot]
  if (!itemInstanceId) return state

  const itemName = getItemName(itemInstanceId)

  // Add back to inventory
  const updatedContainers = addSlotToPlayerContainers(state, itemInstanceId, 1)

  const updatedEquipment = {
    ...state.inventoryState.player.equipmentSlots,
    [slot]: null,
  }

  appendActivityLogEntry(state, 'system', `Unequipped ${itemName} from ${formatSlotName(slot)}`)

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: {
        ...state.inventoryState.player,
        equipmentSlots: updatedEquipment,
        bagContainers: updatedContainers,
      },
    },
  }
}

/**
 * Equip an item to an NPC.
 */
function equipItemToNpc(state: GameState, npcId: string, itemInstanceId: string, slot: EquipmentSlotType): GameState {
  const npcIndex = state.roster.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return state

  const npc = state.roster[npcIndex]

  // Find the item in NPC inventory
  const inventoryIndex = npc.inventory.findIndex((inv) => inv.itemId === itemInstanceId)
  if (inventoryIndex === -1) return state

  // Validate item category matches slot
  const itemDef = contentCatalog.itemsById.get(itemInstanceId)
  if (!itemDef) return state

  if (!isValidSlotForItem(itemDef, slot)) {
    return state
  }

  // Unequip current item in this slot if any
  let currentEquipped: string | null = null
  if (slot === 'accessory_1') {
    currentEquipped = npc.equipment.accessory?.[0] ?? null
  } else if (slot === 'accessory_2') {
    currentEquipped = npc.equipment.accessory?.[1] ?? null
  } else {
    currentEquipped = npc.equipment[slot as 'weapon' | 'armor'] ?? null
  }
  let newState = state

  if (currentEquipped) {
    // Return current item to inventory
    const updatedInventory = [...npc.inventory]
    const existingIndex = updatedInventory.findIndex((inv) => inv.itemId === currentEquipped)

    if (existingIndex === -1) {
      updatedInventory.push({ itemId: currentEquipped, quantity: 1 })
    } else {
      updatedInventory[existingIndex] = {
        ...updatedInventory[existingIndex],
        quantity: updatedInventory[existingIndex].quantity + 1,
      }
    }

    const updatedRoster = [...state.roster]
    updatedRoster[npcIndex] = { ...npc, inventory: updatedInventory }
    newState = { ...state, roster: updatedRoster }
  }

  // Update equipment
  const npcIndex2 = newState.roster.findIndex((n) => n.npcId === npcId)
  const npc2 = newState.roster[npcIndex2]

  const updatedEquipment = {
    ...npc2.equipment,
  }

  if (slot === 'accessory_1') {
    const currentAccessories = npc2.equipment.accessory || []
    updatedEquipment.accessory = [...currentAccessories.slice(0, 1), itemInstanceId]
  } else if (slot === 'accessory_2') {
    const currentAccessories = npc2.equipment.accessory || []
    if (currentAccessories.length >= 2) {
      updatedEquipment.accessory = [...currentAccessories.slice(1), itemInstanceId]
    } else {
      updatedEquipment.accessory = [...currentAccessories, itemInstanceId]
    }
  } else {
    const slotKey = slot === 'weapon' || slot === 'armor' ? slot : 'weapon'
    updatedEquipment[slotKey] = itemInstanceId
  }

  // Remove from inventory
  const updatedInventory2 = [...npc2.inventory]
  const qty = updatedInventory2[inventoryIndex]?.quantity || 1
  if (qty > 1) {
    updatedInventory2[inventoryIndex] = {
      ...updatedInventory2[inventoryIndex],
      quantity: qty - 1,
    }
  } else {
    updatedInventory2.splice(inventoryIndex, 1)
  }

  // Calculate stat bonuses
  const updatedAttributes = { ...npc2.attributes }
  if (itemDef.category === 'weapon') {
    const weapon = itemDef as import('../../../domain/items/contracts').WeaponDefinition
    updatedAttributes.might = Math.min(100, updatedAttributes.might + Math.floor((weapon.damageMin + weapon.damageMax) / 20))
    updatedAttributes.agility = Math.min(100, updatedAttributes.agility + Math.floor(weapon.accuracy / 20))
  } else if (itemDef.category === 'armor') {
    const armor = itemDef as import('../../../domain/items/contracts').ArmorDefinition
    updatedAttributes.endurance = Math.min(100, updatedAttributes.endurance + Math.floor(armor.soak / 20))
  }

  const updatedRoster2 = [...newState.roster]
  updatedRoster2[npcIndex2] = {
    ...npc2,
    equipment: updatedEquipment,
    inventory: updatedInventory2,
    attributes: updatedAttributes,
  }

  const itemName = itemDef.name

  appendActivityLogEntry(newState, 'system', `${npc.name} equipped ${itemName} in ${formatSlotName(slot)}`)

  return {
    ...newState,
    roster: updatedRoster2,
  }
}

/**
 * Unequip an item from an NPC.
 */
function unequipItemFromNpc(state: GameState, npcId: string, slot: EquipmentSlotType): GameState {
  const npcIndex = state.roster.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return state

  const npc = state.roster[npcIndex]

  let itemInstanceId: string | null = null
  if (slot === 'accessory_1') {
    itemInstanceId = npc.equipment.accessory?.[0] ?? null
  } else if (slot === 'accessory_2') {
    itemInstanceId = npc.equipment.accessory?.[1] ?? null
  } else {
    itemInstanceId = (npc.equipment[slot as 'weapon' | 'armor'] as string) ?? null
  }

  if (!itemInstanceId) return state

  const itemDef = contentCatalog.itemsById.get(itemInstanceId)
  if (!itemDef) return state

  // Return to inventory
  const updatedInventory = [...npc.inventory]
  const existingIndex = updatedInventory.findIndex((inv) => inv.itemId === itemInstanceId)

  if (existingIndex === -1) {
    updatedInventory.push({ itemId: itemInstanceId, quantity: 1 })
  } else {
    updatedInventory[existingIndex] = {
      ...updatedInventory[existingIndex],
      quantity: updatedInventory[existingIndex].quantity + 1,
    }
  }

  // Update equipment
  const updatedEquipment = { ...npc.equipment }
  if (slot.startsWith('accessory')) {
    const currentAccessories = npc.equipment.accessory || []
    if (slot === 'accessory_1' && currentAccessories.length > 0) {
      updatedEquipment.accessory = currentAccessories.slice(1)
    } else if (slot === 'accessory_2' && currentAccessories.length > 1) {
      updatedEquipment.accessory = currentAccessories.slice(0, 1)
    }
  } else {
    const slotKey = slot === 'weapon' || slot === 'armor' ? slot : 'weapon'
    updatedEquipment[slotKey] = null
  }

  // Remove stat bonuses
  const updatedAttributes = { ...npc.attributes }
  if (itemDef.category === 'weapon') {
    const weapon = itemDef as import('../../../domain/items/contracts').WeaponDefinition
    updatedAttributes.might = Math.max(0, updatedAttributes.might - Math.floor((weapon.damageMin + weapon.damageMax) / 20))
    updatedAttributes.agility = Math.max(0, updatedAttributes.agility - Math.floor(weapon.accuracy / 20))
  } else if (itemDef.category === 'armor') {
    const armor = itemDef as import('../../../domain/items/contracts').ArmorDefinition
    updatedAttributes.endurance = Math.max(0, updatedAttributes.endurance - Math.floor(armor.soak / 20))
  }

  const updatedRoster = [...state.roster]
  updatedRoster[npcIndex] = {
    ...npc,
    equipment: updatedEquipment,
    inventory: updatedInventory,
    attributes: updatedAttributes,
  }

  appendActivityLogEntry(state, 'system', `${npc.name} unequipped ${itemDef.name} from ${formatSlotName(slot)}`)

  return {
    ...state,
    roster: updatedRoster,
  }
}

/**
 * Unequip item from player or NPC.
 */
export function unequipItem(state: GameState, params: { ownerId: string; slot: EquipmentSlotType }): GameState {
  const { ownerId, slot } = params

  if (ownerId === 'player') {
    return unequipItemFromPlayer(state, slot)
  }

  return unequipItemFromNpc(state, ownerId, slot)
}

/**
 * Add a slot entry to player containers.
 */
function addSlotToPlayerContainers(state: GameState, itemInstanceId: string, quantity: number): import('../../../domain/inventory/contracts').InventoryContainer[] {
  // Try to find existing slot first
  const existingContainerIndex = state.inventoryState.player.bagContainers.findIndex((c) =>
    c.slots.some((s) => s.itemInstanceId === itemInstanceId)
  )

  if (existingContainerIndex !== -1) {
    const container = state.inventoryState.player.bagContainers[existingContainerIndex]
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    if (slotIndex !== -1) {
      const updatedSlots = [...container.slots]
      updatedSlots[slotIndex] = {
        ...updatedSlots[slotIndex],
        quantity: updatedSlots[slotIndex].quantity + quantity,
      }
      const updatedContainers = [...state.inventoryState.player.bagContainers]
      updatedContainers[existingContainerIndex] = { ...container, slots: updatedSlots }
      return updatedContainers
    }
  }

  // Find container with space
  for (let i = 0; i < state.inventoryState.player.bagContainers.length; i++) {
    const container = state.inventoryState.player.bagContainers[i]
    if (container.slots.length < container.maxSlots) {
      const updatedSlots = [...container.slots, { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity }]
      const updatedContainers = [...state.inventoryState.player.bagContainers]
      updatedContainers[i] = { ...container, slots: updatedSlots }
      return updatedContainers
    }
  }

  // Create new container
  return [
    ...state.inventoryState.player.bagContainers,
    {
      containerId: `bag-${Date.now()}`,
      containerType: 'backpack',
      ownerId: 'player',
      maxSlots: 20,
      slots: [{ slotId: `slot-${itemInstanceId}-new`, itemInstanceId, quantity }],
      locked: false,
    },
  ]
}

/**
 * Get item name from catalog or itemInstanceId.
 */
function getItemName(itemInstanceId: string): string {
  // Try to find in catalog (itemInstanceId might be the same as itemId for now)
  const itemDef = contentCatalog.itemsById.get(itemInstanceId)
  if (itemDef) return itemDef.name
  return itemInstanceId
}

/**
 * Check if item can be equipped in the given slot.
 */
function isValidSlotForItem(item: import('../../../domain/items/contracts').ItemDefinition, slot: EquipmentSlotType): boolean {
  if (slot === 'weapon') {
    return item.category === 'weapon'
  }
  if (slot === 'armor') {
    return item.category === 'armor'
  }
  if (slot === 'accessory_1' || slot === 'accessory_2') {
    return item.category !== 'weapon' && item.category !== 'armor'
  }
  return false
}

/**
 * Format slot type for display.
 */
function formatSlotName(slot: EquipmentSlotType): string {
  switch (slot) {
    case 'weapon':
      return 'weapon slot'
    case 'armor':
      return 'armor slot'
    case 'accessory_1':
      return 'accessory slot 1'
    case 'accessory_2':
      return 'accessory slot 2'
    default:
      return slot
  }
}
