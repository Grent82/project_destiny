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
    ...initialGameStateSnapshot.npcRuntimeStates[0]!,
    traits: {
      ...initialGameStateSnapshot.npcRuntimeStates[0]!.traits,
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
    npcRuntimeStates: [marion, ida],
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
    const ida = next.npcRuntimeStates.find((npc) => npc.npcId === 'npc-ida-rhys')!
    expect(ida.bondStatus).toBeNull()

    const relationship = next.relationships[buildRelationshipKey('player', 'npc-ida-rhys')]!
    expect(relationship.loyalty).toBe(25)
    expect(relationship.trust).toBe(20)

    const marion = next.npcRuntimeStates.find((npc) => npc.npcId === 'npc-marion-vale')!
    expect(marion.states.morale).toBe(71)
    expect(next.pendingEvents.some((event) => event.eventId === 'event-npc-freed')).toBe(true)
    expect(next.pendingEvents.find((event) => event.eventId === 'event-npc-freed')?.instanceId).toBeTruthy()
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
    state.npcRuntimeStates = state.npcRuntimeStates.map((npc) =>
      npc.npcId === 'npc-marion-vale'
        ? { ...npc, assignment: 'working' as const, traits: { ...npc.traits, empathy: 72 } }
        : npc,
    )

    const next = applyBondServiceEffects(state)
    const ida = next.npcRuntimeStates.find((npc) => npc.npcId === 'npc-ida-rhys')!
    const marion = next.npcRuntimeStates.find((npc) => npc.npcId === 'npc-marion-vale')!

    expect(ida.bondStatus?.alongsideFreeAssignmentDays).toBe(14)
    expect(ida.states.morale).toBe(56)
    expect(marion.states.morale).toBe(64)
    expect(next.factionStandings['faction-tallow-ring']).toBe(9)
    expect(next.cityDials.corruption).toBeGreaterThan(state.cityDials.corruption)
    expect(next.cityDials.prosperity).toBeLessThan(state.cityDials.prosperity)
    expect(next.pendingEvents.some((event) => event.eventId === 'event-bound-npc-notices-difference')).toBe(true)
    expect(
      next.pendingEvents.find((event) => event.eventId === 'event-bound-npc-notices-difference')?.instanceId,
    ).toBeTruthy()
  })

  it('forces high-empathy stewards and archivists to step down after a month of bond operations', () => {
    const state = withBoundNpc(
      {},
      {
        day: 28,
        npcRuntimeStates: withBoundNpc().npcRuntimeStates.map((npc) =>
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
    const marion = next.npcRuntimeStates.find((npc) => npc.npcId === 'npc-marion-vale')!

    expect(marion.activeTitle).toBeNull()
    expect(next.pendingEvents.some((event) => event.eventId === 'event-title-npc-bond-objection')).toBe(true)
    expect(
      next.pendingEvents.find((event) => event.eventId === 'event-title-npc-bond-objection')?.instanceId,
    ).toBeTruthy()
  })
})

describe('bond service end-of-day integration', () => {
  it('makes player-held bound workers wage-free and 20% more profitable than equivalent free workers', () => {
    const freeState = {
      ...withBoundNpc({
        bondStatus: null,
      }),
      npcRuntimeStates: withBoundNpc({
        bondStatus: null,
      }).npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? { ...npc, assignment: 'idle' as const }
          : npc,
      ),
    }

    const boundState = {
      ...withBoundNpc(),
      npcRuntimeStates: withBoundNpc().npcRuntimeStates.map((npc) =>
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
      npcRuntimeStates: [makeBondedNpc({}, { entryReason: 'combat-capture' as const })],
    })
    const voluntary = applyBondServiceEffects({
      ...initialGameStateSnapshot,
      playerCharacter: highDominancePlayer,
      npcRuntimeStates: [makeBondedNpc({}, { entryReason: 'voluntary' as const })],
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
      npcRuntimeStates: [highEmpathyNpc],
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
      npcRuntimeStates: [makeBondedNpc({}, { entryReason: 'combat-capture' as const })],
    })

    const npcId = idaRhysRosterEntry.npcId
    const npcMemory = result.npcRuntimeStates.find((n) => n.npcId === npcId)?.npcMemory ?? []
    // Combat-capture with high dominance → fearDelta >> 5, triggers writeNpcMemory auto + explicit
    const hasContractMemory = npcMemory.some((m) => m.event.includes('contract') || m.event.includes('chain'))
    expect(hasContractMemory).toBe(true)
  })

  it('voluntary long-term bond produces smaller fear than fresh combat-capture', () => {
    const voluntaryLongTerm = applyBondServiceEffects({
      ...initialGameStateSnapshot,
      npcRuntimeStates: [makeBondedNpc({}, { entryReason: 'voluntary' as const, alongsideFreeAssignmentDays: 28 })],
    })
    const combatCaptureFresh = applyBondServiceEffects({
      ...initialGameStateSnapshot,
      npcRuntimeStates: [makeBondedNpc({}, { entryReason: 'combat-capture' as const, alongsideFreeAssignmentDays: 0 })],
    })

    const npcId = idaRhysRosterEntry.npcId
    const volFear = voluntaryLongTerm.relationships[buildRelationshipKey(npcId, 'player')]?.fear ?? 0
    const ccFear = combatCaptureFresh.relationships[buildRelationshipKey(npcId, 'player')]?.fear ?? 0
    expect(volFear).toBeLessThan(ccFear)
  })
})

