import { describe, expect, test } from 'vitest'
import {
  depositToHouseStorage,
  withdrawFromHouseStorage,
  pickupFromSiteContainer,
  storeInSiteContainer,
  getHouseStorageItems,
  hasHouseStorageSpace,
  HOUSEHOLD_STORAGE_CONTAINER_ID,
} from './householdStorage'
import type { GameState } from '../../../domain/game/contracts'
import { initialGameStateSnapshot } from '../../store/initialGameState'
import type { InventoryContainer } from '../../../domain/inventory/contracts'

// Helper to create a container with items
function createContainer(
  containerId: string,
  ownerId: string,
  items: Array<{ itemInstanceId: string; quantity: number }>,
  maxSlots = 20,
): InventoryContainer {
  return {
    containerId,
    containerType: 'backpack',
    ownerId,
    maxSlots,
    slots: items.map((item) => ({
      slotId: `slot-${item.itemInstanceId}`,
      itemInstanceId: item.itemInstanceId,
      quantity: item.quantity,
    })),
    locked: false,
  }
}

const ITEM_ID_IRON_SWORD = 'item-iron-sword'
const ITEM_ID_LEATHER_TUNIC = 'item-leather-tunic'

const baseState: GameState = {
  ...initialGameStateSnapshot,
  inventoryState: {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [
        createContainer(
          'player-bag',
          'player',
          [
            { itemInstanceId: ITEM_ID_IRON_SWORD, quantity: 3 },
            { itemInstanceId: ITEM_ID_LEATHER_TUNIC, quantity: 1 },
          ],
          10,
        ),
      ],
      usedBagSlots: 2,
    },
    sharedContainers: [
      createContainer(
        HOUSEHOLD_STORAGE_CONTAINER_ID,
        HOUSEHOLD_STORAGE_CONTAINER_ID,
        [],
        20,
      ),
    ],
    // Set up itemRegistry with the test items
    itemRegistry: {
      ...initialGameStateSnapshot.inventoryState.itemRegistry,
      [ITEM_ID_IRON_SWORD]: {
        uniqueId: ITEM_ID_IRON_SWORD,
        itemId: ITEM_ID_IRON_SWORD,
        quantity: 3,
        locationType: 'player_inventory',
        locationId: 'player',
        acquiredDay: 1,
        acquiredFrom: 'test',
        flags: [],
      },
      [ITEM_ID_LEATHER_TUNIC]: {
        uniqueId: ITEM_ID_LEATHER_TUNIC,
        itemId: ITEM_ID_LEATHER_TUNIC,
        quantity: 1,
        locationType: 'player_inventory',
        locationId: 'player',
        acquiredDay: 1,
        acquiredFrom: 'test',
        flags: [],
      },
    },
  },
}

describe('depositToHouseStorage', () => {
  test('deposits item from player inventory to house storage', () => {
    const result = depositToHouseStorage(baseState, ITEM_ID_IRON_SWORD)

    // Item removed from player inventory
    const playerContainer = result.inventoryState.player.bagContainers[0]
    const playerItemSlot = playerContainer.slots.find((s) => s.itemInstanceId === ITEM_ID_IRON_SWORD)
    expect(playerItemSlot?.quantity).toBe(2)

    // Item added to house storage
    const storageContainer = result.inventoryState.sharedContainers.find(
      (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
    )
    const storageItemSlot = storageContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_IRON_SWORD)
    expect(storageItemSlot?.quantity).toBe(1)
  })

  test('returns state unchanged if item not in player inventory', () => {
    const result = depositToHouseStorage(baseState, 'item-nonexistent')
    expect(result).toBe(baseState)
  })

  test('logs activity when depositing', () => {
    const result = depositToHouseStorage(baseState, ITEM_ID_LEATHER_TUNIC)
    const logEntry = result.activityLog.find((entry) =>
      entry.message.includes('Deposited') && entry.message.includes('house storage')
    )
    expect(logEntry).toBeDefined()
  })
})

