import { describe, expect, it } from 'vitest'

import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { contentCatalog } from '../content/contentCatalog'
import { giftItemToNpc, resolveGiftOutcome } from './giftItem'

const TARGET_NPC_ID = 'npc-marion-vale'

function withGiftState(
  itemId: string,
  npcOverrides: Partial<NpcRuntimeState> = {},
  stateOverrides: Partial<GameState> = {},
): GameState {
  // Note: itemInstanceId is used as the key for both inventory lookup AND catalog lookup
  // So it must match the item definition ID in the catalog
  return {
    ...initialGameStateSnapshot,
    currentDistrictId: initialGameStateSnapshot.houseDistrictId,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [
          {
            containerId: 'bag-main',
            containerType: 'backpack',
            ownerId: 'player',
            maxSlots: 20,
            slots: [
              {
                slotId: `slot-${itemId}`,
                itemInstanceId: itemId, // Use itemId as instanceId for catalog lookup
                quantity: 1,
              },
            ],
            locked: false,
          },
        ],
      },
      // Keep sharedContainers from initial state (required for transferItem)
      sharedContainers: initialGameStateSnapshot.inventoryState.sharedContainers,
      // Add item registry entry for the gift item
      itemRegistry: {
        ...initialGameStateSnapshot.inventoryState.itemRegistry,
        [itemId]: {
          uniqueId: itemId,
          itemId,
          quantity: 1,
          locationType: 'player_inventory',
          locationId: 'player',
          acquiredDay: 1,
          acquiredFrom: 'player',
          flags: [],
        },
      },
      // Initialize NPC inventory container
      npcInventories: {
        ...initialGameStateSnapshot.inventoryState.npcInventories,
        [TARGET_NPC_ID]: [
          {
            containerId: `npc:${TARGET_NPC_ID}:inventory`,
            containerType: 'backpack',
            ownerId: TARGET_NPC_ID,
            maxSlots: 20,
            slots: [],
            locked: false,
          },
        ],
      },
    },
    roster: initialGameStateSnapshot.roster.map((npc) =>
      npc.npcId === TARGET_NPC_ID
        ? { ...npc, ...npcOverrides }
        : npc,
    ),
    ...stateOverrides,
  }
}

describe('resolveGiftOutcome', () => {
  it('rewards vanity on calling tokens', () => {
    const state = withGiftState('item-gift-calling-token')
    const npc = state.roster.find((entry) => entry.npcId === TARGET_NPC_ID)!
    npc.traits.vanity = 80
    npc.traits.prudence = 30
    const definition = contentCatalog.itemsById.get('item-gift-calling-token')!
    const outcome = resolveGiftOutcome(definition, npc)
    expect(outcome.respect).toBeGreaterThanOrEqual(outcome.affinity)
    expect(outcome.reaction).toContain('entrance')
  })

  it('boosts trust on personal gifts for empathetic NPCs', () => {
    const definition = contentCatalog.itemsById.get('item-gift-pressed-flower-fold')!
    const state = withGiftState('item-gift-pressed-flower-fold')
    const npc = state.roster.find((entry) => entry.npcId === TARGET_NPC_ID)!
    npc.traits.empathy = 82
    const outcome = resolveGiftOutcome(definition, npc)
    expect(outcome.trust).toBeGreaterThan(0)
    expect(outcome.reaction).toContain("I'll keep it")
  })

  it('lets prudence dampen ostentatious gifts', () => {
    const definition = contentCatalog.itemsById.get('item-gift-calling-token')!
    const state = withGiftState('item-gift-calling-token')
    const npc = state.roster.find((entry) => entry.npcId === TARGET_NPC_ID)!
    npc.traits.prudence = 85
    const outcome = resolveGiftOutcome(definition, npc)
    expect(outcome.trust).toBeLessThan(0)
    expect(outcome.reaction).toContain('Loud')
  })
})

describe('giftItemToNpc', () => {
  it('transfers the gift to NPC inventory, updates relationships, and logs the reaction', () => {
    const itemId = 'item-gift-pressed-flower-fold'
    const key = buildRelationshipKey('player', TARGET_NPC_ID)
    // Read before value before calling giftItemToNpc to avoid mutation issues
    const before = withGiftState(itemId).relationships[key] ?? {
      affinity: 0,
      respect: 0,
      fear: 0,
      trust: 0,
      loyalty: 0,
    }
    const next = giftItemToNpc(
      withGiftState(itemId, {
        traits: {
          ...initialGameStateSnapshot.roster.find((npc) => npc.npcId === TARGET_NPC_ID)!.traits,
          empathy: 82,
        },
      }),
      { instanceId: itemId, npcId: TARGET_NPC_ID },
    )

    // Check that the item was removed from player inventory
    const playerSlotCount = next.inventoryState.player.bagContainers.reduce((sum, c) => sum + c.slots.length, 0)
    expect(playerSlotCount).toBe(0)

    // Check that the item was added to NPC inventory
    const npcContainers = next.inventoryState.npcInventories[TARGET_NPC_ID] || []
    const npcSlots = npcContainers.flatMap((c) => c.slots)
    const giftedItemSlot = npcSlots.find((s) => s.itemInstanceId === itemId)
    expect(giftedItemSlot).toBeDefined()
    expect(giftedItemSlot?.quantity).toBe(1)

    // Check that relationships were updated
    const after = next.relationships[key]!
    const totalDelta =
      (after.affinity - before.affinity) +
      (after.respect - before.respect) +
      (after.trust - before.trust) +
      (after.loyalty - before.loyalty)
    expect(totalDelta).toBeGreaterThan(0)
    expect(next.activityLog[0]?.id.startsWith(`gift::${TARGET_NPC_ID}::item-gift-pressed-flower-fold`)).toBe(true)
  })

  it('does nothing when the NPC is not colocated with the player', () => {
    const state = withGiftState('item-gift-pressed-flower-fold', {}, { currentDistrictId: 'district-the-warrens' })
    const next = giftItemToNpc(state, { instanceId: 'item-gift-pressed-flower-fold', npcId: TARGET_NPC_ID })
    expect(next).toEqual(state)
  })
})