describe('applyBondHolderConsequences (via applyBondServiceEffects)', () => {
  function makeBondedRosterEntry(
    overrides: Partial<NpcRuntimeState> = {},
    bondOverrides: Record<string, unknown> = {},
  ): NpcRuntimeState {
    return {
      ...idaRhysRosterEntry,
      ...overrides,
      bondStatus: {
        holderId: 'player',
        contractValue: 80,
        termDays: 30,
        entryReason: 'debt-settlement' as const,
        alongsideFreeAssignmentDays: 0,
        lastEqualityNoticeDay: null,
        forSale: false,
        lastOfferDay: null,
        marketValue: 80,
        ownerType: 'player' as const,
        bondStartDay: 1,
        ...bondOverrides,
      },
    }
  }

  it('does not change state when no player-held bonds exist', () => {
    const result = applyBondServiceEffects(initialGameStateSnapshot)
    expect(result.playerCharacter.traits.ruthlessness).toBe(
      initialGameStateSnapshot.playerCharacter.traits.ruthlessness,
    )
    expect(result.playerCharacter.traits.dominance).toBe(
      initialGameStateSnapshot.playerCharacter.traits.dominance,
    )
  })

  it('applies ruthlessness drift when a coercive bond is held', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [makeBondedRosterEntry({}, { entryReason: 'combat-capture' })],
    }
    const before = state.playerCharacter.traits.ruthlessness
    const result = applyBondServiceEffects(state)
    expect(result.playerCharacter.traits.ruthlessness).toBe(before + 1)
  })

  it('does NOT apply ruthlessness drift for voluntary bonds', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [makeBondedRosterEntry({}, { entryReason: 'voluntary' })],
    }
    const before = state.playerCharacter.traits.ruthlessness
    const result = applyBondServiceEffects(state)
    expect(result.playerCharacter.traits.ruthlessness).toBe(before)
  })

  it('applies dominance drift when any player-held bond exists', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [makeBondedRosterEntry({}, { entryReason: 'inherited' })],
    }
    const before = state.playerCharacter.traits.dominance
    const result = applyBondServiceEffects(state)
    expect(result.playerCharacter.traits.dominance).toBe(before + 1)
  })

  it('appends charged log entry on HOLDER_LOG_INTERVAL days', () => {
    // day 7 should trigger the log (7 % 7 === 0)
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 7,
      npcRuntimeStates: [makeBondedRosterEntry()],
    }
    const before = state.activityLog.length
    const result = applyBondServiceEffects(state)
    const newEntries = result.activityLog.slice(before)
    const chargedEntry = newEntries.find((e) => e.message.includes('ledger'))
    expect(chargedEntry).toBeDefined()
  })

  it('does NOT append charged log entry on non-interval days', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 4,
      npcRuntimeStates: [makeBondedRosterEntry()],
    }
    const before = state.activityLog.length
    const result = applyBondServiceEffects(state)
    const newEntries = result.activityLog.slice(before)
    const chargedEntry = newEntries.find((e) => e.message.includes('ledger'))
    expect(chargedEntry).toBeUndefined()
  })

  it('raises unrest and reduces Gilded Court standing when 3+ bonds held', () => {
    const bond1 = makeBondedRosterEntry({ npcId: 'npc-1', name: 'One' })
    const bond2 = makeBondedRosterEntry({ npcId: 'npc-2', name: 'Two' })
    const bond3 = makeBondedRosterEntry({ npcId: 'npc-3', name: 'Three' })
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [bond1, bond2, bond3],
    }
    const beforeUnrest = state.cityDials.unrest
    const beforeGilded = state.factionStandings['faction-gilded-court'] ?? 0
    const result = applyBondServiceEffects(state)
    expect(result.cityDials.unrest).toBeGreaterThan(beforeUnrest)
    expect(result.factionStandings['faction-gilded-court'] ?? 0).toBeLessThan(beforeGilded)
  })

  it('does NOT affect city or Gilded Court when fewer than 3 bonds held', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [makeBondedRosterEntry()],
      factionStandings: { 'faction-gilded-court': 10 },
    }
    const beforeUnrest = state.cityDials.unrest
    const result = applyBondServiceEffects(state)
    expect(result.cityDials.unrest).toBe(beforeUnrest)
    expect(result.factionStandings['faction-gilded-court']).toBe(10)
  })
})
