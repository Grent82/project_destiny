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
    npcRuntimeStates: [],
    cityResources: {
      foodSecurity: 60,
      foodStock: 600,
      foodCapacity: 1000,
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
    expect(result.state.relationships['player-to-npc-test']?.affinity).toBe(10)
  })

  it('clamps positive values to 100', () => {
    const state = makeMinimalState({ relationships: { 'player-to-npc-test': { affinity: 95, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', 20)
    expect(result.newValue).toBe(100)
  })

  it('clamps negative values to -100', () => {
    const state = makeMinimalState({ relationships: { 'player-to-npc-test': { affinity: -95, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', -20)
    expect(result.newValue).toBe(-100)
  })

  it('detects significant threshold crossing (crosses 25)', () => {
    const state = makeMinimalState({ relationships: { 'player-to-npc-test': { affinity: 22, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', 5)
    expect(result.significant).toBe(true)
  })

  it('does not flag significant when no threshold crossed', () => {
    const state = makeMinimalState({ relationships: { 'player-to-npc-test': { affinity: 10, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyRelationshipDelta(state, 'player', 'npc-test', 'affinity', 5)
    expect(result.significant).toBe(false)
  })

  it('builds directed NPC-to-NPC key (no sorting)', () => {
    const state = makeMinimalState()
    const result = applyRelationshipDelta(state, 'npc-b', 'npc-a', 'affinity', 5)
    expect(result.state.relationships['npc-b-to-npc-a']?.affinity).toBe(5)
    expect(result.state.relationships['npc-a-to-npc-b']).toBeUndefined()
  })
})

describe('applyPassiveDrift', () => {
  it('does not decay affinity (only trust drifts passively)', () => {
    const state = makeMinimalState({ relationships: { 'player-to-npc-test': { affinity: 10, respect: 0, fear: 0, trust: 0, loyalty: 0 } } })
    const result = applyPassiveDrift(state)
    expect(result.relationships['player-to-npc-test']?.affinity).toBe(10)
  })

  it('does not decay trust when trust ≤ 40 (relationship still forming)', () => {
    // trust=15 is below the 40-threshold; no decay regardless of day
    const state = makeMinimalState({ relationships: { 'player-to-npc-test': { affinity: 0, respect: 0, fear: 0, trust: 15, loyalty: 0 } } })
    const result = applyPassiveDrift(state)
    expect(result.relationships['player-to-npc-test']?.trust).toBe(15)
  })

  it('decays trust > 80 by 1/day (day=1, interval=1)', () => {
    // trust=85 > 80 → baseInterval=1 → driftInterval=1; day=1 % 1 = 0 → fires
    // No roster entries: default loyalty=50 → no loyalty modifier; no compat modifier
    const state = makeMinimalState({ day: 1, relationships: { 'player-to-npc-test': { affinity: 0, respect: 0, fear: 0, trust: 85, loyalty: 0 } } })
    const result = applyPassiveDrift(state)
    expect(result.relationships['player-to-npc-test']?.trust).toBe(84)
  })

  it('does not decay trust 61-80 at day=1 (interval=2)', () => {
    // trust=70 → baseInterval=2; day=1 % 2 = 1 ≠ 0 → no drift
    const state = makeMinimalState({ day: 1, relationships: { 'player-to-npc-test': { affinity: 0, respect: 0, fear: 0, trust: 70, loyalty: 0 } } })
    const result = applyPassiveDrift(state)
    expect(result.relationships['player-to-npc-test']?.trust).toBe(70)
  })

  it('decays trust 61-80 at day=2 (interval=2)', () => {
    // trust=70 → baseInterval=2; day=2 % 2 = 0 → fires
    const state = makeMinimalState({ day: 2, relationships: { 'player-to-npc-test': { affinity: 0, respect: 0, fear: 0, trust: 70, loyalty: 0 } } })
    const result = applyPassiveDrift(state)
    expect(result.relationships['player-to-npc-test']?.trust).toBe(69)
  })

  it('does not decay trust 41-60 at day=1 (interval=3)', () => {
    const state = makeMinimalState({ day: 1, relationships: { 'player-to-npc-test': { affinity: 0, respect: 0, fear: 0, trust: 50, loyalty: 0 } } })
    const result = applyPassiveDrift(state)
    expect(result.relationships['player-to-npc-test']?.trust).toBe(50)
  })

  it('decays trust 41-60 at day=3 (interval=3)', () => {
    const state = makeMinimalState({ day: 3, relationships: { 'player-to-npc-test': { affinity: 0, respect: 0, fear: 0, trust: 50, loyalty: 0 } } })
    const result = applyPassiveDrift(state)
    expect(result.relationships['player-to-npc-test']?.trust).toBe(49)
  })

  it('does not decay respect or loyalty', () => {
    const state = makeMinimalState({ relationships: { 'player-to-npc-test': { affinity: 0, respect: 50, fear: 0, trust: 0, loyalty: 50 } } })
    const result = applyPassiveDrift(state)
    expect(result.relationships['player-to-npc-test']?.respect).toBe(50)
    expect(result.relationships['player-to-npc-test']?.loyalty).toBe(50)
  })

  it('high-loyalty NPC pair drifts slower (interval extended by loyalty factor)', () => {
    // trust=85 (interval=1), avg loyalty >60 → loyaltyFactor=0.75
    // effectiveInterval = max(1, round(1 / 0.75)) = max(1, round(1.33)) = max(1, 1) = 1
    // So still fires daily at high loyalty for trust>80
    const state = {
      ...makeMinimalState({ day: 1, relationships: { 'npc-a-to-npc-b': { affinity: 0, respect: 0, fear: 0, trust: 85, loyalty: 0 } } }),
      npcRuntimeStates: [
        { ...initialStateWithIda.npcRuntimeStates[0]!, npcId: 'npc-a', traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, loyalty: 70 } },
        { ...initialStateWithIda.npcRuntimeStates[0]!, npcId: 'npc-b', traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, loyalty: 72 } },
      ],
    }
    const result = applyPassiveDrift(state)
    // Still decays (effectiveInterval=1, day=1 % 1 = 0)
    expect(result.relationships['npc-a-to-npc-b']?.trust).toBe(84)
  })

  it('high-loyalty NPC pair with trust 61-80 gets extended interval', () => {
    // trust=70 (interval=2), avg loyalty >60 → loyaltyFactor=0.75
    // effectiveInterval = max(1, round(2 / 0.75)) = max(1, round(2.67)) = max(1, 3) = 3
    // At day=2: 2 % 3 = 2 ≠ 0 → no drift
    const state = {
      ...makeMinimalState({ day: 2, relationships: { 'npc-a-to-npc-b': { affinity: 0, respect: 0, fear: 0, trust: 70, loyalty: 0 } } }),
      npcRuntimeStates: [
        { ...initialStateWithIda.npcRuntimeStates[0]!, npcId: 'npc-a', traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, loyalty: 70 } },
        { ...initialStateWithIda.npcRuntimeStates[0]!, npcId: 'npc-b', traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, loyalty: 72 } },
      ],
    }
    const result = applyPassiveDrift(state)
    // No drift at day=2 (effectiveInterval=3)
    expect(result.relationships['npc-a-to-npc-b']?.trust).toBe(70)
  })

  it('high-compatibility pair with trust 61-80 gets halved drift rate (interval doubled)', () => {
    // trust=70 (interval=2), Ida×Holst compatibility = 20 >= 15 → compatFactor=0.5
    // effectiveInterval = max(1, round(2 / 0.5)) = max(1, 4) = 4
    // At day=2: 2 % 4 ≠ 0 → no drift
    const holstEntry = {
      ...initialStateWithIda.npcRuntimeStates[1]!,
      npcId: 'npc-verek-holst',
      traits: { discipline: 78, ambition: 44, empathy: 22, ruthlessness: 52, prudence: 72, curiosity: 31, dominance: 64, loyalty: 38, vanity: 29, zeal: 41 },
    }
    const state = {
      ...makeMinimalState({ day: 2, relationships: { 'npc-ida-rhys-to-npc-verek-holst': { affinity: 0, respect: 0, fear: 0, trust: 70, loyalty: 0 } } }),
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, holstEntry],
    }
    const result = applyPassiveDrift(state)
    expect(result.relationships['npc-ida-rhys-to-npc-verek-holst']?.trust).toBe(70)
  })

  it('does not drift trust below 0', () => {
    let state = makeMinimalState({ day: 1, relationships: { 'player-to-npc-test': { affinity: 0, respect: 0, fear: 0, trust: 81, loyalty: 0 } } })
    for (let i = 0; i < 100; i++) {
      state = applyPassiveDrift({ ...state, day: i + 1 })
    }
    expect(state.relationships['player-to-npc-test']?.trust).toBeGreaterThanOrEqual(0)
  })
})

describe('applyProximityGains', () => {
  it('increases affinity between co-deployed NPCs (base gain 2, both directions)', () => {
    const state = makeMinimalState()
    const result = applyProximityGains(state, ['npc-a', 'npc-b', 'npc-c'])
    // Base gain = 2 when NPCs have no trait data (unknown NPCs, compatibility score = 0)
    expect(result.relationships['npc-a-to-npc-b']?.affinity).toBe(2)
    expect(result.relationships['npc-b-to-npc-a']?.affinity).toBe(2)
    expect(result.relationships['npc-a-to-npc-c']?.affinity).toBe(2)
    expect(result.relationships['npc-b-to-npc-c']?.affinity).toBe(2)
  })

  it('increases player respect for each deployed NPC', () => {
    const state = makeMinimalState()
    const result = applyProximityGains(state, ['npc-a', 'npc-b'])
    expect(result.relationships['player-to-npc-a']?.respect).toBe(2)
    expect(result.relationships['player-to-npc-b']?.respect).toBe(2)
  })

  it('does nothing with empty squad', () => {
    const state = makeMinimalState()
    const result = applyProximityGains(state, [])
    expect(Object.keys(result.relationships).length).toBe(0)
  })

  it('applies compatibility multiplier: high-compat pair accumulates faster', () => {
    // High compat pair: score ~+20 → multiplier = 1.4 → gain = round(2*1.4) = 3
    const state = {
      ...makeMinimalState(),
      npcRuntimeStates: [
        {
          ...initialStateWithIda.npcRuntimeStates[0]!,
          npcId: 'npc-a',
          traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, dominance: 20, empathy: 65 },
        },
        {
          ...initialStateWithIda.npcRuntimeStates[0]!,
          npcId: 'npc-b',
          traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, dominance: 25, empathy: 70 },
        },
      ],
    }
    const result = applyProximityGains(state, ['npc-a', 'npc-b'])
    // R1 both<35: +10; R2 both>60: +12; base=0 -> +22 after warmth -> score=22
    // gain = max(2, round(2 * (1 + 22/50))) = max(2, round(2*1.44)) = max(2,3) = 3
    expect(result.relationships['npc-a-to-npc-b']?.affinity).toBe(3)
  })

  it('applies compatibility multiplier: low-compat pair floored at base gain 2', () => {
    // Low compat pair: R1 both>65 dom → score = -10+10 = 0 (actually clamp)
    // For true penalty: use ambition rivalry pair
    const state = {
      ...makeMinimalState(),
      npcRuntimeStates: [
        {
          ...initialStateWithIda.npcRuntimeStates[0]!,
          npcId: 'npc-a',
          traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, ambition: 70, curiosity: 30 },
        },
        {
          ...initialStateWithIda.npcRuntimeStates[0]!,
          npcId: 'npc-b',
          traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, ambition: 72, curiosity: 30 },
        },
      ],
    }
    const result = applyProximityGains(state, ['npc-a', 'npc-b'])
    // R4 both ambition >65: -8; score = -8+10 = 2; gain = max(2, round(2*(1+2/50))) = max(2,2) = 2
    expect(result.relationships['npc-a-to-npc-b']?.affinity).toBe(2)
  })

  it('applies curiosity bonus: either NPC curious >55 gives +1', () => {
    const state = {
      ...makeMinimalState(),
      npcRuntimeStates: [
        {
          ...initialStateWithIda.npcRuntimeStates[0]!,
          npcId: 'npc-a',
          traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, curiosity: 60 },
        },
        {
          ...initialStateWithIda.npcRuntimeStates[0]!,
          npcId: 'npc-b',
          traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, curiosity: 30 },
        },
      ],
    }
    const result = applyProximityGains(state, ['npc-a', 'npc-b'])
    // compatScore = 10 (warmth only, no rules fire with default traits)
    // gain = max(2, round(2*(1+10/50))) + 1(either curious) = max(2, round(2.4)) + 1 = 2+1 = 3
    expect(result.relationships['npc-a-to-npc-b']?.affinity).toBe(3)
  })

  it('applies curiosity bonus: both NPCs curious >55 gives +2', () => {
    const state = {
      ...makeMinimalState(),
      npcRuntimeStates: [
        {
          ...initialStateWithIda.npcRuntimeStates[0]!,
          npcId: 'npc-a',
          traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, curiosity: 60 },
        },
        {
          ...initialStateWithIda.npcRuntimeStates[0]!,
          npcId: 'npc-b',
          traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, curiosity: 65 },
        },
      ],
    }
    const result = applyProximityGains(state, ['npc-a', 'npc-b'])
    // compatScore = 10; gain = max(2, round(2.4)) + 2 = 2+2 = 4
    expect(result.relationships['npc-a-to-npc-b']?.affinity).toBe(4)
  })
})

describe('npcMemory — writeNpcMemory', () => {
  it('writes a memory entry to a roster NPC', () => {
    const state = structuredClone(initialStateWithIda)
    const nextState = writeNpcMemory(state, 'npc-ida-rhys', 'Test event')
    const npc = nextState.npcRuntimeStates.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(npc.npcMemory.length).toBe(1)
    expect(npc.npcMemory[0]!.event).toBe('Test event')
  })

  it('caps memory at MAX_NPC_MEMORY_ENTRIES', () => {
    let state = structuredClone(initialStateWithIda)
    for (let i = 0; i < 25; i++) {
      state = writeNpcMemory(state, 'npc-ida-rhys', `event-${i}`)
    }
    const npc = state.npcRuntimeStates.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(npc.npcMemory.length).toBe(20)
    expect(npc.npcMemory[npc.npcMemory.length - 1]!.event).toBe('event-24')
  })

  it('no-ops for unknown npcId', () => {
    const state = structuredClone(initialStateWithIda)
    const result = writeNpcMemory(state, 'npc-ghost-doesnotexist', 'ignored')
    expect(result).toBe(state) // returns unchanged state
  })
})
