import { describe, expect, it } from 'vitest'

import type { GameState, NpcRuntimeState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { gameSliceReducer, gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { endDay } from './endDay'
import { applyBondServiceEffects } from './bondService'
import { idaRhysRosterEntry } from './testFixtures'

function withBoundNpc(
  npcOverrides: Partial<NpcRuntimeState> = {},
  stateOverrides: Partial<GameState> = {},
): GameState {
  const marion = {
    ...initialGameStateSnapshot.roster[0]!,
    traits: {
      ...initialGameStateSnapshot.roster[0]!.traits,
      empathy: 72,
    },
  }

  const ida = {
    ...idaRhysRosterEntry,
    assignment: 'working' as const,
    bondStatus: {
      holderId: 'player',
      contractValue: 40,
      termDays: 30,
      entryReason: 'debt-settlement' as const,
      alongsideFreeAssignmentDays: 0,
      lastEqualityNoticeDay: null,
      forSale: false,
      lastOfferDay: null,
      marketValue: 0,
      ownerType: 'player' as const,
      bondStartDay: 0,
    },
    ...npcOverrides,
  }

  return {
    ...initialGameStateSnapshot,
    money: 120,
    factionStandings: {
      ...initialGameStateSnapshot.factionStandings,
      'faction-tallow-ring': 10,
    },
    roster: [marion, ida],
    ...stateOverrides,
  }
}

describe('freeNpc', () => {
  it('deducts the buyout, clears bondStatus, boosts trust and loyalty, and queues the release event', () => {
    const next = gameSliceReducer(
      withBoundNpc(),
      gameActions.freeNpc({ npcId: 'npc-ida-rhys' }),
    )

    expect(next.money).toBe(80)
    const ida = next.roster.find((npc) => npc.npcId === 'npc-ida-rhys')!
    expect(ida.bondStatus).toBeNull()

    const relationship = next.relationships[buildRelationshipKey('player', 'npc-ida-rhys')]!
    expect(relationship.loyalty).toBe(25)
    expect(relationship.trust).toBe(20)

    const marion = next.roster.find((npc) => npc.npcId === 'npc-marion-vale')!
    expect(marion.states.morale).toBe(71)
    expect(next.pendingEvents.some((event) => event.eventId === 'event-npc-freed')).toBe(true)
  })
})

describe('applyBondServiceEffects', () => {
  it('tracks alongside-free work, fires the equality notice, and applies monthly morale and standing costs', () => {
    const state = withBoundNpc({
      bondStatus: {
        holderId: 'player',
        contractValue: 40,
        termDays: 30,
        entryReason: 'debt-settlement' as const,
        alongsideFreeAssignmentDays: 13,
        lastEqualityNoticeDay: null,
        forSale: false,
        lastOfferDay: null,
        marketValue: 0,
        ownerType: 'player' as const,
        bondStartDay: 0,
      },
    })
    state.day = 28
    state.roster = state.roster.map((npc) =>
      npc.npcId === 'npc-marion-vale'
        ? { ...npc, assignment: 'working' as const, traits: { ...npc.traits, empathy: 72 } }
        : npc,
    )

    const next = applyBondServiceEffects(state)
    const ida = next.roster.find((npc) => npc.npcId === 'npc-ida-rhys')!
    const marion = next.roster.find((npc) => npc.npcId === 'npc-marion-vale')!

    expect(ida.bondStatus?.alongsideFreeAssignmentDays).toBe(14)
    expect(ida.states.morale).toBe(56)
    expect(marion.states.morale).toBe(64)
    expect(next.factionStandings['faction-tallow-ring']).toBe(9)
    expect(next.cityDials.corruption).toBeGreaterThan(state.cityDials.corruption)
    expect(next.cityDials.prosperity).toBeLessThan(state.cityDials.prosperity)
    expect(next.pendingEvents.some((event) => event.eventId === 'event-bound-npc-notices-difference')).toBe(true)
  })

  it('forces high-empathy stewards and archivists to step down after a month of bond operations', () => {
    const state = withBoundNpc(
      {},
      {
        day: 28,
        roster: withBoundNpc().roster.map((npc) =>
          npc.npcId === 'npc-marion-vale'
            ? {
                ...npc,
                activeTitle: 'title-steward',
                traits: { ...npc.traits, empathy: 80 },
              }
            : npc,
        ),
      },
    )

    const next = applyBondServiceEffects(state)
    const marion = next.roster.find((npc) => npc.npcId === 'npc-marion-vale')!

    expect(marion.activeTitle).toBeNull()
    expect(next.pendingEvents.some((event) => event.eventId === 'event-title-npc-bond-objection')).toBe(true)
  })
})

describe('bond service end-of-day integration', () => {
  it('makes player-held bound workers wage-free and 20% more profitable than equivalent free workers', () => {
    const freeState = {
      ...withBoundNpc({
        bondStatus: null,
      }),
      roster: withBoundNpc({
        bondStatus: null,
      }).roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? { ...npc, assignment: 'idle' as const }
          : npc,
      ),
    }

    const boundState = {
      ...withBoundNpc(),
      roster: withBoundNpc().roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? { ...npc, assignment: 'idle' as const }
          : npc,
      ),
    }

    const freeNext = endDay(freeState)
    const boundNext = endDay(boundState)

    expect(boundNext.money).toBeGreaterThan(freeNext.money)
    expect(boundNext.money - freeNext.money).toBe(14)
  })
})

