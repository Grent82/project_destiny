import { describe, it, expect } from 'vitest'
import { npcTradeWithNpc, npcCanTradeWithNpc } from './npcTradeWithNpc'
import { initialStateWithIda, idaRhysRosterEntry } from '../testFixtures'
import type { GameState } from '../../../domain/game/contracts'
import type { InventoryContainer } from '../../../domain/inventory/contracts'

// Ida's highest non-combat skill is engineering (73) -> job-engineer -> wants a 'repair'-tagged item.
const ACTING_ID = idaRhysRosterEntry.npcId
const PARTNER_ID = 'npc-marion-vale'

function withNpcItem(state: GameState, npcId: string, itemId: string, uniqueId: string): GameState {
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

function withPersonalFunds(state: GameState, npcId: string, carriedCash: number, savings = 0): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) =>
      n.npcId === npcId ? { ...n, personalFunds: { ...n.personalFunds, carriedCash, savings } } : n,
    ),
  }
}

describe('npcCanTradeWithNpc', () => {
  it('is false with no matching partner item', () => {
    const npc = initialStateWithIda.npcRuntimeStates.find((n) => n.npcId === ACTING_ID)!
    expect(npcCanTradeWithNpc(initialStateWithIda, npc)).toBe(false)
  })

  it('is false when funds are insufficient even with a matching item present', () => {
    let state = withNpcItem(initialStateWithIda, PARTNER_ID, 'item-spare-parts', 'inst-spare-1')
    state = withPersonalFunds(state, ACTING_ID, 0, 0)
    const npc = state.npcRuntimeStates.find((n) => n.npcId === ACTING_ID)!
    expect(npcCanTradeWithNpc(state, npc)).toBe(false)
  })

  it('is true with a matching item and sufficient funds', () => {
    let state = withNpcItem(initialStateWithIda, PARTNER_ID, 'item-spare-parts', 'inst-spare-1')
    state = withPersonalFunds(state, ACTING_ID, 200, 0)
    const npc = state.npcRuntimeStates.find((n) => n.npcId === ACTING_ID)!
    expect(npcCanTradeWithNpc(state, npc)).toBe(true)
  })
})

describe('npcTradeWithNpc', () => {
  it('no-ops when no partner has a matching item', () => {
    const result = npcTradeWithNpc(initialStateWithIda, ACTING_ID)
    expect(result).toBe(initialStateWithIda)
  })

  it('transfers the item and moves money between the two NPCs', () => {
    let state = withNpcItem(initialStateWithIda, PARTNER_ID, 'item-spare-parts', 'inst-spare-1')
    state = withPersonalFunds(state, ACTING_ID, 200, 0)

    const actingBefore = state.npcRuntimeStates.find((n) => n.npcId === ACTING_ID)!.personalFunds.carriedCash
    const partnerBefore = state.npcRuntimeStates.find((n) => n.npcId === PARTNER_ID)!.personalFunds.carriedCash

    const result = npcTradeWithNpc(state, ACTING_ID)

    // Item moved from partner to acting NPC
    expect((result.inventoryState.npcInventories[PARTNER_ID] ?? []).flatMap((c) => c.slots)).toHaveLength(0)
    const actingSlots = (result.inventoryState.npcInventories[ACTING_ID] ?? []).flatMap((c) => c.slots)
    expect(actingSlots.some((s) => s.itemInstanceId === 'inst-spare-1')).toBe(true)

    // Money moved from acting to partner, no duplication (total conserved)
    const actingAfter = result.npcRuntimeStates.find((n) => n.npcId === ACTING_ID)!.personalFunds.carriedCash
    const partnerAfter = result.npcRuntimeStates.find((n) => n.npcId === PARTNER_ID)!.personalFunds.carriedCash
    expect(actingAfter).toBeLessThan(actingBefore)
    expect(partnerAfter).toBeGreaterThan(partnerBefore)
    expect((actingBefore - actingAfter)).toBe(partnerAfter - partnerBefore)

    expect(result.activityLog[0]!.message).toMatch(/buys .+ from .+ for \d+ marks/)
  })

  it('no-ops when funds are insufficient', () => {
    let state = withNpcItem(initialStateWithIda, PARTNER_ID, 'item-spare-parts', 'inst-spare-1')
    state = withPersonalFunds(state, ACTING_ID, 0, 0)

    const result = npcTradeWithNpc(state, ACTING_ID)
    expect(result).toBe(state)
  })
})
