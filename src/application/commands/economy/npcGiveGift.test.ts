import { describe, it, expect } from 'vitest'
import { npcGiveGift, npcCanGiveGift } from './npcGiveGift'
import { initialStateWithIda, idaRhysRosterEntry } from '../testFixtures'
import type { GameState } from '../../../domain/game/contracts'
import type { InventoryContainer } from '../../../domain/inventory/contracts'
import { buildRelationshipKey } from '../../../domain/relationships/contracts'

const GIVER_ID = idaRhysRosterEntry.npcId // 'npc-ida-rhys'
const TARGET_ID = 'npc-marion-vale'

function withGiftItem(state: GameState, npcId: string, itemId = 'item-gift-pressed-flower-fold', uniqueId = 'inst-gift-1'): GameState {
  const container: InventoryContainer = {
    containerId: `container-${npcId}`,
    containerType: 'satchel',
    ownerId: npcId,
    maxSlots: 5,
    slots: [{ slotId: `slot-${uniqueId}`, itemInstanceId: uniqueId, quantity: 1 }],
    locked: false,
  }
  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: { ...state.inventoryState.npcInventories, [npcId]: [container] },
      itemRegistry: {
        ...state.inventoryState.itemRegistry,
        [uniqueId]: {
          uniqueId,
          itemId,
          quantity: 1,
          locationType: 'npc_inventory',
          locationId: npcId,
          acquiredDay: 1,
          flags: [],
        },
      },
    },
  }
}

describe('npcCanGiveGift', () => {
  it('is false with no gift item', () => {
    const npc = initialStateWithIda.npcRuntimeStates.find((n) => n.npcId === GIVER_ID)!
    expect(npcCanGiveGift(initialStateWithIda, npc)).toBe(false)
  })

  it('is true with a gift item and a co-located roster target', () => {
    const state = withGiftItem(initialStateWithIda, GIVER_ID)
    const npc = state.npcRuntimeStates.find((n) => n.npcId === GIVER_ID)!
    expect(npcCanGiveGift(state, npc)).toBe(true)
  })
})

describe('npcGiveGift', () => {
  it('no-ops when the NPC has no gift item', () => {
    const result = npcGiveGift(initialStateWithIda, GIVER_ID)
    expect(result).toBe(initialStateWithIda)
  })

  it('transfers a gift item to the highest-affinity co-located roster target and applies relationship deltas', () => {
    const state = withGiftItem(initialStateWithIda, GIVER_ID)
    const key = buildRelationshipKey(GIVER_ID, TARGET_ID)
    const before = state.relationships[key] ?? { affinity: 0, respect: 0, trust: 0, loyalty: 0, fear: 0, anger: 0 }

    const result = npcGiveGift(state, GIVER_ID)

    // Item moved out of giver's inventory
    expect(result.inventoryState.npcInventories[GIVER_ID]!.flatMap((c) => c.slots)).toHaveLength(0)
    // Item landed in target's inventory
    const targetSlots = (result.inventoryState.npcInventories[TARGET_ID] ?? []).flatMap((c) => c.slots)
    expect(targetSlots.some((s) => s.itemInstanceId === 'inst-gift-1')).toBe(true)

    const after = result.relationships[key]!
    const totalDelta =
      (after.affinity - before.affinity) + (after.respect - before.respect) + (after.trust - before.trust) + (after.loyalty - before.loyalty)
    expect(totalDelta).toBeGreaterThan(0)
    expect(result.activityLog[0]!.message).toMatch(/gave .+ to /i)
  })

  it('no-ops when no other roster NPC is co-located', () => {
    let state = withGiftItem(initialStateWithIda, GIVER_ID)
    state = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((n) =>
        n.npcId === TARGET_ID ? { ...n, assignedDistrictId: 'district-the-warrens' } : n,
      ),
    }
    const result = npcGiveGift(state, GIVER_ID)
    expect(result).toBe(state)
  })
})
