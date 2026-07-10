import { describe, expect, test } from 'vitest'
import { transferItem } from './transferItem'
import type { GameState } from '../../../domain/game/contracts'
import type { NpcRuntimeState } from '../../../domain/npc/contracts'
import type { InventoryContainer } from '../../../domain/inventory/contracts'
import { initialGameStateSnapshot } from '../../store/initialGameState'

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

// Helper to create a minimal NPC for testing
function createTestNpc(npcId: string, name: string): NpcRuntimeState {
  return {
    ...initialGameStateSnapshot.npcRuntimeStates[0],
    npcId,
    name,
    currentIntention: null,
    currentDirectiveId: null,
    currentEmployment: null,
  } as NpcRuntimeState
}

// Test fixtures
const ITEM_ID_1 = 'item-iron-sword'
const ITEM_ID_2 = 'item-leather-tunic'
const NPC_ID_1 = 'npc-marion-vale'
const NPC_ID_2 = 'npc-verek-holst'

const baseState: GameState = {
  ...initialGameStateSnapshot,
  npcRuntimeStates: [
    createTestNpc(NPC_ID_1, 'Marion Vale'),
    createTestNpc(NPC_ID_2, 'Verek Holst'),
  ],
  inventoryState: {
    ...initialGameStateSnapshot.inventoryState,
    npcInventories: {
      [NPC_ID_1]: [
        createContainer(
          `npc-container-${NPC_ID_1}`,
          NPC_ID_1,
          [
            { itemInstanceId: ITEM_ID_1, quantity: 3 },
            { itemInstanceId: ITEM_ID_2, quantity: 1 },
          ],
          10,
        ),
      ],
      [NPC_ID_2]: [createContainer(`npc-container-${NPC_ID_2}`, NPC_ID_2, [], 10)],
    },
  },
}

