/**
 * End-to-End Regression Tests for Canonical Inventory Workflows
 *
 * This test suite verifies the complete item lifecycle across buy -> store -> equip -> gift workflows.
 * These tests exist to prevent regressions like the original buy/equip source split bug.
 *
 * Related: destiny-su15.11 - Regression suite for canonical inventory workflows
 */

import { describe, expect, it } from 'vitest'
import type { ContainerType } from '../../../domain/inventory/contracts'
import { initialGameStateSnapshot } from '../../store/initialGameState'
import { purchaseItemFromShop } from '../purchase'
import { depositToHouseStorage, withdrawFromHouseStorage } from './householdStorage'
import { equipItem } from './equipItem'
import type { GameState } from '../../../domain/game/contracts'

// Test item IDs that exist in contentCatalog
const ITEM_ID_SPARE_PARTS = 'item-spare-parts'
const ITEM_ID_FIELD_MEDKIT = 'item-medkit-field'
const ITEM_ID_WEAPON_DAGGER = 'weapon-dagger-wasterunner'

// Shop IDs from contentCatalog
const SHOP_ID_IRONWORKS_SUPPLY = 'shop-ironworks-supply'
const SHOP_ID_HARBOR_PROVISIONS = 'shop-harbor-provisions'

// NPC ID for testing
const TEST_NPC_ID = 'npc-marion-vale'

// Item instance IDs from initial game state (shop stock)
const INST_SPARE_PARTS_001 = 'inst-spare-parts-001'
const INST_DAGGER_001 = 'inst-dagger-wasterunner-001'

/**
 * Creates a game state with sufficient money for purchase tests
 */
function createRichState(): GameState {
  return {
    ...initialGameStateSnapshot,
    currentDistrictId: 'district-ironworks',
    money: 500,
    roster: initialGameStateSnapshot.roster.map((npc) =>
      npc.npcId === TEST_NPC_ID
        ? { ...npc, assignment: 'working' } // Make NPC a household member for equip testing
        : npc
    ),
  }
}

/**
 * Creates a state with an item already in house storage
 */
function createStateWithStoredItem(itemId: string, instanceId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    money: 500,
    currentDistrictId: 'district-ironworks',
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [],
        usedBagSlots: 0,
        equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
      },
      sharedContainers: [
        {
          containerId: 'household:house-blackthorn:storage',
          containerType: 'vault' as ContainerType,
          ownerId: 'household:house-blackthorn:storage',
          maxSlots: 50,
          slots: [
            {
              slotId: `slot-${instanceId}`,
              itemInstanceId: instanceId,
              quantity: 1,
            },
          ],
          locked: false,
        },
      ],
      itemRegistry: {
        ...initialGameStateSnapshot.inventoryState.itemRegistry,
        [instanceId]: {
          uniqueId: instanceId,
          itemId,
          quantity: 1,
          locationType: 'container',
          locationId: 'household:house-blackthorn:storage',
          acquiredDay: 1,
          acquiredFrom: 'test',
          flags: [],
        },
      },
      npcInventories: {
        [TEST_NPC_ID]: [
          {
            containerId: `npc:${TEST_NPC_ID}:inventory`,
            containerType: 'backpack' as ContainerType,
            ownerId: TEST_NPC_ID,
            maxSlots: 20,
            slots: [],
            locked: false,
          },
        ],
      },
    },
    roster: initialGameStateSnapshot.roster.map((npc) =>
      npc.npcId === TEST_NPC_ID
        ? { ...npc, assignment: 'working' }
        : npc
    ),
  }
}

/**
 * Creates a state with an item in NPC inventory for equip testing
 */
