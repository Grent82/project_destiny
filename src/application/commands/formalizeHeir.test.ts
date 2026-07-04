import { describe, it, expect } from 'vitest'
import { formalizeHeir } from './formalizeHeir'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { idaRhysRosterEntry } from './testFixtures'
import type { GameState, Heir } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

function heirBase(overrides: Partial<Heir>): Heir {
  return {
    id: 'heir-test',
    name: 'Cael',
    originStory: 'Blood of the house.',
    stage: 'adult',
    arrivalDay: 1,
    legitimacyStatus: 'recognized',
    birthContext: null,
    ...overrides,
  }
}

function stateWithHeir(heir: Heir, rosterOverride?: NpcRuntimeState[]): GameState {
  return {
    ...initialGameStateSnapshot,
    house: {
      ...initialGameStateSnapshot.house,
      houseHeirs: [heir],
    },
    npcRuntimeStates: rosterOverride ?? initialGameStateSnapshot.npcRuntimeStates,
  }
}

function makeFillerNpc(id: string): NpcRuntimeState {
  return {
    ...idaRhysRosterEntry,
    npcId: id,
    name: `Filler-${id}`,
  }
}

describe('formalizeHeir', () => {
  it('does nothing if heir stage is not adult', () => {
    const heir = heirBase({ stage: 'apprentice' })
    const state = stateWithHeir(heir)
    const result = formalizeHeir(state, 'heir-test')
    expect(result.npcRuntimeStates.length).toBe(state.npcRuntimeStates.length)
    expect(result.house.houseHeirs).toHaveLength(1)
  })

  it('does nothing if heirId not found', () => {
    const state = stateWithHeir(heirBase({}))
    const result = formalizeHeir(state, 'heir-unknown')
    expect(result.npcRuntimeStates.length).toBe(state.npcRuntimeStates.length)
    expect(result.house.houseHeirs).toHaveLength(1)
  })

  it('removes heir from houseHeirs on formalization', () => {
    const state = stateWithHeir(heirBase({}))
    const result = formalizeHeir(state, 'heir-test')
    expect(result.house.houseHeirs).toHaveLength(0)
  })

  it('adds a new NpcRuntimeState to the roster', () => {
    const state = stateWithHeir(heirBase({}))
    const result = formalizeHeir(state, 'heir-test')
    expect(result.npcRuntimeStates.length).toBe(state.npcRuntimeStates.length + 1)
    const added = result.npcRuntimeStates.find((n) => n.name === 'Cael')
    expect(added).toBeDefined()
  })

  it('adds activity log entry on formalization', () => {
    const state = stateWithHeir(heirBase({}))
    const result = formalizeHeir(state, 'heir-test')
    const entry = result.activityLog.find((e) => e.message.includes('Cael'))
    expect(entry).toBeDefined()
  })

  it('advances rngSeed on formalization', () => {
    const state = stateWithHeir(heirBase({}))
    const result = formalizeHeir(state, 'heir-test')
    expect(result.rngSeed).not.toBe(state.rngSeed)
  })

  it('logs capacity block and does not add NPC when roster is full', () => {
    // Renown=0 → 4 slots, rosterBonus=0 → capacity 4
    // Fill the roster with 4 NPCs (1 starting + 3 fillers)
    const fullRoster: NpcRuntimeState[] = [
      ...initialGameStateSnapshot.npcRuntimeStates,
      makeFillerNpc('filler-1'),
      makeFillerNpc('filler-2'),
      makeFillerNpc('filler-3'),
    ]
    const state = stateWithHeir(heirBase({}), fullRoster)
    const result = formalizeHeir(state, 'heir-test')
    // Heir should NOT be added to the roster
    expect(result.npcRuntimeStates.length).toBe(4)
    // Heir should remain in houseHeirs
    expect(result.house.houseHeirs).toHaveLength(1)
    // Activity log should explain why
    const entry = result.activityLog.find((e) => e.message.includes('no room'))
    expect(entry).toBeDefined()
    expect(entry?.message).toContain('Cael')
  })
})
