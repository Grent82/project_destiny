import { describe, it, expect } from 'vitest'
import { promoteWardToRoster } from './promoteWardToRoster'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState, Ward } from '../../domain/game/contracts'

function wardBase(overrides: Partial<Ward>): Ward {
  return {
    wardId: 'ward-test',
    name: 'Lys',
    parentNpcId: null,
    parentNpcIds: [],
    origin: undefined,
    birthDay: 1,
    stage: 'young_adult',
    bondStatus: null,
    freedOnDay: null,
    promotedToNpcId: null,
    ...overrides,
  }
}

function stateWithWard(ward: Ward, dayOverride = 2000): GameState {
  return {
    ...initialGameStateSnapshot,
    day: dayOverride,
    wards: [ward],
  }
}

describe('promoteWardToRoster', () => {
  it('does nothing if ward is not young_adult', () => {
    const ward = wardBase({ stage: 'teenager' })
    const state = stateWithWard(ward)
    const result = promoteWardToRoster(state, 'ward-test', 'Lys', null)
    expect(result.roster.length).toBe(state.roster.length)
    expect(result.wards).toHaveLength(1)
  })

  it('does nothing if wardId not found', () => {
    const state = stateWithWard(wardBase({}))
    const result = promoteWardToRoster(state, 'ward-unknown', 'Lys', null)
    expect(result.roster.length).toBe(state.roster.length)
  })

  it('removes ward from wards array on promotion', () => {
    const state = stateWithWard(wardBase({}))
    const result = promoteWardToRoster(state, 'ward-test', 'Lys', null)
    expect(result.wards).toHaveLength(0)
  })

  it('adds a new NpcRuntimeState to the roster', () => {
    const state = stateWithWard(wardBase({}))
    const result = promoteWardToRoster(state, 'ward-test', 'Lys', null)
    expect(result.roster.length).toBe(state.roster.length + 1)
    const promoted = result.roster.find((n) => n.name === 'Lys')
    expect(promoted).toBeDefined()
  })

  it('promoted NPC has all trait values between 0 and 100', () => {
    const state = stateWithWard(wardBase({}))
    const result = promoteWardToRoster(state, 'ward-test', 'Lys', null)
    const promoted = result.roster.find((n) => n.name === 'Lys')!
    for (const val of Object.values(promoted.traits)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  it('applies combat apprenticeship skills', () => {
    const state = stateWithWard(wardBase({}))
    const result = promoteWardToRoster(state, 'ward-test', 'Lys', 'combat')
    const promoted = result.roster.find((n) => n.name === 'Lys')!
    expect(promoted.skills.melee).toBe(25)
    expect(promoted.skills.ranged).toBe(20)
  })

  it('uses parentNpcIds to look up parent traits', () => {
    // Marion Vale is on the starter roster
    const ward = wardBase({ parentNpcIds: ['npc-marion-vale'] })
    const state = stateWithWard(ward)
    const result = promoteWardToRoster(state, 'ward-test', 'Lys', null)
    const promoted = result.roster.find((n) => n.name === 'Lys')!
    // Should produce a valid NPC (parents found = non-default traits)
    expect(promoted).toBeDefined()
    expect(Object.keys(promoted.traits)).toHaveLength(10)
  })

  it('adds activity log entry', () => {
    const state = stateWithWard(wardBase({}))
    const result = promoteWardToRoster(state, 'ward-test', 'Lys', null)
    const entry = result.activityLog.find((e) => e.message.includes('Lys'))
    expect(entry).toBeDefined()
  })

  it('uses promotedToNpcId from ward if already set', () => {
    const ward = wardBase({ promotedToNpcId: 'npc-custom-id' })
    const state = stateWithWard(ward)
    const result = promoteWardToRoster(state, 'ward-test', 'Lys', null)
    const promoted = result.roster.find((n) => n.npcId === 'npc-custom-id')
    expect(promoted).toBeDefined()
  })

  it('advances rngSeed (deterministic)', () => {
    const state = stateWithWard(wardBase({}))
    const result = promoteWardToRoster(state, 'ward-test', 'Lys', null)
    expect(result.rngSeed).not.toBe(state.rngSeed)
  })
})
