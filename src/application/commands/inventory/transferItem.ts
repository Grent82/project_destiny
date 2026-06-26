import { appendActivityLogEntry } from '../activityLog'
import { type GameState } from '../../../domain/game/contracts'
import { type TransferItemParams, type ItemLocationType } from '../../../domain/inventory/contracts'
import { contentCatalog } from '../../content/contentCatalog'

/**
 * Transfer an item instance between inventories or locations.
 *
 * Supports:
 * - Player <-> NPC inventory transfers
 * - Player <-> Container transfers
 * - NPC <-> Container transfers
 * - Equipment <-> Inventory transfers
 *
 * @param state - Current game state
 * @param params.fromType - Source location type
 * @param params.fromId - Source location ID (containerId, npcId, or 'player')
 * @param params.toType - Destination location type
 * @param params.toId - Destination location ID
 * @param params.itemInstanceId - The unique ID of the item instance to transfer
 * @param params.quantity - Quantity to transfer (for stackable items)
 * @returns Updated game state
 */
export function transferItem(state: GameState, params: TransferItemParams): GameState {
  const { fromType, fromId, toType, toId, itemInstanceId, quantity } = params

  // Validate source exists and find the item
  const sourceResult = findItemInSource(state, fromType, fromId, itemInstanceId, quantity)
  if (!sourceResult) {
    return state
  }

  // Validate destination exists
  const destCheck = validateDestination(state, toType, toId)
  if (!destCheck) {
    return state
  }

  // Get item definition for logging
  const itemDef = contentCatalog.itemsById.get(sourceResult.itemId)
  const itemName = itemDef?.name ?? sourceResult.itemId

  // Perform the transfer based on source type
  let newState: GameState = state

  if (sourceResult.sourceType === 'npc_inventory') {
    newState = removeFromNpcInventory(newState, fromId, itemInstanceId, quantity)
  } else if (sourceResult.sourceType === 'player_inventory') {
    newState = removeFromPlayerInventory(newState, itemInstanceId, quantity)
  } else if (sourceResult.sourceType === 'container') {
    newState = removeFromContainer(newState, fromId, itemInstanceId, quantity)
  }

  // Add to destination
  if (toType === 'npc_inventory') {
    newState = addToNpcInventory(newState, toId, itemInstanceId, sourceResult.itemId, quantity)
  } else if (toType === 'player_inventory') {
    newState = addToPlayerInventory(newState, itemInstanceId, sourceResult.itemId, quantity)
  } else if (toType === 'container') {
    newState = addToContainer(newState, toId, itemInstanceId, sourceResult.itemId, quantity)
  }

  // Log the transfer
  const fromLabel = formatLocationLabel(fromType, fromId)
  const toLabel = formatLocationLabel(toType, toId)
  appendActivityLogEntry(newState, 'economy', `Transferred ${quantity}x ${itemName} from ${fromLabel} to ${toLabel}`)

  return newState
}

interface SourceResult {
  sourceType: 'npc_inventory' | 'player_inventory' | 'container'
  itemInstanceId: string
  itemId: string
  quantity: number
}

/**
 * Find an item instance in the source location.
 * Note: For the new container-based inventory, itemInstanceId IS the key we search by.
 * The itemId (template reference) would be stored separately in a real implementation.
 * For now, we treat itemInstanceId as both the instance ID and the item template ID.
 */