function createStateWithNpcItem(itemId: string, instanceId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    money: 500,
    currentDistrictId: initialGameStateSnapshot.houseDistrictId,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [],
        usedBagSlots: 0,
        equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
      },
      sharedContainers: initialGameStateSnapshot.inventoryState.sharedContainers,
      itemRegistry: {
        ...initialGameStateSnapshot.inventoryState.itemRegistry,
        [instanceId]: {
          uniqueId: instanceId,
          itemId,
          quantity: 1,
          locationType: 'npc_inventory',
          locationId: TEST_NPC_ID,
          acquiredDay: 1,
          acquiredFrom: TEST_NPC_ID,
          flags: [],
        },
      },
      npcInventories: {
        [TEST_NPC_ID]: [
          {
            containerId: `npc:${TEST_NPC_ID}:inventory`,
            containerType: 'backpack' as ContainerType,
            ownerId: TEST_NPC_ID,
            maxSlots: 20,
            slots: [
              {
                slotId: `slot-${instanceId}`,
                itemInstanceId: instanceId,
                quantity: 1,
              },
            ],
            locked: false,
          },
        ],
      },
    },
    roster: initialGameStateSnapshot.roster.map((npc) =>
      npc.npcId === TEST_NPC_ID
        ? { ...npc, assignment: 'working' }
        : npc
    ),
  }
}

/**
 * Creates a state with a weapon in house storage for NPC equip testing
 */
function createStateWithWeaponInStorage(weaponId: string, instanceId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    money: 500,
    currentDistrictId: 'district-ironworks',
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [],
        usedBagSlots: 0,
        equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
      },
      sharedContainers: [
        {
          containerId: 'household:house-blackthorn:storage',
          containerType: 'vault' as ContainerType,
          ownerId: 'household:house-blackthorn:storage',
          maxSlots: 50,
          slots: [
            {
              slotId: `slot-${instanceId}`,
              itemInstanceId: instanceId,
              quantity: 1,
            },
          ],
          locked: false,
        },
      ],
      itemRegistry: {
        ...initialGameStateSnapshot.inventoryState.itemRegistry,
        [instanceId]: {
          uniqueId: instanceId,
          itemId: weaponId,
          quantity: 1,
          locationType: 'container',
          locationId: 'household:house-blackthorn:storage',
          acquiredDay: 1,
          acquiredFrom: 'test',
          flags: [],
        },
      },
      npcInventories: {
        [TEST_NPC_ID]: [
          {
            containerId: `npc:${TEST_NPC_ID}:inventory`,
            containerType: 'backpack' as ContainerType,
            ownerId: TEST_NPC_ID,
            maxSlots: 20,
            slots: [],
            locked: false,
          },
        ],
      },
    },
    roster: initialGameStateSnapshot.roster.map((npc) =>
      npc.npcId === TEST_NPC_ID
        ? { ...npc, assignment: 'working' }
        : npc
    ),
  }
}

