import { current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import type { ContainerType } from '../../../domain/inventory/contracts'
import { searchHouseRoom } from '../../commands/houseSearch'
import { useItem as useItemCommand } from '../../commands/useItem'
import { sellItem as sellItemCommand } from '../../commands/sellItem'
import { giftItemToNpc as giftItemToNpcCommand } from '../../commands/giftItem'
import { installModule as installModuleCommand } from '../../commands/installModule'
import { equipItem as equipItemCommand, unequipItem as unequipItemCommand } from '../../commands/inventory/equipItem'
import {
  purchaseWeaponToHouseStorage,
  purchaseArmorToHouseStorage,
  sellWeaponFromHouseStorage,
  sellArmorFromHouseStorage,
} from '../../commands/equipmentPurchase'

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

export const itemsReducers = {
  equipItem(
    state: GameState,
    action: PayloadAction<{ npcId: string; slot: 'primaryWeaponId' | 'secondaryWeaponId' | 'armorId'; itemId: string | null }>,
  ) {
    const { npcId, slot, itemId } = action.payload

    // Handle unequip (itemId is null)
    if (itemId === null) {
      // Map loadout slot to equipment slot
      const equipmentSlot = slot === 'primaryWeaponId' ? 'weapon'
        : slot === 'secondaryWeaponId' ? 'accessory_1'
        : 'armor'
      const result = unequipItemCommand(state, { ownerId: npcId, slot: equipmentSlot })
      Object.assign(state, result)
      return
    }

    // Handle equip - find the item instance and equip it
    // The itemId here is actually the item definition ID, we need to find the instance
    // For now, we'll use the itemId as the instanceId (legacy behavior)
    // In a full implementation, this would search accessible containers for an instance of this item
    const equipmentSlot = slot === 'primaryWeaponId' ? 'weapon'
      : slot === 'secondaryWeaponId' ? 'accessory_1'
      : 'armor'

    const result = equipItemCommand(state, { ownerId: npcId, itemInstanceId: itemId, slot: equipmentSlot })
    Object.assign(state, result)
  },

  // ─── Canonical Equipment Purchase Actions ─────────────────────────────────

  /**
   * Purchase a weapon and add it to household storage (canonical).
   * This is the modern replacement for addToStash for weapons.
   */
  purchaseWeapon(state: GameState, action: PayloadAction<{ weaponId: string; price: number }>) {
    const { weaponId, price } = action.payload
    const result = purchaseWeaponToHouseStorage(state, weaponId, price)
    Object.assign(state, result)
  },

  /**
   * Purchase armor and add it to household storage (canonical).
   * This is the modern replacement for addToStash for armor.
   */
  purchaseArmor(state: GameState, action: PayloadAction<{ armorId: string; price: number }>) {
    const { armorId, price } = action.payload
    const result = purchaseArmorToHouseStorage(state, armorId, price)
    Object.assign(state, result)
  },

  /**
   * Sell a weapon from household storage (canonical).
   * This is the modern replacement for sellFromStash for weapons.
   */
  sellWeapon(state: GameState, action: PayloadAction<{ weaponId: string }>) {
    const { weaponId } = action.payload
    const result = sellWeaponFromHouseStorage(state, weaponId)
    Object.assign(state, result)
  },

  /**
   * Sell armor from household storage (canonical).
   * This is the modern replacement for sellFromStash for armor.
   */
  sellArmor(state: GameState, action: PayloadAction<{ armorId: string }>) {
    const { armorId } = action.payload
    const result = sellArmorFromHouseStorage(state, armorId)
    Object.assign(state, result)
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
