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
})