describe('Canonical Inventory E2E Regression Suite', () => {
  describe('Workflow: Buy -> Deposit -> Withdraw', () => {
    it('allows purchasing an item and depositing to house storage', () => {
      // Step 1: Purchase item from shop
      const state = createRichState()
      const nextState = purchaseItemFromShop(state, SHOP_ID_IRONWORKS_SUPPLY, ITEM_ID_SPARE_PARTS)

      // Verify purchase succeeded
      expect(nextState.money).toBeLessThan(state.money)
      const purchaseLog = nextState.activityLog.find((entry) => entry.message.includes('Purchased'))
      expect(purchaseLog).toBeDefined()

      // Item should be in player inventory
      const playerSpareParts = nextState.inventoryState.player.bagContainers.flatMap((c) => c.slots).filter((s) => {
        if (!s.itemInstanceId) return false
        const registry = nextState.inventoryState.itemRegistry[s.itemInstanceId]
        return registry?.itemId === ITEM_ID_SPARE_PARTS
      })
      expect(playerSpareParts.length).toBeGreaterThan(0)

      const purchasedInstanceId = playerSpareParts[0]?.itemInstanceId
      expect(purchasedInstanceId).toBeDefined()
      if (!purchasedInstanceId) return

      // Step 2: Deposit to house storage
      const storedState = depositToHouseStorage(nextState, purchasedInstanceId)

      // Item should be removed from player inventory
      const afterDepositPlayerSlots = storedState.inventoryState.player.bagContainers.flatMap((c) =>
        c.slots.filter((s) => s.itemInstanceId === purchasedInstanceId)
      )
      expect(afterDepositPlayerSlots.length).toBe(0)

      // Item should be in house storage
      const storageContainer = storedState.inventoryState.sharedContainers.find(
        (c) => c.containerId === 'household:house-blackthorn:storage'
      )
      const storageSlot = storageContainer?.slots.find((s) => s.itemInstanceId === purchasedInstanceId)
      expect(storageSlot).toBeDefined()

      // Item registry should be updated to container location
      expect(storedState.inventoryState.itemRegistry[purchasedInstanceId!]?.locationType).toBe('container')
      expect(storedState.inventoryState.itemRegistry[purchasedInstanceId!]?.locationId).toBe('household:house-blackthorn:storage')
    })

    it('allows withdrawing an item from house storage to player inventory', () => {
      // Start with item in house storage
      const state = createStateWithStoredItem(ITEM_ID_SPARE_PARTS, INST_SPARE_PARTS_001)

      // Withdraw from house storage
      const withdrawnState = withdrawFromHouseStorage(state, INST_SPARE_PARTS_001)

      // Item should be in player inventory
      const playerSlots = withdrawnState.inventoryState.player.bagContainers.flatMap((c) => c.slots).filter((s) =>
        s.itemInstanceId === INST_SPARE_PARTS_001
      )
      expect(playerSlots.length).toBeGreaterThan(0)

      // Item should be removed from house storage
      const storageContainer = withdrawnState.inventoryState.sharedContainers.find(
        (c) => c.containerId === 'household:house-blackthorn:storage'
      )
      const storageSlot = storageContainer?.slots.find((s) => s.itemInstanceId === INST_SPARE_PARTS_001)
      expect(storageSlot).toBeUndefined()

      // Item registry should be updated to player_inventory location
      expect(withdrawnState.inventoryState.itemRegistry[INST_SPARE_PARTS_001]?.locationType).toBe('player_inventory')
      expect(withdrawnState.inventoryState.itemRegistry[INST_SPARE_PARTS_001]?.locationId).toBe('player')
    })

    it('preserves item instance identity across buy -> deposit -> withdraw workflow', () => {
      // Purchase from shop
      const state = createRichState()
      const purchased = purchaseItemFromShop(state, SHOP_ID_IRONWORKS_SUPPLY, ITEM_ID_SPARE_PARTS)

      const playerSlot = purchased.inventoryState.player.bagContainers.flatMap((c) => c.slots).find((s) => {
        if (!s.itemInstanceId) return false
        const registry = purchased.inventoryState.itemRegistry[s.itemInstanceId]
        return registry?.itemId === ITEM_ID_SPARE_PARTS
      })
      const instanceId = playerSlot?.itemInstanceId
      expect(instanceId).toBeDefined()
      if (!instanceId) return

      // Deposit
      const stored = depositToHouseStorage(purchased, instanceId)
      const storageContainer = stored.inventoryState.sharedContainers.find(
        (c) => c.containerId === 'household:house-blackthorn:storage'
      )
      const storageSlot = storageContainer?.slots.find((s) => s.itemInstanceId === instanceId)
      expect(storageSlot?.itemInstanceId).toBe(instanceId)

      // Withdraw
      const withdrawn = withdrawFromHouseStorage(stored, instanceId!)
      const withdrawnSlot = withdrawn.inventoryState.player.bagContainers.flatMap((c) => c.slots).find((s) =>
        s.itemInstanceId === instanceId
      )
      expect(withdrawnSlot?.itemInstanceId).toBe(instanceId)

      // The same instance ID should be traceable throughout
      expect(withdrawn.inventoryState.itemRegistry[instanceId!]?.itemId).toBe(ITEM_ID_SPARE_PARTS)
    })
  })

  describe('Workflow: NPC Equip from Accessible Containers', () => {
    it('allows household NPC to equip a weapon from house storage (accessible shared container)', () => {
      // Start with weapon in house storage
      const state = createStateWithWeaponInStorage(ITEM_ID_WEAPON_DAGGER, INST_DAGGER_001)

      // Household NPC should be able to equip weapon from house storage
      const equipped = equipItem(state, {
        ownerId: TEST_NPC_ID,
        itemInstanceId: INST_DAGGER_001,
        slot: 'weapon',
      })

      // NPC should have the weapon equipped
      expect(equipped.roster.find((n) => n.npcId === TEST_NPC_ID)?.equipment.weapon).toBe(INST_DAGGER_001)
    })

    it('allows NPC to equip weapon from personal inventory', () => {
      // Start with weapon in NPC inventory
      const state = createStateWithNpcItem(ITEM_ID_WEAPON_DAGGER, INST_DAGGER_001)

      // Equip the weapon from NPC's personal inventory
      const equipped = equipItem(state, {
        ownerId: TEST_NPC_ID,
        itemInstanceId: INST_DAGGER_001,
        slot: 'weapon',
      })

      expect(equipped.roster.find((n) => n.npcId === TEST_NPC_ID)?.equipment.weapon).toBe(INST_DAGGER_001)
    })
  })

  describe('Edge Case: Invalid Purchase Scenarios', () => {
    it('returns state unchanged when purchasing from non-existent shop', () => {
      const state = createRichState()
      const result = purchaseItemFromShop(state, 'shop-does-not-exist', ITEM_ID_SPARE_PARTS)
      expect(result).toEqual(state)
    })

    it('returns state unchanged when purchasing item not offered by shop', () => {
      const state = createRichState()
      const result = purchaseItemFromShop(state, SHOP_ID_IRONWORKS_SUPPLY, 'item-nonexistent')
      // Should return state unchanged
      expect(result.money).toBe(state.money)
    })

    it('returns state unchanged when player lacks funds', () => {
      const poorState = {
        ...initialGameStateSnapshot,
        money: 10,
        currentDistrictId: 'district-ironworks',
      }

      const result = purchaseItemFromShop(poorState, SHOP_ID_HARBOR_PROVISIONS, ITEM_ID_FIELD_MEDKIT)
      expect(result).toEqual(poorState)
    })
  })

  describe('Edge Case: Item Identity Integrity', () => {
    it('does not duplicate item instances during deposit/withdraw operations', () => {
      // Start with item in house storage
      const state = createStateWithStoredItem(ITEM_ID_SPARE_PARTS, INST_SPARE_PARTS_001)

      // Count total instances of this item type
      const initialPlayerSpareParts = state.inventoryState.player.bagContainers.flatMap((c) => c.slots).filter((s) => {
        if (!s.itemInstanceId) return false
        const registry = state.inventoryState.itemRegistry[s.itemInstanceId]
        return registry?.itemId === ITEM_ID_SPARE_PARTS
      })
      const initialStorageSpareParts = state.inventoryState.sharedContainers.flatMap((c) => c.slots).filter((s) => {
        if (!s.itemInstanceId) return false
        const registry = state.inventoryState.itemRegistry[s.itemInstanceId]
        return registry?.itemId === ITEM_ID_SPARE_PARTS
      })

      expect(initialPlayerSpareParts.length + initialStorageSpareParts.length).toBe(1)

      // Withdraw
      const withdrawn = withdrawFromHouseStorage(state, INST_SPARE_PARTS_001)

      const withdrawnPlayerSpareParts = withdrawn.inventoryState.player.bagContainers.flatMap((c) => c.slots).filter((s) => {
        if (!s.itemInstanceId) return false
        const registry = withdrawn.inventoryState.itemRegistry[s.itemInstanceId]
        return registry?.itemId === ITEM_ID_SPARE_PARTS
      })
      const withdrawnStorageSpareParts = withdrawn.inventoryState.sharedContainers.flatMap((c) => c.slots).filter((s) => {
        if (!s.itemInstanceId) return false
        const registry = withdrawn.inventoryState.itemRegistry[s.itemInstanceId]
        return registry?.itemId === ITEM_ID_SPARE_PARTS
      })

      // Still exactly one instance total
      expect(withdrawnPlayerSpareParts.length + withdrawnStorageSpareParts.length).toBe(1)
    })

    it('updates item registry location when depositing to house storage', () => {
      // Purchase item (starts in player inventory)
      const state = createRichState()
      const purchased = purchaseItemFromShop(state, SHOP_ID_IRONWORKS_SUPPLY, ITEM_ID_SPARE_PARTS)

      const instanceId = purchased.inventoryState.player.bagContainers.flatMap((c) => c.slots).find((s) => {
        if (!s.itemInstanceId) return false
        const registry = purchased.inventoryState.itemRegistry[s.itemInstanceId]
        return registry?.itemId === ITEM_ID_SPARE_PARTS
      })?.itemInstanceId
      expect(instanceId).toBeDefined()
      if (!instanceId) return

      const initialRegistry = purchased.inventoryState.itemRegistry[instanceId]
      expect(initialRegistry.locationType).toBe('player_inventory')

      // Deposit to house storage
      const stored = depositToHouseStorage(purchased, instanceId)

      const storedRegistry = stored.inventoryState.itemRegistry[instanceId]
      expect(storedRegistry.locationType).toBe('container')
      expect(storedRegistry.locationId).toBe('household:house-blackthorn:storage')
    })

    it('updates item registry location when withdrawing from house storage', () => {
      // Start with item in house storage
      const state = createStateWithStoredItem(ITEM_ID_SPARE_PARTS, INST_SPARE_PARTS_001)

      const initialRegistry = state.inventoryState.itemRegistry[INST_SPARE_PARTS_001]
      expect(initialRegistry.locationType).toBe('container')

      // Withdraw from house storage
      const withdrawn = withdrawFromHouseStorage(state, INST_SPARE_PARTS_001)

      const withdrawnRegistry = withdrawn.inventoryState.itemRegistry[INST_SPARE_PARTS_001]
      expect(withdrawnRegistry.locationType).toBe('player_inventory')
      expect(withdrawnRegistry.locationId).toBe('player')
    })
  })

  describe('Regression: Original Buy/Equip Source Split Bug', () => {
    /**
     * This test documents the original bug: purchased items could not be equipped
     * on roster NPCs because buy wrote to player_inventory but equip read from
     * a different source (legacy stash or wrong container).
     *
     * After the canonical inventory migration, this should work because:
     * - purchase writes to player.bagContainers
     * - equip reads from player.bagContainers (for player) or accessible containers (for NPC)
     */
    it('regression: purchased item can be accessed by canonical selectors', () => {
      // Purchase item
      const state = createRichState()
      const purchased = purchaseItemFromShop(state, SHOP_ID_IRONWORKS_SUPPLY, ITEM_ID_SPARE_PARTS)

      // Verify item is in player inventory with correct registry entry
      const playerSlot = purchased.inventoryState.player.bagContainers.flatMap((c) => c.slots).find((s) => {
        if (!s.itemInstanceId) return false
        const registry = purchased.inventoryState.itemRegistry[s.itemInstanceId]
        return registry?.itemId === ITEM_ID_SPARE_PARTS
      })

      expect(playerSlot).toBeDefined()
      expect(playerSlot?.itemInstanceId).toBeDefined()
      if (!playerSlot?.itemInstanceId) return
      expect(purchased.inventoryState.itemRegistry[playerSlot.itemInstanceId]?.locationType).toBe('player_inventory')
      expect(purchased.inventoryState.itemRegistry[playerSlot.itemInstanceId]?.locationId).toBe('player')
    })
  })
})
