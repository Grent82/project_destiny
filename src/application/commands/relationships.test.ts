import { describe, it, expect } from 'vitest'
import { gameStateSchema } from '../../domain/game/contracts'
import {
  applyRelationshipDelta,
  applyPassiveDrift,
  applyProximityGains,
  writeNpcMemory,
} from './adjustRelationship'
import type { GameState } from '../../domain'
import { initialStateWithIda } from './testFixtures'

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
  return gameStateSchema.parse({
    day: 1,
    timeSlot: 'morning',
    money: 100,
    protagonistName: '',
    hasSeenOpening: false,
    cityDials: { control: 50, prosperity: 50, unrest: 50, corruption: 50 },
    factionStandings: {},
    factionStates: [],
    districts: [],
    roster: [],
    inventory: [],
    cityResources: {
      foodSecurity: 60,
      waterAccess: 70,
      materialStock: 50,
      corridorStatus: 'open',
    },
    activityLog: [],
    selectedSquadNpcIds: [],
    activeCombat: null,
    ...overrides,
  })
}

describe('applyRelationshipDelta', () => {
  it('initialises from zero when key is absent', () => {
    const state = makeMinimalState()
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', 10)
    expect(result.oldValue).toBe(0)
    expect(result.newValue).toBe(10)
    expect(state.relationships['player-npc-test']?.affinity).toBe(10)
  })

  it('clamps positive values to 100', () => {
    const state = makeMinimalState({ relationships: { 'player-npc-test': { affinity: 95, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', 20)
    expect(result.newValue).toBe(100)
  })

  it('clamps negative values to -100', () => {
    const state = makeMinimalState({ relationships: { 'player-npc-test': { affinity: -95, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', -20)
    expect(result.newValue).toBe(-100)
  })

  it('detects significant threshold crossing (crosses 25)', () => {
    const state = makeMinimalState({ relationships: { 'player-npc-test': { affinity: 22, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', 5)
    expect(result.significant).toBe(true)
  })

  it('does not flag significant when no threshold crossed', () => {
    const state = makeMinimalState({ relationships: { 'player-npc-test': { affinity: 10, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', 5)
    expect(result.significant).toBe(false)
  })

  it('builds NPC→NPC key in sorted order', () => {
    const state = makeMinimalState()
    applyRelationshipDelta(state, 'npc-b', 'npc-a', 'affinity', 5)
    expect(state.relationships['npc-a-npc-b']?.affinity).toBe(5)
  })
})

describe('applyPassiveDrift', () => {
  it('decays affinity by 1 when positive', () => {
    const state = makeMinimalState({ relationships: { 'player-npc-test': { affinity: 10, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    applyPassiveDrift(state)
    expect(state.relationships['player-npc-test']?.affinity).toBe(9)
  })

  it('does not decay affinity below 0', () => {
    const state = makeMinimalState({ relationships: { 'player-npc-test': { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    applyPassiveDrift(state)
    expect(state.relationships['player-npc-test']?.affinity).toBe(0)
  })

  it('does not increase negative affinity', () => {
    const state = makeMinimalState({ relationships: { 'player-npc-test': { affinity: -10, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    applyPassiveDrift(state)
    expect(state.relationships['player-npc-test']?.affinity).toBe(-10)
  })

  it('decays trust by 1 when positive', () => {
    const state = makeMinimalState({ relationships: { 'player-npc-test': { affinity: 0, respect: 0, fear: 0, trust: 15, loyalty: 0 } } })
    applyPassiveDrift(state)
    expect(state.relationships['player-npc-test']?.trust).toBe(14)
  })

  it('does not decay respect or loyalty', () => {
    const state = makeMinimalState({ relationships: { 'player-npc-test': { affinity: 0, respect: 50, fear: 0, trust: 0, loyalty: 50 } } })
    applyPassiveDrift(state)
    expect(state.relationships['player-npc-test']?.respect).toBe(50)
    expect(state.relationships['player-npc-test']?.loyalty).toBe(50)
  })
})

describe('applyProximityGains', () => {
  it('increases affinity between co-deployed NPCs', () => {
    const state = makeMinimalState()
    applyProximityGains(state, ['npc-a', 'npc-b', 'npc-c'])
    expect(state.relationships['npc-a-npc-b']?.affinity).toBe(1)
    expect(state.relationships['npc-a-npc-c']?.affinity).toBe(1)
    expect(state.relationships['npc-b-npc-c']?.affinity).toBe(1)
  })

  it('increases player respect for each deployed NPC', () => {
    const state = makeMinimalState()
    applyProximityGains(state, ['npc-a', 'npc-b'])
    expect(state.relationships['player-npc-a']?.respect).toBe(1)
    expect(state.relationships['player-npc-b']?.respect).toBe(1)
  })

  it('does nothing with empty squad', () => {
    const state = makeMinimalState()
    applyProximityGains(state, [])
    expect(Object.keys(state.relationships).length).toBe(0)
  })
})

describe('npcMemory — writeNpcMemory', () => {
  it('writes a memory entry to a roster NPC', () => {
    const state = structuredClone(initialStateWithIda)
    writeNpcMemory(state, 'npc-ida-rhys', 'Test event')
    const npc = state.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(npc.npcMemory.length).toBe(1)
    expect(npc.npcMemory[0]!.event).toBe('Test event')
  })

  it('caps memory at MAX_NPC_MEMORY_ENTRIES', () => {
    const state = structuredClone(initialStateWithIda)
    for (let i = 0; i < 25; i++) writeNpcMemory(state, 'npc-ida-rhys', `event-${i}`)
    const npc = state.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(npc.npcMemory.length).toBe(20)
    expect(npc.npcMemory[npc.npcMemory.length - 1]!.event).toBe('event-24')
  })

  it('no-ops for unknown npcId', () => {
    const state = structuredClone(initialStateWithIda)
    expect(() => writeNpcMemory(state, 'npc-ghost-doesnotexist', 'ignored')).not.toThrow()
  })
})
