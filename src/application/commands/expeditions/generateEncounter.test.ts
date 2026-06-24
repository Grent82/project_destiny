import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { generateEncounter, resolveEncounter, calculateSquadPower, type EncounterGameState } from './generateEncounter'

describe('generateEncounter', () => {
  const makeRng = (seed: number) => {
    let state = seed
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff
      return state / 0x7fffffff
    }
  }

  it('generates encounter with threats based on difficulty', () => {
    const rng = makeRng(42)
    const encounter = generateEncounter(initialGameStateSnapshot, 5, rng)

    expect(encounter.difficulty).toBe(5)
    expect(encounter.threats.length).toBeGreaterThanOrEqual(1)
    expect(encounter.rewardPool.length).toBeGreaterThanOrEqual(1)
  })

  it('clamps difficulty to valid range', () => {
    const rng1 = makeRng(42)
    const rng2 = makeRng(42)
    const low = generateEncounter(initialGameStateSnapshot, 0, rng1)
    const high = generateEncounter(initialGameStateSnapshot, 15, rng2)

    expect(low.difficulty).toBe(1)
    expect(high.difficulty).toBe(10)
  })

  it('generates deterministic encounters with same RNG seed', () => {
    const rng1 = makeRng(123)
    const rng2 = makeRng(123)
    const encounter1 = generateEncounter(initialGameStateSnapshot, 5, rng1)
    const encounter2 = generateEncounter(initialGameStateSnapshot, 5, rng2)

    expect(encounter1.threats.map((t) => t.threatId)).toEqual(
      encounter2.threats.map((t) => t.threatId)
    )
  })

  it('generates encounters with varied threats based on difficulty', () => {
    const rng = makeRng(42)
    const encounter = generateEncounter(initialGameStateSnapshot, 5, rng)

    // Should have at least one threat
    expect(encounter.threats.length).toBeGreaterThanOrEqual(1)

    // All threats should have valid IDs
    for (const threat of encounter.threats) {
      expect(threat.threatId).toBeDefined()
      expect(threat.name).toBeDefined()
    }
  })

  it('assigns unique encounter IDs', () => {
    const rng1 = makeRng(42)
    const rng2 = makeRng(42)
    const encounter1 = generateEncounter(initialGameStateSnapshot, 5, rng1)
    const encounter2 = generateEncounter(initialGameStateSnapshot, 5, rng2)

    expect(encounter1.encounterId).not.toBe(encounter2.encounterId)
  })
})

describe('resolveEncounter', () => {
  const makeRng = (seed: number) => {
    let state = seed
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff
      return state / 0x7fffffff
    }
  }

  it('returns defeated and remaining threats', () => {
    const rng = makeRng(42)
    const encounter = generateEncounter(initialGameStateSnapshot, 3, rng)

    // High squad power should defeat most threats
    const result = resolveEncounter(encounter, 500, rng)

    expect(result.defeatedThreats).toBeDefined()
    expect(result.remainingThreats).toBeDefined()
    expect(result.defeatedThreats.length + result.remainingThreats.length).toBe(
      encounter.threats.length
    )
  })

  it('returns rewards when threats are defeated', () => {
    const rng = makeRng(42)
    const encounter = generateEncounter(initialGameStateSnapshot, 5, rng)

    // Very high squad power for guaranteed victory
    const result = resolveEncounter(encounter, 1000, rng)

    expect(result.rewards).toBeDefined()
  })

  it('calculates encounter power correctly', () => {
    const rng = makeRng(42)
    const encounter = generateEncounter(initialGameStateSnapshot, 4, rng)

    const result = resolveEncounter(encounter, 300, rng)

    // Encounter power should be sum of all threat attacks
    const expectedPower = encounter.threats.reduce((sum, t) => sum + t.attack, 0)
    expect(result.encounterPower).toBe(expectedPower)
  })

  it('handles empty encounter gracefully', () => {
    const emptyEncounter = {
      encounterId: 'test',
      day: 1,
      threats: [],
      rewardPool: [],
      difficulty: 1,
    }

    const result = resolveEncounter(emptyEncounter, 100, makeRng(42))

    expect(result.defeatedThreats).toHaveLength(0)
    expect(result.remainingThreats).toHaveLength(0)
    expect(result.rewards).toHaveLength(0)
  })
})

describe('calculateSquadPower', () => {
  it('calculates power for empty roster', () => {
    const power = calculateSquadPower([])
    expect(power).toBe(0)
  })

  it('calculates power based on attributes and skills', () => {
    const roster: EncounterGameState['roster'] = [
      {
        skills: { melee: 30, ranged: 20 },
        attributes: { endurance: 50, resolve: 50 },
      },
    ]

    const power = calculateSquadPower(roster)
    expect(power).toBeGreaterThan(0)
  })

  it('sums power for multiple NPCs', () => {
    const npc1 = {
      npcId: 'npc-1',
      name: 'NPC 1',
      skills: { melee: 30, ranged: 20 },
      attributes: { endurance: 50, resolve: 50 },
      states: { health: 100, fatigue: 0, stress: 0, morale: 50, fear: 0, anger: 0, hunger: 0, injury: 0, intoxication: 0, hygiene: 70 },
      loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
      npcMemory: [],
      bondStatus: null,
      npcArc: null,
    } as const

    const npc2 = {
      npcId: 'npc-2',
      name: 'NPC 2',
      skills: { melee: 40, ranged: 30 },
      attributes: { endurance: 60, resolve: 55 },
      states: { health: 100, fatigue: 0, stress: 0, morale: 50, fear: 0, anger: 0, hunger: 0, injury: 0, intoxication: 0, hygiene: 70 },
      loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
      npcMemory: [],
      bondStatus: null,
      npcArc: null,
    } as const

    const singlePower = calculateSquadPower([npc1])
    const doublePower = calculateSquadPower([npc1, npc2])

    // Double power should be greater than single power
    expect(doublePower).toBeGreaterThan(singlePower)
  })
})
