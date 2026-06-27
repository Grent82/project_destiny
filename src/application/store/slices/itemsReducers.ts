import { current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import type { ContainerType } from '../../../domain/inventory/contracts'
import { getWeaponRepairCost, getArmorRepairCost } from '../../content/equipmentCatalog'
import { searchHouseRoom } from '../../commands/houseSearch'
import { useItem as useItemCommand } from '../../commands/useItem'
import { sellItem as sellItemCommand } from '../../commands/sellItem'
import { giftItemToNpc as giftItemToNpcCommand } from '../../commands/giftItem'
import { installModule as installModuleCommand } from '../../commands/installModule'
import { MAX_ACTIVITY_ENTRIES } from '../../commands/activityLog'

/** Simple item reference for internal use */
type ItemRef = {
  instanceId: string
  itemId: string
  quantity: number
}

/** Helper to find an item in any container by instanceId */
function findItemByInstanceId(inventoryState: GameState['inventoryState'], instanceId: string): ItemRef | null {
  // Check player bag
  for (const container of inventoryState.player.bagContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId === instanceId) {
        const instanceDef = inventoryState.itemRegistry[instanceId]
        if (instanceDef) {
          return {
            instanceId: slot.itemInstanceId,
            itemId: instanceDef.itemId,
            quantity: slot.quantity,
          }
        }
      }
    }
  }

  // Check shared containers (house_storage, mission_pack)
  for (const container of inventoryState.sharedContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId === instanceId) {
        const instanceDef = inventoryState.itemRegistry[instanceId]
        if (instanceDef) {
          return {
            instanceId: slot.itemInstanceId,
            itemId: instanceDef.itemId,
            quantity: slot.quantity,
          }
        }
      }
    }
  }

  return null
}

/** Helper to check if item exists in house_storage */
function hasItemInHouseStorage(inventoryState: GameState['inventoryState'], itemId: string): boolean {
  for (const container of inventoryState.sharedContainers) {
    if (container.ownerId === 'house_storage') {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef && instanceDef.itemId === itemId) {
            return true
          }
        }
      }
    }
  }
  return false
}

/** Helper to remove item from house_storage */
function removeFromHouseStorage(inventoryState: GameState['inventoryState'], instanceId: string): GameState['inventoryState'] {
  const newSharedContainers = inventoryState.sharedContainers.map((container) => {
    if (container.ownerId !== 'house_storage') return container
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === instanceId)
    if (slotIndex === -1) return container
    const newSlots = [...container.slots]
    newSlots.splice(slotIndex, 1)
    return { ...container, slots: newSlots }
  })
  return { ...inventoryState, sharedContainers: newSharedContainers }
}

