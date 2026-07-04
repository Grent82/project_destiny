import { appendActivityLogEntry } from '../activityLog'
import { type GameState } from '../../../domain/game/contracts'
import { type CreateContainerParams } from '../../../domain/inventory/contracts'

/**
 * Create a new inventory container.
 *
 * @param state - Current game state
 * @param params.ownerId - Owner ID ('player' or npcId)
 * @param params.containerType - Type of container
 * @param params.name - Optional custom name
 * @param params.maxSlots - Maximum number of slots
 * @returns Updated game state with new container
 */
export function createContainer(state: GameState, params: CreateContainerParams): GameState {
  const { ownerId, containerType, name, maxSlots } = params

  const containerId = `container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const newContainer = {
    containerId,
    containerType,
    ownerId,
    name: name ?? formatDefaultName(containerType, ownerId),
    maxSlots: maxSlots ?? 20,
    slots: [],
    locked: false,
  }

  if (ownerId === 'player') {
    const updatedContainers = [...state.inventoryState.player.bagContainers, newContainer]
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
  } else {
    // Check if NPC exists
    const npcExists = state.npcRuntimeStates.some((n) => n.npcId === ownerId)
    if (!npcExists) {
      return state
    }

    const npcContainers = state.inventoryState.npcInventories[ownerId] ?? []
    const updatedContainers = [...npcContainers, newContainer]

    return {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        npcInventories: {
          ...state.inventoryState.npcInventories,
          [ownerId]: updatedContainers,
        },
      },
    }
  }
}

/**
 * Create a shared container (house vault, shop storage, etc.).
 */
export function createSharedContainer(state: GameState, params: CreateContainerParams & { containerId?: string }): GameState {
  const { containerType, name, maxSlots } = params
  const containerId = params.containerId ?? `shared-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const newContainer = {
    containerId,
    containerType,
    ownerId: 'house',
    name: name ?? formatDefaultName(containerType, 'house'),
    maxSlots: maxSlots ?? 40,
    slots: [],
    locked: false,
  }

  const updatedContainers = [...state.inventoryState.sharedContainers, newContainer]

  appendActivityLogEntry(state, 'system', `Created shared container: ${newContainer.name}`)

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      sharedContainers: updatedContainers,
    },
  }
}

/**
 * Format default name for container type.
 */
function formatDefaultName(containerType: string, ownerId: string): string {
  const typeNames: Record<string, string> = {
    backpack: 'Backpack',
    chest: 'Chest',
    crate: 'Crate',
    satchel: 'Satchel',
    vault: 'Vault',
    wardrobe: 'Wardrobe',
    toolkit: 'Toolkit',
    supply_pack: 'Supply Pack',
  }

  const typeName = typeNames[containerType] ?? 'Container'

  if (ownerId === 'player') {
    return `My ${typeName}`
  }

  if (ownerId === 'house') {
    return `House ${typeName}`
  }

  return `${typeName}`
}
