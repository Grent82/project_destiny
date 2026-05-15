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
  return {
    ...initialGameStateSnapshot,
    currentDistrictId: initialGameStateSnapshot.houseDistrictId,
    ownedItems: [
      { instanceId: `gift-${itemId}`, itemId, location: 'inventory', quantity: 1 },
    ],
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
  it('removes the gift, updates relationships, and logs the reaction', () => {
    const next = giftItemToNpc(
      withGiftState('item-gift-pressed-flower-fold', {
        traits: {
          ...initialGameStateSnapshot.roster.find((npc) => npc.npcId === TARGET_NPC_ID)!.traits,
          empathy: 82,
        },
      }),
      { instanceId: 'gift-item-gift-pressed-flower-fold', npcId: TARGET_NPC_ID },
    )

    expect(next.ownedItems).toHaveLength(0)
    const key = buildRelationshipKey('player', TARGET_NPC_ID)
    const before = initialGameStateSnapshot.relationships[key] ?? {
      affinity: 0,
      respect: 0,
      fear: 0,
      trust: 0,
      loyalty: 0,
    }
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
    const next = giftItemToNpc(state, { instanceId: 'gift-item-gift-pressed-flower-fold', npcId: TARGET_NPC_ID })
    expect(next).toEqual(state)
  })
})
