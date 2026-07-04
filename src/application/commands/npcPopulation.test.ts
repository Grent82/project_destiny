import { describe, it, expect } from 'vitest'
import { findNpc, updateNpc, selectAllNpcs, selectRosterNpcs } from './npcPopulation'
import { initialStateWithIda, idaRhysRosterEntry } from './testFixtures'
import type { GameState } from '../../domain/game/contracts'

const IDA = idaRhysRosterEntry.npcId

/** A non-player-roster person (e.g. a world NPC) sharing the same list — used to prove the discriminator. */
function withWorldPerson(state: GameState): GameState {
  return {
    ...state,
    roster: [
      ...state.roster,
      { ...idaRhysRosterEntry, npcId: 'npc-world-1', name: 'World One', npcType: 'world', playerRosterMember: false },
    ],
  }
}

describe('findNpc', () => {
  it('finds a runtime NPC by id', () => {
    expect(findNpc(initialStateWithIda, IDA)?.npcId).toBe(IDA)
  })

  it('returns undefined for an unknown id', () => {
    expect(findNpc(initialStateWithIda, 'npc-nope')).toBeUndefined()
  })
})

describe('updateNpc', () => {
  it('immutably updates the matching NPC and does not mutate the input state', () => {
    const before = initialStateWithIda
    const beforeStress = findNpc(before, IDA)!.states.stress

    const after = updateNpc(before, IDA, (n) => ({ ...n, states: { ...n.states, stress: n.states.stress + 5 } }))

    expect(findNpc(after, IDA)!.states.stress).toBe(beforeStress + 5)
    // Input untouched (new references, no mutation).
    expect(findNpc(before, IDA)!.states.stress).toBe(beforeStress)
    expect(after).not.toBe(before)
    expect(after.roster).not.toBe(before.roster)
  })

  it('leaves other NPCs untouched', () => {
    const state = withWorldPerson(initialStateWithIda)
    const after = updateNpc(state, IDA, (n) => ({ ...n, name: 'Renamed' }))
    expect(findNpc(after, 'npc-world-1')!.name).toBe('World One')
  })

  it('returns state with unchanged roster content when the id is absent', () => {
    const after = updateNpc(initialStateWithIda, 'npc-nope', (n) => ({ ...n, name: 'X' }))
    expect(after.roster.map((n) => n.npcId)).toEqual(initialStateWithIda.roster.map((n) => n.npcId))
    expect(after.roster.map((n) => n.name)).toEqual(initialStateWithIda.roster.map((n) => n.name))
  })
})

describe('selectAllNpcs vs selectRosterNpcs', () => {
  it('selectAllNpcs returns every person, incl. non-roster members', () => {
    const state = withWorldPerson(initialStateWithIda)
    const ids = selectAllNpcs(state).map((n) => n.npcId)
    expect(ids).toContain(IDA)
    expect(ids).toContain('npc-world-1')
  })

  it('selectRosterNpcs returns only player-roster members (keyed on playerRosterMember, not npcType)', () => {
    const state = withWorldPerson(initialStateWithIda)
    const ids = selectRosterNpcs(state).map((n) => n.npcId)
    expect(ids).toContain(IDA)
    expect(ids).not.toContain('npc-world-1')
  })
})