describe('applyBondHolderPowerDynamics (via applyBondServiceEffects)', () => {
  function makeBondedNpc(
    npcOverrides: Partial<NpcRuntimeState> = {},
    bondOverrides: Partial<NpcRuntimeState['bondStatus']> = {},
  ): NpcRuntimeState {
    return {
      ...idaRhysRosterEntry,
      assignment: 'idle' as const,
      bondStatus: {
        holderId: 'player',
        contractValue: 40,
        termDays: 30,
        entryReason: 'debt-settlement' as const,
        alongsideFreeAssignmentDays: 0,
        lastEqualityNoticeDay: null,
        forSale: false,
        lastOfferDay: null,
        marketValue: 0,
        ownerType: 'player' as const,
        bondStartDay: 0,
        ...bondOverrides,
      },
      ...npcOverrides,
    }
  }

  it('combat-capture bond produces larger fear delta than voluntary bond', () => {
    const highDominancePlayer = {
      ...initialGameStateSnapshot.playerCharacter,
      traits: { ...initialGameStateSnapshot.playerCharacter.traits, dominance: 80 },
    }

    const combatCapture = applyBondServiceEffects({
      ...initialGameStateSnapshot,
      playerCharacter: highDominancePlayer,
      roster: [makeBondedNpc({}, { entryReason: 'combat-capture' as const })],
    })
    const voluntary = applyBondServiceEffects({
      ...initialGameStateSnapshot,
      playerCharacter: highDominancePlayer,
      roster: [makeBondedNpc({}, { entryReason: 'voluntary' as const })],
    })

    const npcId = idaRhysRosterEntry.npcId
    const ccFear = combatCapture.relationships[buildRelationshipKey(npcId, 'player')]?.fear ?? 0
    const volFear = voluntary.relationships[buildRelationshipKey(npcId, 'player')]?.fear ?? 0
    expect(ccFear).toBeGreaterThan(volFear)
  })

  it('bonded NPC with empathy > 60 produces negative affinity drift on player→npc edge', () => {
    const highEmpathyNpc = makeBondedNpc({ traits: { ...idaRhysRosterEntry.traits, empathy: 70 } })

    const result = applyBondServiceEffects({
      ...initialGameStateSnapshot,
      roster: [highEmpathyNpc],
    })

    const npcId = idaRhysRosterEntry.npcId
    const affinity = result.relationships[buildRelationshipKey('player', npcId)]?.affinity ?? 0
    expect(affinity).toBeLessThan(0)
  })

  it('memory write occurs on both directed sides when |fear delta| > 5', () => {
    const highDominancePlayer = {
      ...initialGameStateSnapshot.playerCharacter,
      traits: { ...initialGameStateSnapshot.playerCharacter.traits, dominance: 80 },
    }

    const result = applyBondServiceEffects({
      ...initialGameStateSnapshot,
      playerCharacter: highDominancePlayer,
      roster: [makeBondedNpc({}, { entryReason: 'combat-capture' as const })],
    })

    const npcId = idaRhysRosterEntry.npcId
    const npcMemory = result.roster.find((n) => n.npcId === npcId)?.npcMemory ?? []
    // Combat-capture with high dominance → fearDelta >> 5, triggers writeNpcMemory auto + explicit
    const hasContractMemory = npcMemory.some((m) => m.event.includes('contract') || m.event.includes('chain'))
    expect(hasContractMemory).toBe(true)
  })

  it('voluntary long-term bond produces smaller fear than fresh combat-capture', () => {
    const voluntaryLongTerm = applyBondServiceEffects({
      ...initialGameStateSnapshot,
      roster: [makeBondedNpc({}, { entryReason: 'voluntary' as const, alongsideFreeAssignmentDays: 28 })],
    })
    const combatCaptureFresh = applyBondServiceEffects({
      ...initialGameStateSnapshot,
      roster: [makeBondedNpc({}, { entryReason: 'combat-capture' as const, alongsideFreeAssignmentDays: 0 })],
    })

    const npcId = idaRhysRosterEntry.npcId
    const volFear = voluntaryLongTerm.relationships[buildRelationshipKey(npcId, 'player')]?.fear ?? 0
    const ccFear = combatCaptureFresh.relationships[buildRelationshipKey(npcId, 'player')]?.fear ?? 0
    expect(volFear).toBeLessThan(ccFear)
  })
})
