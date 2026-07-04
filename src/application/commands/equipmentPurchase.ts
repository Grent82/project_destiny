import type { GameState } from '../../domain/game/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { HOUSEHOLD_STORAGE_CONTAINER_ID } from './inventory/householdStorage'
import { getWeaponRepairCost, getArmorRepairCost } from '../content/equipmentCatalog'

/**
 * Purchase a weapon and add it to household storage.
 * This is the canonical replacement for addToStash for weapons.
 *
 * @param state - Current game state
 * @param weaponId - The weapon definition ID to purchase
 * @param price - The price to pay for the weapon
 * @returns Updated game state
 */
export function purchaseWeaponToHouseStorage(state: GameState, weaponId: string, price: number): GameState {
  const weaponDef = contentCatalog.itemsById.get(weaponId)
  if (!weaponDef || weaponDef.category !== 'weapon') {
    return state
  }

  // Check if player can afford it
  if (state.money < price) {
    return state
  }

  // Create a new item instance
  const instanceId = `${weaponId}-${Date.now()}`

  // Add to household storage using canonical container model
  let storageContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  const updatedSharedContainers = [...state.inventoryState.sharedContainers]

  if (storageContainerIndex === -1) {
    // Create household storage container if it doesn't exist
    storageContainerIndex = updatedSharedContainers.length
    updatedSharedContainers.push({
      containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      containerType: 'chest',
      ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      name: 'House Storage',
      maxSlots: 50,
      slots: [],
      locked: false,
    })
  }

  const storageContainer = updatedSharedContainers[storageContainerIndex]

  // Check if storage has space
  if (storageContainer.slots.length >= storageContainer.maxSlots) {
    return state // Storage full
  }

  const updatedStorageSlots = [...storageContainer.slots]
  updatedStorageSlots.push({
    slotId: `slot-${instanceId}-${Date.now()}`,
    itemInstanceId: instanceId,
    quantity: 1,
  })

  updatedSharedContainers[storageContainerIndex] = { ...storageContainer, slots: updatedStorageSlots }

  // Add to item registry
  const updatedItemRegistry = {
    ...state.inventoryState.itemRegistry,
    [instanceId]: {
      uniqueId: instanceId,
      itemId: weaponId,
      quantity: 1,
      locationType: 'container' as const,
      locationId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      acquiredDay: state.day,
      acquiredFrom: 'shop_purchase',
      flags: [],
    },
  }

  const nextState = {
    ...state,
    money: state.money - price,
    inventoryState: {
      ...state.inventoryState,
      sharedContainers: updatedSharedContainers,
      itemRegistry: updatedItemRegistry,
    },
  }

  return appendActivityLogEntry(
    nextState,
    'economy',
    `Purchased ${weaponDef.name} for ${price} Marks. Added to House Storage.`,
  )
}

/**
 * Purchase armor and add it to household storage.
 * This is the canonical replacement for addToStash for armor.
 *
 * @param state - Current game state
 * @param armorId - The armor definition ID to purchase
 * @param price - The price to pay for the armor
 * @returns Updated game state
 */
export function purchaseArmorToHouseStorage(state: GameState, armorId: string, price: number): GameState {
  const armorDef = contentCatalog.itemsById.get(armorId)
  if (!armorDef || armorDef.category !== 'armor') {
    return state
  }

  // Check if player can afford it
  if (state.money < price) {
    return state
  }

  // Create a new item instance
  const instanceId = `${armorId}-${Date.now()}`

  // Add to household storage using canonical container model
  let storageContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  const updatedSharedContainers = [...state.inventoryState.sharedContainers]

  if (storageContainerIndex === -1) {
    // Create household storage container if it doesn't exist
    storageContainerIndex = updatedSharedContainers.length
    updatedSharedContainers.push({
      containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      containerType: 'chest',
      ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      name: 'House Storage',
      maxSlots: 50,
      slots: [],
      locked: false,
    })
  }

  const storageContainer = updatedSharedContainers[storageContainerIndex]

  // Check if storage has space
  if (storageContainer.slots.length >= storageContainer.maxSlots) {
    return state // Storage full
  }

  const updatedStorageSlots = [...storageContainer.slots]
  updatedStorageSlots.push({
    slotId: `slot-${instanceId}-${Date.now()}`,
    itemInstanceId: instanceId,
    quantity: 1,
  })

  updatedSharedContainers[storageContainerIndex] = { ...storageContainer, slots: updatedStorageSlots }

  // Add to item registry
  const updatedItemRegistry = {
    ...state.inventoryState.itemRegistry,
    [instanceId]: {
      uniqueId: instanceId,
      itemId: armorId,
      quantity: 1,
      locationType: 'container' as const,
      locationId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      acquiredDay: state.day,
      acquiredFrom: 'shop_purchase',
      flags: [],
    },
  }

  const nextState = {
    ...state,
    money: state.money - price,
    inventoryState: {
      ...state.inventoryState,
      sharedContainers: updatedSharedContainers,
      itemRegistry: updatedItemRegistry,
    },
  }

  return appendActivityLogEntry(
    nextState,
    'economy',
    `Purchased ${armorDef.name} for ${price} Marks. Added to House Storage.`,
  )
}