function findItemInSource(state: GameState, type: ItemLocationType, id: string, itemInstanceId: string, requiredQuantity: number): SourceResult | null {
  if (type === 'npc_inventory') {
    const npc = state.roster.find((n) => n.npcId === id)
    if (!npc) return null

    // Check NPC's inventory array (legacy format)
    const itemEntry = npc.inventory.find((inv) => inv.itemId === itemInstanceId)
    if (itemEntry && itemEntry.quantity >= requiredQuantity) {
      return { sourceType: 'npc_inventory', itemInstanceId, itemId: itemEntry.itemId, quantity: itemEntry.quantity }
    }

    // Check NPC's containers (new format)
    const npcContainers = state.inventoryState.npcInventories[id]
    if (npcContainers) {
      for (const container of npcContainers) {
        const slot = container.slots.find((s) => s.itemInstanceId === itemInstanceId)
        if (slot && slot.quantity >= requiredQuantity) {
          // For containers, itemInstanceId is the unique ID; itemId would be looked up from registry
          return { sourceType: 'container', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
        }
      }
    }

    return null
  }

  if (type === 'player_inventory') {
    // Check player's bag containers
    for (const container of state.inventoryState.player.bagContainers) {
      const slot = container.slots.find((s) => s.itemInstanceId === itemInstanceId)
      if (slot && slot.quantity >= requiredQuantity) {
        return { sourceType: 'player_inventory', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
      }
    }

    return null
  }

  if (type === 'container') {
    // Check player bags
    const playerContainer = state.inventoryState.player.bagContainers.find((c) => c.containerId === id)
    if (playerContainer) {
      const slot = playerContainer.slots.find((s) => s.itemInstanceId === itemInstanceId)
      if (slot && slot.quantity >= requiredQuantity) {
        return { sourceType: 'container', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
      }
    }

    // Check shared containers
    const sharedContainer = state.inventoryState.sharedContainers.find((c) => c.containerId === id)
    if (sharedContainer) {
      const slot = sharedContainer.slots.find((s) => s.itemInstanceId === itemInstanceId)
      if (slot && slot.quantity >= requiredQuantity) {
        return { sourceType: 'container', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
      }
    }

    // Check NPC containers
    const npcContainers = state.inventoryState.npcInventories[id]
    if (npcContainers) {
      const npcContainer = npcContainers.find((c) => c.containerId === id)
      if (npcContainer) {
        const slot = npcContainer.slots.find((s) => s.itemInstanceId === itemInstanceId)
        if (slot && slot.quantity >= requiredQuantity) {
          return { sourceType: 'container', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
        }
      }
    }

    return null
  }

  return null
}

/**
 * Validate destination can receive items.
 */
function validateDestination(state: GameState, type: ItemLocationType, id: string): boolean {
  if (type === 'npc_inventory') {
    return state.roster.some((n) => n.npcId === id)
  }

  if (type === 'player_inventory') {
    const used = state.inventoryState.player.usedBagSlots
    const total = state.inventoryState.player.totalBagSlots
    return used < total
  }

  if (type === 'container') {
    const container = findContainer(state, id)
    return container !== null
  }

  return false
}

/**
 * Find a container by ID.
 */
function findContainer(state: GameState, containerId: string): { containerType: 'player' | 'shared' | 'npc'; containerId: string; container: import('../../../domain/inventory/contracts').InventoryContainer } | null {
  const playerContainer = state.inventoryState.player.bagContainers.find((c) => c.containerId === containerId)
  if (playerContainer) return { containerType: 'player', containerId, container: playerContainer }

  const sharedContainer = state.inventoryState.sharedContainers.find((c) => c.containerId === containerId)
  if (sharedContainer) return { containerType: 'shared', containerId, container: sharedContainer }

  for (const npcId of Object.keys(state.inventoryState.npcInventories)) {
    const npcContainer = state.inventoryState.npcInventories[npcId].find((c) => c.containerId === containerId)
    if (npcContainer) return { containerType: 'npc', containerId, container: npcContainer }
  }

  return null
}

/**
 * Remove items from NPC inventory.
 */
function removeFromNpcInventory(state: GameState, npcId: string, itemInstanceId: string, quantity: number): GameState {
  const npcIndex = state.roster.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return state

  const npc = state.roster[npcIndex]
  const inventoryIndex = npc.inventory.findIndex((inv) => inv.itemId === itemInstanceId)

  if (inventoryIndex === -1) return state

  const updatedInventory = [...npc.inventory]
  const currentQty = updatedInventory[inventoryIndex].quantity

  if (currentQty <= quantity) {
    updatedInventory.splice(inventoryIndex, 1)
  } else {
    updatedInventory[inventoryIndex] = {
      ...updatedInventory[inventoryIndex],
      quantity: currentQty - quantity,
    }
  }

  const updatedRoster = [...state.roster]
  updatedRoster[npcIndex] = { ...npc, inventory: updatedInventory }

  return { ...state, roster: updatedRoster }
}

/**
 * Remove items from player inventory.
 */
function removeFromPlayerInventory(state: GameState, itemInstanceId: string, quantity: number): GameState {
  const updatedContainers = state.inventoryState.player.bagContainers.map((container) => {
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (slotIndex === -1) return container

    const slot = container.slots[slotIndex]
    const updatedSlots = [...container.slots]

    if (slot.quantity <= quantity) {
      updatedSlots.splice(slotIndex, 1)
    } else {
      updatedSlots[slotIndex] = {
        ...slot,
        quantity: slot.quantity - quantity,
      }
    }

    return { ...container, slots: updatedSlots }
  })

  const usedSlots = updatedContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: {
        ...state.inventoryState.player,
        bagContainers: updatedContainers,
        usedBagSlots: usedSlots,
      },
    },
  }
}

/**
 * Remove items from a container.
 */
function removeFromContainer(state: GameState, containerId: string, itemInstanceId: string, quantity: number): GameState {
  // Check player bags
  const playerContainerIndex = state.inventoryState.player.bagContainers.findIndex((c) => c.containerId === containerId)
  if (playerContainerIndex !== -1) {
    const container = state.inventoryState.player.bagContainers[playerContainerIndex]
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (slotIndex === -1) return state

    const slot = container.slots[slotIndex]
    const updatedSlots = [...container.slots]

    if (slot.quantity <= quantity) {
      updatedSlots.splice(slotIndex, 1)
    } else {
      updatedSlots[slotIndex] = { ...slot, quantity: slot.quantity - quantity }
    }

    const updatedContainers = [...state.inventoryState.player.bagContainers]
    updatedContainers[playerContainerIndex] = { ...container, slots: updatedSlots }

    const usedSlots = updatedContainers.reduce((sum, cont) => sum + cont.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

    return {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        player: { ...state.inventoryState.player, bagContainers: updatedContainers, usedBagSlots: usedSlots },
      },
    }
  }

  // Check shared containers
  const sharedIndex = state.inventoryState.sharedContainers.findIndex((c) => c.containerId === containerId)
  if (sharedIndex !== -1) {
    const container = state.inventoryState.sharedContainers[sharedIndex]
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (slotIndex === -1) return state

    const slot = container.slots[slotIndex]
    const updatedSlots = [...container.slots]

    if (slot.quantity <= quantity) {
      updatedSlots.splice(slotIndex, 1)
    } else {
      updatedSlots[slotIndex] = { ...slot, quantity: slot.quantity - quantity }
    }

    const updatedContainers = [...state.inventoryState.sharedContainers]
    updatedContainers[sharedIndex] = { ...container, slots: updatedSlots }

    return {
      ...state,
      inventoryState: { ...state.inventoryState, sharedContainers: updatedContainers },
    }
  }

  return state
}

/**
 * Add items to NPC inventory.
 */
function addToNpcInventory(state: GameState, npcId: string, _itemInstanceId: string, itemId: string, quantity: number): GameState {
  const npcIndex = state.roster.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return state

  const npc = state.roster[npcIndex]
  const inventoryIndex = npc.inventory.findIndex((inv) => inv.itemId === itemId)

  const updatedInventory = [...npc.inventory]

  if (inventoryIndex === -1) {
    updatedInventory.push({ itemId, quantity })
  } else {
    updatedInventory[inventoryIndex] = {
      ...updatedInventory[inventoryIndex],
      quantity: updatedInventory[inventoryIndex].quantity + quantity,
    }
  }

  const updatedRoster = [...state.roster]
  updatedRoster[npcIndex] = { ...npc, inventory: updatedInventory }

  return { ...state, roster: updatedRoster }
}

/**
 * Add items to player inventory.
 */
function addToPlayerInventory(state: GameState, itemInstanceId: string, _itemId: string, quantity: number): GameState {
  // Find first container with space
  let added = false
  const updatedContainers = state.inventoryState.player.bagContainers.map((container) => {
    if (added) return container

    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    if (existingSlotIndex !== -1) {
      added = true
      const updatedSlots = [...container.slots]
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        quantity: updatedSlots[existingSlotIndex].quantity + quantity,
      }
      return { ...container, slots: updatedSlots }
    }

    // Check for empty slot
    if (container.slots.length < container.maxSlots) {
      added = true
      return {
        ...container,
        slots: [
          ...container.slots,
          { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity },
        ],
      }
    }

    return container
  })

  // If no space in existing containers, create new one
  if (!added) {
    const newContainer = {
      containerId: `bag-${Date.now()}`,
      containerType: 'backpack' as const,
      ownerId: 'player',
      maxSlots: 20,
      slots: [{ slotId: `slot-${itemInstanceId}-new`, itemInstanceId, quantity }],
      locked: false,
    }
    updatedContainers.push(newContainer)
  }

  const usedSlots = updatedContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: {
        ...state.inventoryState.player,
        bagContainers: updatedContainers,
        usedBagSlots: usedSlots,
      },
    },
  }
}