describe('withdrawFromHouseStorage', () => {
  const stateWithStorageItem: GameState = {
    ...baseState,
    inventoryState: {
      ...baseState.inventoryState,
      player: {
        ...baseState.inventoryState.player,
        bagContainers: [
          createContainer(
            'player-bag',
            'player',
            [{ itemInstanceId: ITEM_ID_LEATHER_TUNIC, quantity: 1 }],
            10,
          ),
        ],
        usedBagSlots: 1,
      },
      sharedContainers: [
        createContainer(
          HOUSEHOLD_STORAGE_CONTAINER_ID,
          HOUSEHOLD_STORAGE_CONTAINER_ID,
          [{ itemInstanceId: ITEM_ID_IRON_SWORD, quantity: 2 }],
          20,
        ),
      ],
      itemRegistry: {
        ...baseState.inventoryState.itemRegistry,
        [ITEM_ID_IRON_SWORD]: {
          uniqueId: ITEM_ID_IRON_SWORD,
          itemId: ITEM_ID_IRON_SWORD,
          quantity: 2,
          locationType: 'container',
          locationId: HOUSEHOLD_STORAGE_CONTAINER_ID,
          acquiredDay: 1,
          acquiredFrom: 'test',
          flags: [],
        },
      },
    },
  }

  test('withdraws item from house storage to player inventory', () => {
    const result = withdrawFromHouseStorage(stateWithStorageItem, ITEM_ID_IRON_SWORD)

    // Item removed from house storage
    const storageContainer = result.inventoryState.sharedContainers.find(
      (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
    )
    const storageItemSlot = storageContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_IRON_SWORD)
    expect(storageItemSlot?.quantity).toBe(1)

    // Item added to player inventory - check any container
    let playerItemSlot: { itemInstanceId: string; quantity: number } | undefined
    for (const container of result.inventoryState.player.bagContainers) {
      const slot = container.slots.find((s) => s.itemInstanceId === ITEM_ID_IRON_SWORD)
      if (slot && slot.itemInstanceId) {
        playerItemSlot = { itemInstanceId: slot.itemInstanceId, quantity: slot.quantity }
        break
      }
    }
    expect(playerItemSlot?.quantity).toBe(1) // Just the withdrawn item (stateWithStorageItem has only leather tunic in player inventory)
  })

  test('returns state unchanged if item not in house storage', () => {
    const result = withdrawFromHouseStorage(baseState, 'item-nonexistent')
    expect(result).toBe(baseState)
  })

  test('logs activity when withdrawing', () => {
    const result = withdrawFromHouseStorage(stateWithStorageItem, ITEM_ID_IRON_SWORD)
    const logEntry = result.activityLog.find((entry) =>
      entry.message.includes('Withdrew') && entry.message.includes('house storage')
    )
    expect(logEntry).toBeDefined()
  })
})

describe('getHouseStorageItems', () => {
  const stateWithStorageItems: GameState = {
    ...baseState,
    inventoryState: {
      ...baseState.inventoryState,
      player: {
        ...baseState.inventoryState.player,
        bagContainers: [],
        usedBagSlots: 0,
      },
      sharedContainers: [
        createContainer(
          HOUSEHOLD_STORAGE_CONTAINER_ID,
          HOUSEHOLD_STORAGE_CONTAINER_ID,
          [
            { itemInstanceId: ITEM_ID_IRON_SWORD, quantity: 3 },
            { itemInstanceId: ITEM_ID_LEATHER_TUNIC, quantity: 2 },
          ],
          20,
        ),
      ],
      itemRegistry: {
        [ITEM_ID_IRON_SWORD]: {
          uniqueId: ITEM_ID_IRON_SWORD,
          itemId: ITEM_ID_IRON_SWORD,
          quantity: 3,
          locationType: 'container',
          locationId: HOUSEHOLD_STORAGE_CONTAINER_ID,
          acquiredDay: 1,
          acquiredFrom: 'test',
          flags: [],
        },
        [ITEM_ID_LEATHER_TUNIC]: {
          uniqueId: ITEM_ID_LEATHER_TUNIC,
          itemId: ITEM_ID_LEATHER_TUNIC,
          quantity: 2,
          locationType: 'container',
          locationId: HOUSEHOLD_STORAGE_CONTAINER_ID,
          acquiredDay: 1,
          acquiredFrom: 'test',
          flags: [],
        },
      },
    },
  }

  test('returns all items in house storage', () => {
    const items = getHouseStorageItems(stateWithStorageItems)
    expect(items.length).toBe(2)
    expect(items.find((i) => i.instanceId === ITEM_ID_IRON_SWORD)?.quantity).toBe(3)
    expect(items.find((i) => i.instanceId === ITEM_ID_LEATHER_TUNIC)?.quantity).toBe(2)
  })

  test('returns empty array if house storage is empty', () => {
    const items = getHouseStorageItems(baseState)
    expect(items.length).toBe(0)
  })

  test('returns empty array if house storage container does not exist', () => {
    const stateWithoutStorage: GameState = {
      ...baseState,
      inventoryState: {
        ...baseState.inventoryState,
        sharedContainers: [],
      },
    }
    const items = getHouseStorageItems(stateWithoutStorage)
    expect(items.length).toBe(0)
  })
})

