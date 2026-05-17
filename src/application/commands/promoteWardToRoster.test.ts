import { describe, it, expect } from 'vitest'
import { promoteWardToRoster } from './promoteWardToRoster'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { idaRhysRosterEntry } from './testFixtures'
import type { GameState, Ward } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

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

  it('logs capacity block and does not promote when roster is full', () => {
    // Renown=0 → 4 slots, rosterBonus=0 → capacity 4
    // Fill with 4 NPCs (1 starting + 3 fillers)
    const fillerNpc = (id: string): NpcRuntimeState => ({
      ...idaRhysRosterEntry,
      npcId: id,
      name: `Filler-${id}`,
    })
    const fullRoster: NpcRuntimeState[] = [
      ...initialGameStateSnapshot.roster,
      fillerNpc('filler-1'),
      fillerNpc('filler-2'),
      fillerNpc('filler-3'),
    ]
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 2000,
      wards: [wardBase({})],
      roster: fullRoster,
    }
    const result = promoteWardToRoster(state, 'ward-test', 'Lys', null)
    // Ward should NOT be added to the roster
    expect(result.roster.length).toBe(4)
    // Ward should remain in wards
    expect(result.wards).toHaveLength(1)
    // Activity log should explain the block
    const entry = result.activityLog.find((e) => e.message.includes('no room'))
    expect(entry).toBeDefined()
    expect(entry?.message).toContain('Lys')
  })
})