/**
 * Sell a weapon from household storage.
 * This is the canonical replacement for sellFromStash for weapons.
 *
 * @param state - Current game state
 * @param weaponId - The weapon definition ID to sell
 * @returns Updated game state
 */
export function sellWeaponFromHouseStorage(state: GameState, weaponId: string): GameState {
  // Find first weapon with this itemId in household storage
  let foundInstanceId: string | null = null
  const storageContainer = state.inventoryState.sharedContainers.find(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  if (!storageContainer) {
    return state
  }

  for (const slot of storageContainer.slots) {
    if (slot.itemInstanceId) {
      const instanceDef = state.inventoryState.itemRegistry[slot.itemInstanceId]
      if (instanceDef && instanceDef.itemId === weaponId) {
        foundInstanceId = slot.itemInstanceId
        break
      }
    }
  }

  if (!foundInstanceId) {
    return state // Item not found
  }

  const sellPrice = Math.floor(getWeaponRepairCost(weaponId) * 2.5)
  const weaponDef = contentCatalog.itemsById.get(weaponId)

  // Remove the item from household storage
  const storageContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  const updatedSharedContainers = [...state.inventoryState.sharedContainers]
  const container = updatedSharedContainers[storageContainerIndex]
  const updatedSlots = container.slots.filter((slot) => slot.itemInstanceId !== foundInstanceId)

  updatedSharedContainers[storageContainerIndex] = { ...container, slots: updatedSlots }

  // Remove from item registry
  const { [foundInstanceId]: _, ...updatedItemRegistry } = state.inventoryState.itemRegistry

  const nextState = {
    ...state,
    money: state.money + sellPrice,
    inventoryState: {
      ...state.inventoryState,
      sharedContainers: updatedSharedContainers,
      itemRegistry: updatedItemRegistry,
    },
  }

  return appendActivityLogEntry(
    nextState,
    'economy',
    `Sold ${weaponDef?.name ?? weaponId} from House Storage. +${sellPrice} Marks.`,
  )
}

/**
 * Sell armor from household storage.
 * This is the canonical replacement for sellFromStash for armor.
 *
 * @param state - Current game state
 * @param armorId - The armor definition ID to sell
 * @returns Updated game state
 */
export function sellArmorFromHouseStorage(state: GameState, armorId: string): GameState {
  // Find first armor with this itemId in household storage
  let foundInstanceId: string | null = null
  const storageContainer = state.inventoryState.sharedContainers.find(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  if (!storageContainer) {
    return state
  }

  for (const slot of storageContainer.slots) {
    if (slot.itemInstanceId) {
      const instanceDef = state.inventoryState.itemRegistry[slot.itemInstanceId]
      if (instanceDef && instanceDef.itemId === armorId) {
        foundInstanceId = slot.itemInstanceId
        break
      }
    }
  }

  if (!foundInstanceId) {
    return state // Item not found
  }

  const sellPrice = Math.floor(getArmorRepairCost(armorId) * 2.5)
  const armorDef = contentCatalog.itemsById.get(armorId)

  // Remove the item from household storage
  const storageContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  const updatedSharedContainers = [...state.inventoryState.sharedContainers]
  const container = updatedSharedContainers[storageContainerIndex]
  const updatedSlots = container.slots.filter((slot) => slot.itemInstanceId !== foundInstanceId)

  updatedSharedContainers[storageContainerIndex] = { ...container, slots: updatedSlots }

  // Remove from item registry
  const { [foundInstanceId]: _, ...updatedItemRegistry } = state.inventoryState.itemRegistry

  const nextState = {
    ...state,
    money: state.money + sellPrice,
    inventoryState: {
      ...state.inventoryState,
      sharedContainers: updatedSharedContainers,
      itemRegistry: updatedItemRegistry,
    },
  }

  return appendActivityLogEntry(
    nextState,
    'economy',
    `Sold ${armorDef?.name ?? armorId} from House Storage. +${sellPrice} Marks.`,
  )
}