describe('hasHouseStorageSpace', () => {
  test('returns true when storage has space', () => {
    expect(hasHouseStorageSpace(baseState)).toBe(true)
  })

  test('returns false when storage is full', () => {
    const stateWithFullStorage: GameState = {
      ...baseState,
      inventoryState: {
        ...baseState.inventoryState,
        sharedContainers: [
          createContainer(
            HOUSEHOLD_STORAGE_CONTAINER_ID,
            HOUSEHOLD_STORAGE_CONTAINER_ID,
            Array.from({ length: 20 }, (_, i) => ({ itemInstanceId: `item-${i}`, quantity: 1 })),
            20,
          ),
        ],
      },
    }
    expect(hasHouseStorageSpace(stateWithFullStorage)).toBe(false)
  })

  test('returns true if container does not exist (unlimited space)', () => {
    const stateWithoutStorage: GameState = {
      ...baseState,
      inventoryState: {
        ...baseState.inventoryState,
        sharedContainers: [],
      },
    }
    expect(hasHouseStorageSpace(stateWithoutStorage)).toBe(true)
  })
})

describe('pickupFromSiteContainer', () => {
  const SITE_CONTAINER_ID = 'site:house-blackthorn:study-cache'

  const stateWithSiteContainer: GameState = {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [
          createContainer(
            'player-bag',
            'player',
            [{ itemInstanceId: ITEM_ID_LEATHER_TUNIC, quantity: 1 }],
            10,
          ),
        ],
        usedBagSlots: 1,
      },
      sharedContainers: [
        createContainer(
          SITE_CONTAINER_ID,
          SITE_CONTAINER_ID,
          [{ itemInstanceId: ITEM_ID_IRON_SWORD, quantity: 1 }],
          10,
        ),
      ],
      itemRegistry: {
        ...initialGameStateSnapshot.inventoryState.itemRegistry,
        [ITEM_ID_IRON_SWORD]: {
          uniqueId: ITEM_ID_IRON_SWORD,
          itemId: ITEM_ID_IRON_SWORD,
          quantity: 1,
          locationType: 'container',
          locationId: SITE_CONTAINER_ID,
          acquiredDay: 1,
          acquiredFrom: 'test',
          flags: [],
        },
        [ITEM_ID_LEATHER_TUNIC]: {
          uniqueId: ITEM_ID_LEATHER_TUNIC,
          itemId: ITEM_ID_LEATHER_TUNIC,
          quantity: 1,
          locationType: 'player_inventory',
          locationId: 'player',
          acquiredDay: 1,
          acquiredFrom: 'test',
          flags: [],
        },
      },
    },
  }

  test('picks up item from site container to player inventory', () => {
    const result = pickupFromSiteContainer(stateWithSiteContainer, SITE_CONTAINER_ID, ITEM_ID_IRON_SWORD)

    // Item removed from site container
    const siteContainer = result.inventoryState.sharedContainers.find(
      (c) => c.containerId === SITE_CONTAINER_ID
    )
    const siteItemSlot = siteContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_IRON_SWORD)
    expect(siteItemSlot).toBeUndefined()

    // Item added to player inventory - check any container
    let playerItemSlot: { itemInstanceId: string; quantity: number } | undefined
    for (const container of result.inventoryState.player.bagContainers) {
      const slot = container.slots.find((s) => s.itemInstanceId === ITEM_ID_IRON_SWORD)
      if (slot && slot.itemInstanceId) {
        playerItemSlot = { itemInstanceId: slot.itemInstanceId, quantity: slot.quantity }
        break
      }
    }
    expect(playerItemSlot?.quantity).toBe(1) // Just the picked up item (stateWithSiteContainer has only leather tunic in player inventory)
  })

  test('returns state unchanged if site container does not exist', () => {
    const result = pickupFromSiteContainer(baseState, 'nonexistent-site', ITEM_ID_IRON_SWORD)
    // Should return state unchanged (not the same reference, but no changes)
    expect(result.inventoryState.sharedContainers).toHaveLength(baseState.inventoryState.sharedContainers.length)
  })

  test('returns state unchanged if item not in site container', () => {
    const result = pickupFromSiteContainer(stateWithSiteContainer, SITE_CONTAINER_ID, 'item-nonexistent')
    // Should return state unchanged
    expect(result.inventoryState.sharedContainers.find(c => c.containerId === SITE_CONTAINER_ID)?.slots).toHaveLength(1)
  })

  test('logs activity when picking up', () => {
    const result = pickupFromSiteContainer(stateWithSiteContainer, SITE_CONTAINER_ID, ITEM_ID_IRON_SWORD)
    const logEntry = result.activityLog.find((entry) =>
      entry.message.includes('Picked up') && entry.message.includes('from the site')
    )
    expect(logEntry).toBeDefined()
  })
})