/**
 * Add items to a container.
 */
function addToContainer(state: GameState, containerId: string, itemInstanceId: string, _itemId: string, quantity: number): GameState {
  // Check player bags
  const playerContainerIndex = state.inventoryState.player.bagContainers.findIndex((c) => c.containerId === containerId)
  if (playerContainerIndex !== -1) {
    const container = state.inventoryState.player.bagContainers[playerContainerIndex]
    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    let updatedSlots: import('../../../domain/inventory/contracts').InventorySlot[]
    if (existingSlotIndex !== -1) {
      updatedSlots = [...container.slots]
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        quantity: updatedSlots[existingSlotIndex].quantity + quantity,
      }
    } else if (container.slots.length < container.maxSlots) {
      updatedSlots = [...container.slots, { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity }]
    } else {
      return state // No space
    }

    const updatedContainers = [...state.inventoryState.player.bagContainers]
    updatedContainers[playerContainerIndex] = { ...container, slots: updatedSlots }

    const usedSlots = updatedContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

    return {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        player: { ...state.inventoryState.player, bagContainers: updatedContainers, usedBagSlots: usedSlots },
      },
    }
  }

  // Check shared containers
  const sharedIndex = state.inventoryState.sharedContainers.findIndex((c) => c.containerId === containerId)
  if (sharedIndex !== -1) {
    const container = state.inventoryState.sharedContainers[sharedIndex]
    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    let updatedSlots: import('../../../domain/inventory/contracts').InventorySlot[]
    if (existingSlotIndex !== -1) {
      updatedSlots = [...container.slots]
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        quantity: updatedSlots[existingSlotIndex].quantity + quantity,
      }
    } else if (container.slots.length < container.maxSlots) {
      updatedSlots = [...container.slots, { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity }]
    } else {
      return state // No space
    }

    const updatedContainers = [...state.inventoryState.sharedContainers]
    updatedContainers[sharedIndex] = { ...container, slots: updatedSlots }

    return {
      ...state,
      inventoryState: { ...state.inventoryState, sharedContainers: updatedContainers },
    }
  }

  return state
}

function formatLocationLabel(type: string, id: string): string {
  if (type === 'player_inventory') return 'your inventory'
  if (type === 'player_equipment') return 'your equipment'
  if (type === 'npc_inventory') return `${id}'s inventory`
  if (type === 'npc_equipment') return `${id}'s equipment`
  if (type === 'container') return `container ${id}`
  return id
}