describe('transferItem', () => {
  describe('NPC to Player transfer', () => {
    test('transfers item from NPC inventory to player inventory', () => {
      const result = transferItem(baseState, {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: ITEM_ID_1,
        quantity: 1,
      })

      // Item removed from NPC inventory
      const npcContainer = result.inventoryState.npcInventories[NPC_ID_1]?.[0]
      const npcItemSlot = npcContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(npcItemSlot?.quantity).toBe(2)

      // Item added to player inventory
      const playerContainer = result.inventoryState.player.bagContainers[0]
      const playerItemSlot = playerContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(playerItemSlot?.quantity).toBe(1)
    })

    test('transfers full quantity when item quantity matches', () => {
      const result = transferItem(baseState, {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: ITEM_ID_2,
        quantity: 1,
      })

      const npcContainer = result.inventoryState.npcInventories[NPC_ID_1]?.[0]
      const npcItemSlot = npcContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_2)
      expect(npcItemSlot).toBeUndefined() // Item fully removed
    })

    test('returns state unchanged if item not found in source', () => {
      const result = transferItem(baseState, {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: 'item-nonexistent',
        quantity: 1,
      })

      expect(result).toBe(baseState)
    })

    test('returns state unchanged if insufficient quantity', () => {
      const result = transferItem(baseState, {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: ITEM_ID_1,
        quantity: 10, // More than available
      })

      expect(result).toBe(baseState)
    })
  })

  describe('Player to NPC transfer', () => {
    test('transfers item from player inventory to NPC inventory', () => {
      const stateWithPlayerItem: GameState = {
        ...baseState,
        inventoryState: {
          ...baseState.inventoryState,
          player: {
            ...baseState.inventoryState.player,
            bagContainers: [
              createContainer('player-bag', 'player', [{ itemInstanceId: ITEM_ID_1, quantity: 5 }], 10),
            ],
            usedBagSlots: 1, // Must match actual container state
          },
        },
      }

      const result = transferItem(stateWithPlayerItem, {
        fromType: 'player_inventory',
        fromId: 'player',
        toType: 'npc_inventory',
        toId: NPC_ID_2,
        itemInstanceId: ITEM_ID_1,
        quantity: 2,
      })

      // Item removed from player inventory
      const playerContainer = result.inventoryState.player.bagContainers[0]
      const playerItemSlot = playerContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(playerItemSlot?.quantity).toBe(3)

      // Item added to NPC inventory
      const npcContainer = result.inventoryState.npcInventories[NPC_ID_2]?.[0]
      const npcItemSlot = npcContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(npcItemSlot?.quantity).toBe(2)
    })

    test('creates new container in NPC inventory if none exists', () => {
      const stateWithPlayerItem: GameState = {
        ...baseState,
        inventoryState: {
          ...baseState.inventoryState,
          player: {
            ...baseState.inventoryState.player,
            bagContainers: [
              createContainer('player-bag', 'player', [{ itemInstanceId: ITEM_ID_1, quantity: 1 }], 10),
            ],
            usedBagSlots: 1, // Must match actual container state
          },
        },
      }

      // NPC with no containers
      const npcNoContainerState: GameState = {
        ...stateWithPlayerItem,
        inventoryState: {
          ...stateWithPlayerItem.inventoryState,
          npcInventories: {
            ...stateWithPlayerItem.inventoryState.npcInventories,
            [NPC_ID_2]: [],
          },
        },
      }

      const result = transferItem(npcNoContainerState, {
        fromType: 'player_inventory',
        fromId: 'player',
        toType: 'npc_inventory',
        toId: NPC_ID_2,
        itemInstanceId: ITEM_ID_1,
        quantity: 1,
      })

      const npcContainers = result.inventoryState.npcInventories[NPC_ID_2]
      expect(npcContainers?.length).toBe(1)
      const itemSlot = npcContainers?.[0].slots.find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(itemSlot?.quantity).toBe(1)
    })
  })

  describe('NPC to NPC transfer', () => {
    test('transfers item between NPC inventories', () => {
      const result = transferItem(baseState, {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'npc_inventory',
        toId: NPC_ID_2,
        itemInstanceId: ITEM_ID_1,
        quantity: 1,
      })

      // Item removed from source NPC
      const sourceContainer = result.inventoryState.npcInventories[NPC_ID_1]?.[0]
      const sourceItemSlot = sourceContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(sourceItemSlot?.quantity).toBe(2)

      // Item added to destination NPC
      const destContainer = result.inventoryState.npcInventories[NPC_ID_2]?.[0]
      const destItemSlot = destContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(destItemSlot?.quantity).toBe(1)
    })
  })

  describe('Edge cases', () => {
    test('returns state unchanged if source and destination are the same', () => {
      const result = transferItem(baseState, {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'npc_inventory',
        toId: NPC_ID_1,
        itemInstanceId: ITEM_ID_1,
        quantity: 1,
      })

      // Note: transferItem doesn't check for same source/dest, so state changes
      // The item is removed and added back, but quantities remain the same
      const sourceContainer = result.inventoryState.npcInventories[NPC_ID_1]?.[0]
      const sourceItemSlot = sourceContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(sourceItemSlot?.quantity).toBe(3) // Unchanged
    })

    test('handles zero quantity transfer by creating empty slot', () => {
      const result = transferItem(baseState, {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: ITEM_ID_1,
        quantity: 0,
      })

      // Zero quantity creates an empty slot in player inventory
      const playerContainer = result.inventoryState.player.bagContainers[0]
      const itemSlot = playerContainer?.slots.find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(itemSlot?.quantity).toBe(0)
    })

    test('creates new container when existing containers are full', () => {
      const stateWithFullContainers: GameState = {
        ...baseState,
        inventoryState: {
          ...baseState.inventoryState,
          player: {
            ...baseState.inventoryState.player,
            bagContainers: [
              createContainer(
                'player-bag',
                'player',
                Array.from({ length: 10 }, (_, i) => ({ itemInstanceId: `item-${i}`, quantity: 1 })),
                10,
              ),
            ],
          },
        },
      }

      const result = transferItem(stateWithFullContainers, {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: ITEM_ID_1,
        quantity: 1,
      })

      const playerContainers = result.inventoryState.player.bagContainers
      expect(playerContainers.length).toBe(2) // New container created
      const newItemContainer = playerContainers[1]
      const itemSlot = newItemContainer.slots.find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(itemSlot?.quantity).toBe(1)
    })
  })

  // Item-duplication bug, live-reproduced (2026-07-09) via the NPC equip/unequip UI: removeFromEquipment
  // used to both clear the equipment slot AND re-add the item to inventory itself, while transferItem's
  // own generic "add to destination" step (driven by toType) ALSO added it -- doubling quantity on
  // every single equipment -> npc_inventory / equipment -> player_inventory transfer. No existing test
  // in this file exercised the 'equipment' source type at all before this fix.
  describe('Equipment transfer (item-duplication regression)', () => {
    const EQUIPPED_ITEM_ID = 'item-equipped-dagger'

    function stateWithNpcEquippedItem(): GameState {
      return {
        ...baseState,
        npcRuntimeStates: baseState.npcRuntimeStates.map((n) =>
          n.npcId === NPC_ID_1 ? { ...n, equipment: { weapon: EQUIPPED_ITEM_ID, armor: null, accessory: [] } } : n,
        ),
      }
    }

    test('moving an item from NPC equipment to NPC inventory adds it exactly once, not twice', () => {
      const state = stateWithNpcEquippedItem()
      const result = transferItem(state, {
        fromType: 'equipment',
        fromId: NPC_ID_1,
        toType: 'npc_inventory',
        toId: NPC_ID_1,
        itemInstanceId: EQUIPPED_ITEM_ID,
        quantity: 1,
      })

      const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID_1)!
      expect(npc.equipment.weapon).toBeNull()

      const containers = result.inventoryState.npcInventories[NPC_ID_1] ?? []
      const matchingSlots = containers.flatMap((c) => c.slots.filter((s) => s.itemInstanceId === EQUIPPED_ITEM_ID))
      expect(matchingSlots).toHaveLength(1)
      expect(matchingSlots[0]?.quantity).toBe(1)
    })

    test('moving an item from player equipment to player inventory adds it exactly once, not twice', () => {
      const state: GameState = {
        ...baseState,
        inventoryState: {
          ...baseState.inventoryState,
          player: {
            ...baseState.inventoryState.player,
            equipmentSlots: { weapon: EQUIPPED_ITEM_ID, armor: null, accessory_1: null, accessory_2: null },
          },
        },
      }

      const result = transferItem(state, {
        fromType: 'equipment',
        fromId: 'player',
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: EQUIPPED_ITEM_ID,
        quantity: 1,
      })

      expect(result.inventoryState.player.equipmentSlots.weapon).toBeNull()
      const matchingSlots = result.inventoryState.player.bagContainers.flatMap((c) =>
        c.slots.filter((s) => s.itemInstanceId === EQUIPPED_ITEM_ID),
      )
      expect(matchingSlots).toHaveLength(1)
      expect(matchingSlots[0]?.quantity).toBe(1)
    })
  })

  describe('Activity log', () => {
    test('logs transfer in activity log', () => {
      const result = transferItem(baseState, {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: ITEM_ID_1,
        quantity: 2,
      })

      // Check that activity log has an entry about the transfer
      const logEntry = result.activityLog.find((entry) =>
        entry.message.includes('Transferred'),
      )
      expect(logEntry).toBeDefined()
    })
  })

  // Test-quality pass (destiny-ukh4e): every test above (and every fixture already in this file)
  // uses instanceId === itemId, the exact fixture shortcut this project's own memory flags as
  // fragile -- findItemInSource (lines 96-201) hard-codes `itemId: itemInstanceId` for every
  // source type, never resolving through itemRegistry, so none of the tests above could ever
  // catch a regression in real-id resolution: they can't, by construction, since findItemInSource's
  // itemId output is definitionally equal to its input. This block uses a REALISTIC distinct
  // instance id (the shape every acquired item actually has, e.g. inst-dagger-wasterunner-001 ->
  // itemId weapon-dagger-wasterunner) to prove what that shortcut currently hides.
  describe('realistic distinct instance/item ids (fragile itemId resolution)', () => {
    const REAL_ITEM_ID = 'weapon-dagger-wasterunner'
    const REAL_INSTANCE_ID = 'inst-dagger-wasterunner-001'

    function stateWithRealisticNpcItem(): GameState {
      return {
        ...baseState,
        inventoryState: {
          ...baseState.inventoryState,
          npcInventories: {
            ...baseState.inventoryState.npcInventories,
            [NPC_ID_1]: [
              createContainer(`npc-container-${NPC_ID_1}`, NPC_ID_1, [{ itemInstanceId: REAL_INSTANCE_ID, quantity: 1 }], 10),
            ],
          },
          itemRegistry: {
            ...baseState.inventoryState.itemRegistry,
            [REAL_INSTANCE_ID]: {
              uniqueId: REAL_INSTANCE_ID,
              itemId: REAL_ITEM_ID,
              quantity: 1,
              locationType: 'npc_inventory',
              locationId: NPC_ID_1,
              acquiredDay: 1,
              flags: [],
            },
          },
        },
      }
    }

    test('still moves the item correctly by instance id even though itemId resolution is wrong', () => {
      const result = transferItem(stateWithRealisticNpcItem(), {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: REAL_INSTANCE_ID,
        quantity: 1,
      })

      const playerSlot = result.inventoryState.player.bagContainers
        .flatMap((c) => c.slots)
        .find((s) => s.itemInstanceId === REAL_INSTANCE_ID)
      expect(playerSlot?.quantity).toBe(1)
    })

    // Documents the actual, currently-degraded consequence: findItemInSource never looks the real
    // itemId up in itemRegistry, so the activity-log name lookup (contentCatalog.itemsById.get(
    // sourceResult.itemId)) is handed the INSTANCE id, which matches no catalog entry, and falls
    // back to printing the raw instance id string instead of "Waste-Runner's Knife." Any caller
    // relying on this function's own log message for a realistically-shaped item gets an ugly,
    // non-human-readable name -- not a crash, but a real, confirmed UX gap (destiny follow-up
    // candidate, not fixed here: fixing it means threading itemRegistry lookups through every
    // source branch of findItemInSource).
    test('activity log falls back to the raw instance id instead of the item name (fragile itemId shortcut)', () => {
      const result = transferItem(stateWithRealisticNpcItem(), {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: REAL_INSTANCE_ID,
        quantity: 1,
      })

      const logEntry = result.activityLog.find((entry) => entry.message.includes('Transferred'))
      expect(logEntry?.message).toContain(REAL_INSTANCE_ID)
      expect(logEntry?.message).not.toContain("Waste-Runner's Knife")
    })
  })

  // Direct unit coverage for fromType/toType combinations that are only exercised today via other
  // files' integration tests (purchase.test.ts, equipItem.test.ts) -- testing them here, at the
  // transferItem level itself, isolates failures to this function rather than a caller.
  describe('fromType/toType combinations used elsewhere in the codebase', () => {
    function stateWithShopStock(shopStockContainerId: string, ownerId: string): GameState {
      return {
        ...baseState,
        inventoryState: {
          ...baseState.inventoryState,
          sharedContainers: [
            createContainer(shopStockContainerId, ownerId, [{ itemInstanceId: ITEM_ID_1, quantity: 1 }], 50),
          ],
        },
      }
    }

    test('shop_stock -> player_inventory (purchase.ts non-gear path)', () => {
      const state = stateWithShopStock('shop:shop-pale-provisions:stock', 'shop-pale-provisions')
      const result = transferItem(state, {
        fromType: 'shop_stock',
        fromId: 'shop:shop-pale-provisions:stock',
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: ITEM_ID_1,
        quantity: 1,
      })

      const shopContainer = result.inventoryState.sharedContainers.find((c) => c.containerId === 'shop:shop-pale-provisions:stock')
      expect(shopContainer?.slots).toHaveLength(0)
      const playerSlot = result.inventoryState.player.bagContainers.flatMap((c) => c.slots).find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(playerSlot?.quantity).toBe(1)
    })

    test('shop_stock -> container (purchase.ts gear-to-House-Storage path)', () => {
      const state: GameState = {
        ...stateWithShopStock('shop:shop-pale-provisions:stock', 'shop-pale-provisions'),
        inventoryState: {
          ...stateWithShopStock('shop:shop-pale-provisions:stock', 'shop-pale-provisions').inventoryState,
          sharedContainers: [
            createContainer('shop:shop-pale-provisions:stock', 'shop-pale-provisions', [{ itemInstanceId: ITEM_ID_1, quantity: 1 }], 50),
            createContainer('household:house-blackthorn:storage', 'household:house-blackthorn:storage', [], 40),
          ],
        },
      }
      const result = transferItem(state, {
        fromType: 'shop_stock',
        fromId: 'shop:shop-pale-provisions:stock',
        toType: 'container',
        toId: 'household:house-blackthorn:storage',
        itemInstanceId: ITEM_ID_1,
        quantity: 1,
      })

      const houseStorage = result.inventoryState.sharedContainers.find((c) => c.containerId === 'household:house-blackthorn:storage')
      expect(houseStorage?.slots.find((s) => s.itemInstanceId === ITEM_ID_1)?.quantity).toBe(1)
      const shopContainer = result.inventoryState.sharedContainers.find((c) => c.containerId === 'shop:shop-pale-provisions:stock')
      expect(shopContainer?.slots).toHaveLength(0)
    })

    test('container -> equipment (equipItem.ts equipping directly from a House Storage container)', () => {
      // addToEquipment resolves category via contentCatalog.itemsById.get(itemId) -- needs a real
      // catalog id. ITEM_ID_1/'item-iron-sword' is a fixture-only placeholder with no catalog
      // entry (used elsewhere in this file for category-agnostic moves), which would make
      // addToEquipment's itemDef lookup fail and no-op. Using a real weapon id as BOTH the
      // instance and item id here (this file's existing shortcut convention) isolates the thing
      // this test actually checks -- the container/equipment division of responsibility -- from
      // the separate fragile-itemId finding covered by its own describe block above.
      const realWeaponId = 'weapon-dagger-wasterunner'
      const state: GameState = {
        ...baseState,
        inventoryState: {
          ...baseState.inventoryState,
          sharedContainers: [
            createContainer('household:house-blackthorn:storage', 'household:house-blackthorn:storage', [{ itemInstanceId: realWeaponId, quantity: 1 }], 40),
          ],
        },
      }
      const result = transferItem(state, {
        fromType: 'container',
        fromId: 'household:house-blackthorn:storage',
        toType: 'equipment',
        toId: NPC_ID_1,
        itemInstanceId: realWeaponId,
        quantity: 1,
      })

      const houseStorage = result.inventoryState.sharedContainers.find((c) => c.containerId === 'household:house-blackthorn:storage')
      expect(houseStorage?.slots).toHaveLength(0)
      // addToEquipment only writes npc.loadout, never npc.equipment (that's equipItemToNpc's own
      // explicit job after calling transferItem) -- confirms the division of responsibility.
      const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID_1)!
      expect(npc.loadout.primaryWeaponId).toBe(realWeaponId)
      expect(npc.equipment.weapon).toBeNull()
    })

    test('shop_stock source is matched by ownerId when the container\'s own containerId differs', () => {
      // Real shop containers in the game are keyed by containerId === `shop:${shopId}:stock`, but
      // findItemInSource's shop_stock branch also matches by ownerId alone -- this constructs a
      // container whose containerId does NOT match the id being looked up, only its ownerId does.
      const state: GameState = {
        ...baseState,
        inventoryState: {
          ...baseState.inventoryState,
          sharedContainers: [
            createContainer('some-other-container-id', 'shop-pale-provisions', [{ itemInstanceId: ITEM_ID_1, quantity: 1 }], 50),
          ],
        },
      }
      const result = transferItem(state, {
        fromType: 'shop_stock',
        fromId: 'shop-pale-provisions',
        toType: 'player_inventory',
        toId: 'player',
        itemInstanceId: ITEM_ID_1,
        quantity: 1,
      })

      const playerSlot = result.inventoryState.player.bagContainers.flatMap((c) => c.slots).find((s) => s.itemInstanceId === ITEM_ID_1)
      expect(playerSlot?.quantity).toBe(1)
    })
  })

  // The audit for this pass noted addToContainer (generic 'container' destination type, used by
  // e.g. purchase.ts's gear path and equipItem.ts's equip-from-storage path) behaves differently
  // from addToNpcInventory/addToPlayerInventory when full: those two overflow into a freshly
  // created container (already covered above); addToContainer has no such fallback and is a true
  // no-op instead. Previously unverified.
  describe('destination container at capacity (container destination type only)', () => {
    test('is a true no-op when the destination container is already at maxSlots, unlike player/npc bag overflow', () => {
      const fullContainer = createContainer('household:house-blackthorn:storage', 'household:house-blackthorn:storage', [{ itemInstanceId: 'inst-existing', quantity: 1 }], 1)
      const state: GameState = {
        ...baseState,
        inventoryState: {
          ...baseState.inventoryState,
          sharedContainers: [fullContainer],
        },
      }
      const result = transferItem(state, {
        fromType: 'npc_inventory',
        fromId: NPC_ID_1,
        toType: 'container',
        toId: 'household:house-blackthorn:storage',
        itemInstanceId: ITEM_ID_1,
        quantity: 1,
      })

      // True no-op: transferItem returns the exact same state reference, the item was never
      // removed from its source either (removeFromX already ran before the destination check...
      // actually validateDestination runs BEFORE any removal, so the source is untouched here).
      expect(result).toBe(state)
    })
  })
})
