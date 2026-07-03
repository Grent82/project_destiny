import { describe, it, expect } from 'vitest'
import {
  npcConsolidatePower,
  npcChallengeAuthority,
  npcSocialize,
  npcGossip,
  npcMediateConflict,
} from './npcLeadershipActions'
import { initialStateWithIda, idaRhysRosterEntry } from './testFixtures'
import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

const NPC_ID = idaRhysRosterEntry.npcId

function withNpcOverrides(state: GameState, npcId: string, overrides: Partial<NpcRuntimeState>): GameState {
  return {
    ...state,
    roster: state.roster.map((n) => (n.npcId === npcId ? { ...n, ...overrides } : n)),
  }
}

describe('npcConsolidatePower', () => {
  it('increases the NPC\'s own faction standing when they have a personal faction relationship', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, {
      factionRelationships: [{ factionId: 'faction-test', standing: 10 }],
    })
    const result = npcConsolidatePower(state, NPC_ID)
    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
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
    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.factionRelationships[0]!.standing).toBeLessThan(10)
    expect(npc.states.morale).toBeGreaterThan(idaRhysRosterEntry.states.morale)
  })
})

describe('npcSocialize', () => {
  it('increases affinity and trust between actor and target', () => {
    const result = npcSocialize(initialStateWithIda, NPC_ID)
    const marionId = initialStateWithIda.roster[0]!.npcId
    const rel = result.relationships[`${NPC_ID}-to-${marionId}`]
    expect(rel?.affinity ?? 0).toBeGreaterThan(0)
    expect(rel?.trust ?? 0).toBeGreaterThan(0)
  })

  it('no-ops when there is no other idle NPC', () => {
    const state: GameState = { ...initialStateWithIda, roster: [initialStateWithIda.roster.find((n) => n.npcId === NPC_ID)!] }
    const result = npcSocialize(state, NPC_ID)
    expect(result).toBe(state)
  })
})

describe('npcGossip', () => {
  it('increases affinity slightly between actor and target', () => {
    const result = npcGossip(initialStateWithIda, NPC_ID)
    const marionId = initialStateWithIda.roster[0]!.npcId
    const rel = result.relationships[`${NPC_ID}-to-${marionId}`]
    expect(rel?.affinity ?? 0).toBeGreaterThan(0)
  })
})

describe('npcMediateConflict', () => {
  it('improves affinity between the two idle NPCs with the worst relationship', () => {
    let state = initialStateWithIda
    const marionId = state.roster[0]!.npcId
    state = {
      ...state,
      relationships: {
        ...state.relationships,
        [`${marionId}-to-${NPC_ID}`]: { affinity: -20, respect: 0, fear: 0, trust: 0, loyalty: 0 },
        [`${NPC_ID}-to-${marionId}`]: { affinity: -20, respect: 0, fear: 0, trust: 0, loyalty: 0 },
      },
      roster: [
        state.roster[0]!,
        { ...state.roster[1]!, assignment: 'idle' as const },
      ],
    }
    // add a third NPC as the mediator
    state = { ...state, roster: [...state.roster, { ...idaRhysRosterEntry, npcId: 'npc-mediator', name: 'Mediator', assignment: 'idle' as const }] }

    const result = npcMediateConflict(state, 'npc-mediator')

    const rel = result.relationships[`${marionId}-to-${NPC_ID}`]
    expect(rel?.affinity ?? 0).toBeGreaterThan(-20)
  })

  it('no-ops when no idle pair has a negative relationship', () => {
    const result = npcMediateConflict(initialStateWithIda, NPC_ID)
    expect(result).toBe(initialStateWithIda)
  })
})