describe('storeInSiteContainer', () => {
  const SITE_CONTAINER_ID = 'site:house-blackthorn:hidden-cache'

  const stateWithEmptySiteContainer: GameState = {
    ...baseState,
    inventoryState: {
      ...baseState.inventoryState,
      sharedContainers: [
        createContainer(SITE_CONTAINER_ID, SITE_CONTAINER_ID, [], 10),
      ],
    },
  }

  test('stores item from player inventory into site container', () => {
    const result = storeInSiteContainer(stateWithEmptySiteContainer, SITE_CONTAINER_ID, ITEM_ID_IRON_SWORD)

    // Item removed from player inventory
    let playerItemSlot: { itemInstanceId: string; quantity: number } | undefined
    for (const container of result.inventoryState.player.bagContainers) {
      const slot = container.slots.find((s) => s.itemInstanceId === ITEM_ID_IRON_SWORD)
      if (slot && slot.itemInstanceId) {
        playerItemSlot = { itemInstanceId: slot.itemInstanceId, quantity: slot.quantity }
        break
      }
    }
    expect(playerItemSlot?.quantity).toBe(2)

    // Item added to site container
    const siteContainer = result.inventoryState.sharedContainers.find(
      (c) => c.containerId === SITE_CONTAINER_ID
    )
    const siteItemSlot = siteContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_IRON_SWORD)
    expect(siteItemSlot?.quantity).toBe(1)
  })

  test('returns state unchanged if site container does not exist', () => {
    const result = storeInSiteContainer(baseState, 'nonexistent-site', ITEM_ID_IRON_SWORD)
    // Should return state unchanged - no new container created
    expect(result.inventoryState.sharedContainers.find(c => c.containerId === 'nonexistent-site')).toBeUndefined()
  })

  test('returns state unchanged if item not in player inventory', () => {
    const result = storeInSiteContainer(stateWithEmptySiteContainer, SITE_CONTAINER_ID, 'item-nonexistent')
    // Should return state unchanged
    expect(result.inventoryState.sharedContainers.find(c => c.containerId === SITE_CONTAINER_ID)?.slots).toHaveLength(0)
  })

  test('logs activity when storing', () => {
    const result = storeInSiteContainer(stateWithEmptySiteContainer, SITE_CONTAINER_ID, ITEM_ID_LEATHER_TUNIC)
    const logEntry = result.activityLog.find((entry) =>
      entry.message.includes('Stowed') && entry.message.includes('in the site')
    )
    expect(logEntry).toBeDefined()
  })
})

describe('Storage workflow integration', () => {
  test('completes full deposit-withdraw cycle', () => {
    const initialState = baseState
    const initialPlayerCount = initialState.inventoryState.player.bagContainers[0].slots.length

    // Deposit
    const afterDeposit = depositToHouseStorage(initialState, ITEM_ID_IRON_SWORD)
    expect(afterDeposit.inventoryState.player.bagContainers[0].slots.length).toBe(initialPlayerCount) // Same slots, different quantity

    // Withdraw
    const afterWithdraw = withdrawFromHouseStorage(afterDeposit, ITEM_ID_IRON_SWORD)
    const finalPlayerSlot = afterWithdraw.inventoryState.player.bagContainers[0].slots.find(
      (s) => s.itemInstanceId === ITEM_ID_IRON_SWORD
    )
    expect(finalPlayerSlot?.quantity).toBe(3) // Back to original
  })

  test('completes full store-pickup cycle for site container', () => {
    const SITE_CONTAINER_ID = 'site:ruins:loot-cache'
    const initialState: GameState = {
      ...baseState,
      inventoryState: {
        ...baseState.inventoryState,
        sharedContainers: [
          createContainer(SITE_CONTAINER_ID, SITE_CONTAINER_ID, [], 10),
        ],
      },
    }

    const _initialPlayerCount = initialState.inventoryState.player.bagContainers[0].slots.length
    void _initialPlayerCount

    // Store
    const afterStore = storeInSiteContainer(initialState, SITE_CONTAINER_ID, ITEM_ID_IRON_SWORD)
    expect(afterStore.inventoryState.player.bagContainers[0].slots.find(
      (s) => s.itemInstanceId === ITEM_ID_IRON_SWORD
    )?.quantity).toBe(2)

    // Pickup
    const afterPickup = pickupFromSiteContainer(afterStore, SITE_CONTAINER_ID, ITEM_ID_IRON_SWORD)
    const finalPlayerSlot = afterPickup.inventoryState.player.bagContainers[0].slots.find(
      (s) => s.itemInstanceId === ITEM_ID_IRON_SWORD
    )
    expect(finalPlayerSlot?.quantity).toBe(3) // Back to original
  })
})
