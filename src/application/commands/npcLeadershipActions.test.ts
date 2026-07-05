import { describe, it, expect } from 'vitest'
import {
  npcConsolidatePower,
  npcChallengeAuthority,
  npcSocialize,
  npcGossip,
  npcMediateConflict,
} from './npcLeadershipActions'
import { initialStateWithIda, idaRhysRosterEntry, worldNpcRuntimeEntry } from './testFixtures'
import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

const NPC_ID = idaRhysRosterEntry.npcId

function withNpcOverrides(state: GameState, npcId: string, overrides: Partial<NpcRuntimeState>): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) => (n.npcId === npcId ? { ...n, ...overrides } : n)),
  }
}

describe('npcConsolidatePower', () => {
  it('increases the NPC\'s own faction standing when they have a personal faction relationship', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, {
      factionRelationships: [{ factionId: 'faction-test', standing: 10 }],
    })
    const result = npcConsolidatePower(state, NPC_ID)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.factionRelationships[0]!.standing).toBeGreaterThan(10)
  })

  it('falls back to the assigned district\'s controlling faction (global factionStandings) when there is no personal relationship', () => {
    // district-harbor has a controllingFactionId (faction-civic-compact); district-the-pale does not.
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, { assignedDistrictId: 'district-harbor' })
    const result = npcConsolidatePower(state, NPC_ID)
    // Whatever the district's controlling faction is, some entry in factionStandings should have moved up.
    const changed = Object.entries(result.factionStandings).some(([id, v]) => v > (state.factionStandings[id] ?? 0))
    expect(changed).toBe(true)
  })

  it('no-ops when there is no personal relationship and no district assigned', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, { assignedDistrictId: null, factionRelationships: [] })
    const result = npcConsolidatePower(state, NPC_ID)
    expect(result).toBe(state)
  })
})

describe('npcChallengeAuthority', () => {
  it('decreases the NPC\'s own faction standing and boosts their morale', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, {
      factionRelationships: [{ factionId: 'faction-test', standing: 10 }],
    })
    const result = npcChallengeAuthority(state, NPC_ID)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.factionRelationships[0]!.standing).toBeLessThan(10)
    expect(npc.states.morale).toBeGreaterThan(idaRhysRosterEntry.states.morale)
  })
})

describe('npcSocialize', () => {
  it('increases affinity and trust between actor and target', () => {
    const result = npcSocialize(initialStateWithIda, NPC_ID)
    const marionId = initialStateWithIda.npcRuntimeStates[0]!.npcId
    const rel = result.relationships[`${NPC_ID}-to-${marionId}`]
    expect(rel?.affinity ?? 0).toBeGreaterThan(0)
    expect(rel?.trust ?? 0).toBeGreaterThan(0)
  })

  it('resolves a roster<->World social interaction (destiny-rama.11 — target selection deliberately reaches across the whole population)', () => {
    const worldNeighbor = worldNpcRuntimeEntry('npc-test-world-social', { assignment: 'idle' })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [initialStateWithIda.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!, worldNeighbor],
    }
    const result = npcSocialize(state, NPC_ID)
    const rel = result.relationships[`${NPC_ID}-to-npc-test-world-social`]
    expect(rel?.affinity ?? 0).toBeGreaterThan(0)
    expect(rel?.trust ?? 0).toBeGreaterThan(0)
  })

  it('no-ops when there is no other idle NPC', () => {
    const state: GameState = { ...initialStateWithIda, npcRuntimeStates: [initialStateWithIda.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!] }
    const result = npcSocialize(state, NPC_ID)
    expect(result).toBe(state)
  })

  it('never targets a captive person, even one with a stronger affinity than any free NPC (destiny-rama.11 regression)', () => {
    const captive = worldNpcRuntimeEntry('npc-test-captive', {
      assignment: 'idle',
      captivityState: {
        status: 'captive', holderId: null, siteId: null, roomId: null, regime: 'unknown',
        condition: 'healthy', compliance: 'resistant', bondType: 'none', timeHeldDays: 1,
        lastTransferDay: null, questTag: null, confiscatedItems: [], confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, captive],
      relationships: {
        ...initialStateWithIda.relationships,
        [`${NPC_ID}-to-npc-test-captive`]: { affinity: 90, respect: 0, fear: 0, trust: 0, loyalty: 0 },
      },
    }
    const result = npcSocialize(state, NPC_ID)
    // The captive must not be the one socialized with, despite having by far the highest affinity.
    const captiveRel = result.relationships[`${NPC_ID}-to-npc-test-captive`]
    expect(captiveRel?.affinity).toBe(90) // unchanged
  })
})