export const itemsReducers = {
  equipItem(
    state: GameState,
    action: PayloadAction<{ npcId: string; slot: 'primaryWeaponId' | 'secondaryWeaponId' | 'armorId'; itemId: string | null }>,
  ) {
    const { npcId, slot, itemId } = action.payload
    const npcState = state.roster.find((n) => n.npcId === npcId)
    if (!npcState) return
    npcState.loadout[slot] = itemId
  },

  addToStash(state: GameState, action: PayloadAction<{ type: 'weapon' | 'armor'; id: string; price: number }>) {
    const { type, id, price } = action.payload
    if (state.money < price) return
    const alreadyOwned = hasItemInHouseStorage(state.inventoryState, id)
    if (!alreadyOwned) {
      // Add to house_storage container
      const newSharedContainers = state.inventoryState.sharedContainers.map((container) => {
        if (container.ownerId !== 'house_storage') return container
        // Find first available slot
        for (const slot of container.slots) {
          if (slot.itemInstanceId === null) {
            slot.itemInstanceId = `inst-${id}-${Date.now()}`
            slot.quantity = 1
            return { ...container, slots: container.slots }
          }
        }
        // If no empty slot, create new container
        if (container.slots.length < container.maxSlots) {
          const newSlots = [
            ...container.slots,
            {
              slotId: `slot-${id}-${Date.now()}`,
              itemInstanceId: `inst-${id}-${Date.now()}`,
              quantity: 1,
            },
          ]
          return { ...container, slots: newSlots }
        }
        return container
      })

      // If no house_storage container exists or none had space, create one
      const hasHouseStorage = newSharedContainers.some((c) => c.ownerId === 'house_storage')
      const finalContainers = hasHouseStorage
        ? newSharedContainers
        : [
            ...newSharedContainers,
            {
              containerId: 'house-storage-main',
              containerType: 'vault' as ContainerType,
              ownerId: 'house_storage',
              maxSlots: state.houseStorageCapacity,
              slots: [
                {
                  slotId: `slot-${id}-${Date.now()}`,
                  itemInstanceId: `inst-${id}-${Date.now()}`,
                  quantity: 1,
                },
              ],
              locked: false,
            },
          ]

      state.inventoryState = {
        ...state.inventoryState,
        sharedContainers: finalContainers,
      }
      state.money -= price
      if (type === 'weapon') state.stash.weapons.push(id)
      else state.stash.armors.push(id)
    }
  },

  removeFromStash(state: GameState, action: PayloadAction<{ type: 'weapon' | 'armor'; id: string }>) {
    const { type, id } = action.payload
    // Remove all items with this itemId from house_storage
    const newSharedContainers = state.inventoryState.sharedContainers.map((container) => {
      if (container.ownerId !== 'house_storage') return container
      const newSlots = container.slots.filter((slot) => {
        if (!slot.itemInstanceId) return true
        const instanceDef = state.inventoryState.itemRegistry[slot.itemInstanceId]
        return !instanceDef || instanceDef.itemId !== id
      })
      return { ...container, slots: newSlots }
    })
    state.inventoryState = {
      ...state.inventoryState,
      sharedContainers: newSharedContainers,
    }
    if (type === 'weapon') state.stash.weapons = state.stash.weapons.filter((wId) => wId !== id)
    else state.stash.armors = state.stash.armors.filter((aId) => aId !== id)
  },

  sellFromStash(state: GameState, action: PayloadAction<{ type: 'weapon' | 'armor'; id: string }>) {
    const { type, id } = action.payload
    // Find first item with this itemId in house_storage
    let foundInstanceId: string | null = null
    for (const container of state.inventoryState.sharedContainers) {
      if (container.ownerId !== 'house_storage') continue
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = state.inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef && instanceDef.itemId === id) {
            foundInstanceId = slot.itemInstanceId
            break
          }
        }
      }
      if (foundInstanceId) break
    }

    if (!foundInstanceId) return
    const sellPrice = type === 'weapon'
      ? Math.floor(getWeaponRepairCost(id) * 2.5)
      : Math.floor(getArmorRepairCost(id) * 2.5)
    if (type === 'weapon') {
      state.stash.weapons = state.stash.weapons.filter((wId) => wId !== id)
    } else {
      state.stash.armors = state.stash.armors.filter((aId) => aId !== id)
    }
    // Remove the item
    state.inventoryState = removeFromHouseStorage(state.inventoryState, foundInstanceId)
    state.money += sellPrice
    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-sell-${id}`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'economy',
      message: `Sold ${type} from stash. +${sellPrice} Marks.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
  },

  moveItem(state: GameState, action: PayloadAction<{ instanceId: string; location: 'inventory' | 'house_storage' | 'mission_pack' }>) {
    const { instanceId, location } = action.payload
    const found = findItemByInstanceId(state.inventoryState, instanceId)
    if (!found) return

    // Remove from current location
    if (state.inventoryState.player.bagContainers.some((c) =>
      c.slots.some((s) => s.itemInstanceId === instanceId)
    )) {
      // Player bag - remove slot
      const newContainers = state.inventoryState.player.bagContainers.map((container) => {
        const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === instanceId)
        if (slotIndex === -1) return container
        const newSlots = [...container.slots]
        newSlots.splice(slotIndex, 1)
        return { ...container, slots: newSlots }
      }).filter((c) => c.slots.length > 0)
      const usedSlots = newContainers.reduce((sum, c) => sum + c.slots.length, 0)
      state.inventoryState.player.bagContainers = newContainers
      state.inventoryState.player.usedBagSlots = usedSlots
    } else {
      // Shared container - remove slot
      const newSharedContainers = state.inventoryState.sharedContainers.map((container) => {
        const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === instanceId)
        if (slotIndex === -1) return container
        const newSlots = [...container.slots]
        newSlots.splice(slotIndex, 1)
        return { ...container, slots: newSlots }
      })
      state.inventoryState.sharedContainers = newSharedContainers
    }

    // Add to new location
    if (location === 'inventory') {
      // Add to player bag - find first container with space
      let added = false
      const newContainers = state.inventoryState.player.bagContainers.map((container) => {
        if (added) return container
        if (container.slots.length < container.maxSlots) {
          added = true
          return {
            ...container,
            slots: [
              ...container.slots,
              {
                slotId: `slot-${instanceId}-${Date.now()}`,
                itemInstanceId: instanceId,
                quantity: found.quantity,
              },
            ],
          }
        }
        return container
      })

      if (!added) {
        // Create new container
        state.inventoryState.player.bagContainers = [
          ...newContainers,
          {
            containerId: `bag-${Date.now()}`,
            containerType: 'backpack' as ContainerType,
            ownerId: 'player',
            maxSlots: 20,
            slots: [
              {
                slotId: `slot-${instanceId}-new`,
                itemInstanceId: instanceId,
                quantity: found.quantity,
              },
            ],
            locked: false,
          },
        ]
      }
      const usedSlots = state.inventoryState.player.bagContainers.reduce((sum, c) => sum + c.slots.length, 0)
      state.inventoryState.player.usedBagSlots = usedSlots
    } else if (location === 'house_storage') {
      // Add to house_storage container
      const newSharedContainers = state.inventoryState.sharedContainers.map((container) => {
        if (container.ownerId !== 'house_storage') return container
        if (container.slots.length < container.maxSlots) {
          return {
            ...container,
            slots: [
              ...container.slots,
              {
                slotId: `slot-${instanceId}-${Date.now()}`,
                itemInstanceId: instanceId,
                quantity: found.quantity,
              },
            ],
          }
        }
        return container
      })

      const hasHouseStorage = newSharedContainers.some((c) => c.ownerId === 'house_storage')
      if (!hasHouseStorage) {
        state.inventoryState.sharedContainers = [
          ...newSharedContainers,
          {
            containerId: 'house-storage-main',
            containerType: 'vault' as ContainerType,
            ownerId: 'house_storage',
            maxSlots: state.houseStorageCapacity,
            slots: [
              {
                slotId: `slot-${instanceId}-new`,
                itemInstanceId: instanceId,
                quantity: found.quantity,
              },
            ],
            locked: false,
          },
        ]
      } else {
        state.inventoryState.sharedContainers = newSharedContainers
      }
    } else if (location === 'mission_pack') {
      // Add to mission_pack container
      const newSharedContainers = state.inventoryState.sharedContainers.map((container) => {
        if (container.ownerId !== 'mission_pack') return container
        if (container.slots.length < container.maxSlots) {
          return {
            ...container,
            slots: [
              ...container.slots,
              {
                slotId: `slot-${instanceId}-${Date.now()}`,
                itemInstanceId: instanceId,
                quantity: found.quantity,
              },
            ],
          }
        }
        return container
      })

      const hasMissionPack = newSharedContainers.some((c) => c.ownerId === 'mission_pack')
      if (!hasMissionPack) {
        state.inventoryState.sharedContainers = [
          ...newSharedContainers,
          {
            containerId: 'mission-pack-main',
            containerType: 'supply_pack' as ContainerType,
            ownerId: 'mission_pack',
            maxSlots: 20,
            slots: [
              {
                slotId: `slot-${instanceId}-new`,
                itemInstanceId: instanceId,
                quantity: found.quantity,
              },
            ],
            locked: false,
          },
        ]
      } else {
        state.inventoryState.sharedContainers = newSharedContainers
      }
    }
  },

  sellItem(state: GameState, action: PayloadAction<{ instanceId: string }>) {
    const result = sellItemCommand(current(state) as GameState, action.payload.instanceId)
    Object.assign(state, result)
  },

  installModuleItem(state: GameState, action: PayloadAction<{ instanceId: string }>) {
    const result = installModuleCommand(current(state) as GameState, action.payload.instanceId)
    if (result.success) {
      Object.assign(state, result.state)
    }
  },

  searchRoom(state: GameState, action: PayloadAction<string>) {
    const snapshot = current(state) as GameState
    return searchHouseRoom(snapshot, action.payload)
  },

  useItem(
    state: GameState,
    action: PayloadAction<{
      instanceId: string
      action: 'equip' | 'consume' | 'install' | 'present' | 'archive'
      targetNpcId?: string
    }>,
  ) {
    const snapshot = current(state) as GameState
    return useItemCommand(snapshot, action.payload)
  },

  giveItemToNpc(state: GameState, action: PayloadAction<{ instanceId: string; npcId: string }>) {
    const snapshot = current(state) as GameState
    return giftItemToNpcCommand(snapshot, action.payload)
  },
}
