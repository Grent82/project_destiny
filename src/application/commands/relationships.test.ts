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
    expect(state.relationships['player→npc-test']?.affinity).toBe(10)
  })

  it('clamps positive values to 100', () => {
    const state = makeMinimalState({ relationships: { 'player→npc-test': { affinity: 95, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', 20)
    expect(result.newValue).toBe(100)
  })

  it('clamps negative values to -100', () => {
    const state = makeMinimalState({ relationships: { 'player→npc-test': { affinity: -95, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', -20)
    expect(result.newValue).toBe(-100)
  })

  it('detects significant threshold crossing (crosses 25)', () => {
    const state = makeMinimalState({ relationships: { 'player→npc-test': { affinity: 22, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', 5)
    expect(result.significant).toBe(true)
  })

  it('does not flag significant when no threshold crossed', () => {
    const state = makeMinimalState({ relationships: { 'player→npc-test': { affinity: 10, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', 5)
    expect(result.significant).toBe(false)
  })

  it('builds directed NPC→NPC key (no sorting)', () => {
    const state = makeMinimalState()
    applyRelationshipDelta(state, 'npc-b', 'npc-a', 'affinity', 5)
    expect(state.relationships['npc-b→npc-a']?.affinity).toBe(5)
    expect(state.relationships['npc-a→npc-b']).toBeUndefined()
  })
})

describe('applyPassiveDrift', () => {
  it('decays affinity by 1 when positive', () => {
    const state = makeMinimalState({ relationships: { 'player→npc-test': { affinity: 10, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    applyPassiveDrift(state)
    expect(state.relationships['player→npc-test']?.affinity).toBe(9)
  })

  it('does not decay affinity below 0', () => {
    const state = makeMinimalState({ relationships: { 'player→npc-test': { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    applyPassiveDrift(state)
    expect(state.relationships['player→npc-test']?.affinity).toBe(0)
  })

  it('does not increase negative affinity', () => {
    const state = makeMinimalState({ relationships: { 'player→npc-test': { affinity: -10, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    applyPassiveDrift(state)
    expect(state.relationships['player→npc-test']?.affinity).toBe(-10)
  })

  it('decays trust by 1 when positive', () => {
    const state = makeMinimalState({ relationships: { 'player→npc-test': { affinity: 0, respect: 0, fear: 0, trust: 15, loyalty: 0 } } })
    applyPassiveDrift(state)
    expect(state.relationships['player→npc-test']?.trust).toBe(14)
  })

  it('does not decay respect or loyalty', () => {
    const state = makeMinimalState({ relationships: { 'player→npc-test': { affinity: 0, respect: 50, fear: 0, trust: 0, loyalty: 50 } } })
    applyPassiveDrift(state)
    expect(state.relationships['player→npc-test']?.respect).toBe(50)
    expect(state.relationships['player→npc-test']?.loyalty).toBe(50)
  })
})

describe('applyProximityGains', () => {
  it('increases affinity between co-deployed NPCs (base gain 2, both directions)', () => {
    const state = makeMinimalState()
    applyProximityGains(state, ['npc-a', 'npc-b', 'npc-c'])
    // Base gain = 2 when NPCs have no trait data (unknown NPCs, compatibility score = 0)
    expect(state.relationships['npc-a→npc-b']?.affinity).toBe(2)
    expect(state.relationships['npc-b→npc-a']?.affinity).toBe(2)
    expect(state.relationships['npc-a→npc-c']?.affinity).toBe(2)
    expect(state.relationships['npc-b→npc-c']?.affinity).toBe(2)
  })

  it('increases player respect for each deployed NPC', () => {
    const state = makeMinimalState()
    applyProximityGains(state, ['npc-a', 'npc-b'])
    expect(state.relationships['player→npc-a']?.respect).toBe(2)
    expect(state.relationships['player→npc-b']?.respect).toBe(2)
  })

  it('does nothing with empty squad', () => {
    const state = makeMinimalState()
    applyProximityGains(state, [])
    expect(Object.keys(state.relationships).length).toBe(0)
  })

  it('applies compatibility multiplier: high-compat pair accumulates faster', () => {
    // High compat pair: score ~+20 → multiplier = 1.4 → gain = round(2*1.4) = 3
    const state = {
      ...makeMinimalState(),
      roster: [
        {
          ...initialStateWithIda.roster[0]!,
          npcId: 'npc-a',
          traits: { ...initialStateWithIda.roster[0]!.traits, dominance: 20, empathy: 65 },
        },
        {
          ...initialStateWithIda.roster[0]!,
          npcId: 'npc-b',
          traits: { ...initialStateWithIda.roster[0]!.traits, dominance: 25, empathy: 70 },
        },
      ],
    }
    applyProximityGains(state, ['npc-a', 'npc-b'])
    // R1 both<35: +10; R2 both>60: +12; base=0 -> +22 after warmth -> score=22
    // gain = max(2, round(2 * (1 + 22/50))) = max(2, round(2*1.44)) = max(2,3) = 3
    expect(state.relationships['npc-a→npc-b']?.affinity).toBe(3)
  })

  it('applies compatibility multiplier: low-compat pair floored at base gain 2', () => {
    // Low compat pair: R1 both>65 dom → score = -10+10 = 0 (actually clamp)
    // For true penalty: use ambition rivalry pair
    const state = {
      ...makeMinimalState(),
      roster: [
        {
          ...initialStateWithIda.roster[0]!,
          npcId: 'npc-a',
          traits: { ...initialStateWithIda.roster[0]!.traits, ambition: 70, curiosity: 30 },
        },
        {
          ...initialStateWithIda.roster[0]!,
          npcId: 'npc-b',
          traits: { ...initialStateWithIda.roster[0]!.traits, ambition: 72, curiosity: 30 },
        },
      ],
    }
    applyProximityGains(state, ['npc-a', 'npc-b'])
    // R4 both ambition >65: -8; score = -8+10 = 2; gain = max(2, round(2*(1+2/50))) = max(2,2) = 2
    expect(state.relationships['npc-a→npc-b']?.affinity).toBe(2)
  })

  it('applies curiosity bonus: either NPC curious >55 gives +1', () => {
    const state = {
      ...makeMinimalState(),
      roster: [
        {
          ...initialStateWithIda.roster[0]!,
          npcId: 'npc-a',
          traits: { ...initialStateWithIda.roster[0]!.traits, curiosity: 60 },
        },
        {
          ...initialStateWithIda.roster[0]!,
          npcId: 'npc-b',
          traits: { ...initialStateWithIda.roster[0]!.traits, curiosity: 30 },
        },
      ],
    }
    applyProximityGains(state, ['npc-a', 'npc-b'])
    // compatScore = 10 (warmth only, no rules fire with default traits)
    // gain = max(2, round(2*(1+10/50))) + 1(either curious) = max(2, round(2.4)) + 1 = 2+1 = 3
    expect(state.relationships['npc-a→npc-b']?.affinity).toBe(3)
  })

  it('applies curiosity bonus: both NPCs curious >55 gives +2', () => {
    const state = {
      ...makeMinimalState(),
      roster: [
        {
          ...initialStateWithIda.roster[0]!,
          npcId: 'npc-a',
          traits: { ...initialStateWithIda.roster[0]!.traits, curiosity: 60 },
        },
        {
          ...initialStateWithIda.roster[0]!,
          npcId: 'npc-b',
          traits: { ...initialStateWithIda.roster[0]!.traits, curiosity: 65 },
        },
      ],
    }
    applyProximityGains(state, ['npc-a', 'npc-b'])
    // compatScore = 10; gain = max(2, round(2.4)) + 2 = 2+2 = 4
    expect(state.relationships['npc-a→npc-b']?.affinity).toBe(4)
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