describe('npcGossip', () => {
  it('increases affinity slightly between actor and target', () => {
    const result = npcGossip(initialStateWithIda, NPC_ID)
    const marionId = initialStateWithIda.npcRuntimeStates[0]!.npcId
    const rel = result.relationships[`${NPC_ID}-to-${marionId}`]
    expect(rel?.affinity ?? 0).toBeGreaterThan(0)
  })
})

describe('npcMediateConflict', () => {
  it('improves affinity between the two idle NPCs with the worst relationship', () => {
    let state = initialStateWithIda
    const marionId = state.npcRuntimeStates[0]!.npcId
    state = {
      ...state,
      relationships: {
        ...state.relationships,
        [`${marionId}-to-${NPC_ID}`]: { affinity: -20, respect: 0, fear: 0, trust: 0, loyalty: 0 },
        [`${NPC_ID}-to-${marionId}`]: { affinity: -20, respect: 0, fear: 0, trust: 0, loyalty: 0 },
      },
      npcRuntimeStates: [
        state.npcRuntimeStates[0]!,
        { ...state.npcRuntimeStates[1]!, assignment: 'idle' as const },
      ],
    }
    // add a third NPC as the mediator
    state = { ...state, npcRuntimeStates: [...state.npcRuntimeStates, { ...idaRhysRosterEntry, npcId: 'npc-mediator', name: 'Mediator', assignment: 'idle' as const }] }

    const result = npcMediateConflict(state, 'npc-mediator')

    const rel = result.relationships[`${marionId}-to-${NPC_ID}`]
    expect(rel?.affinity ?? 0).toBeGreaterThan(-20)
  })

  it('no-ops when no idle pair has a negative relationship', () => {
    const result = npcMediateConflict(initialStateWithIda, NPC_ID)
    expect(result).toBe(initialStateWithIda)
  })

  it('a World mediator eases tension between two OTHER World NPCs, not roster members (destiny-rama.11 — mediate-conflict is WORLD_ELIGIBLE, so this must resolve to something for a World actor)', () => {
    const worldA = worldNpcRuntimeEntry('npc-test-world-a', { assignment: 'idle' })
    const worldB = worldNpcRuntimeEntry('npc-test-world-b', { assignment: 'idle' })
    const worldMediator = worldNpcRuntimeEntry('npc-test-world-mediator', { assignment: 'idle' })

    const state: GameState = {
      ...initialStateWithIda,
      // Roster pair also has a negative relationship — must be left alone by a World mediator.
      relationships: {
        ...initialStateWithIda.relationships,
        [`${initialStateWithIda.npcRuntimeStates[0]!.npcId}-to-${NPC_ID}`]: { affinity: -30, respect: 0, fear: 0, trust: 0, loyalty: 0 },
        [`${NPC_ID}-to-${initialStateWithIda.npcRuntimeStates[0]!.npcId}`]: { affinity: -30, respect: 0, fear: 0, trust: 0, loyalty: 0 },
        'npc-test-world-a-to-npc-test-world-b': { affinity: -20, respect: 0, fear: 0, trust: 0, loyalty: 0 },
        'npc-test-world-b-to-npc-test-world-a': { affinity: -20, respect: 0, fear: 0, trust: 0, loyalty: 0 },
      },
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, worldA, worldB, worldMediator],
    }

    const result = npcMediateConflict(state, 'npc-test-world-mediator')

    const worldRel = result.relationships['npc-test-world-a-to-npc-test-world-b']
    expect(worldRel?.affinity ?? -20).toBeGreaterThan(-20)
    // The roster pair's conflict must be untouched — a World mediator only reaches World persons.
    const rosterRel = result.relationships[`${initialStateWithIda.npcRuntimeStates[0]!.npcId}-to-${NPC_ID}`]
    expect(rosterRel?.affinity).toBe(-30)
  })
})
