import { describe, expect, it } from 'vitest'

import {
  getThreatProfile,
  getThreatsByType,
  getAllThreats,
  generateThreatEncounter,
} from './threatCatalog'

describe('threatCatalog', () => {
  describe('getThreatProfile', () => {
    it('returns a threat profile by ID', () => {
      const profile = getThreatProfile('corridor-bandit-scout')
      expect(profile).toBeDefined()
      expect(profile?.name).toBe('Corridor Scout')
      expect(profile?.threatType).toBe('bandit')
    })

    it('returns undefined for non-existent threat ID', () => {
      const profile = getThreatProfile('non-existent-threat')
      expect(profile).toBeUndefined()
    })

    it('returns all 7 threat profiles when queried individually', () => {
      const ids = [
        'corridor-bandit-scout',
        'corridor-bandit-veteran',
        'corridor-bandit-leader',
        'wild-beast-hound',
        'wild-beast-wolf',
        'scavenger-looter',
        'scavenger-raider',
      ]
      for (const id of ids) {
        const profile = getThreatProfile(id)
        expect(profile, `Threat ${id} should exist`).toBeDefined()
      }
    })
  })

  describe('getThreatsByType', () => {
    it('returns bandit threats', () => {
      const bandits = getThreatsByType('bandit')
      expect(bandits).toHaveLength(3)
      expect(bandits.every((t) => t.threatType === 'bandit')).toBe(true)
    })

    it('returns wild_beast threats', () => {
      const beasts = getThreatsByType('wild_beast')
      expect(beasts).toHaveLength(2)
      expect(beasts.every((t) => t.threatType === 'wild_beast')).toBe(true)
    })

    it('returns scavenger threats', () => {
      const scavengers = getThreatsByType('scavenger')
      expect(scavengers).toHaveLength(2)
      expect(scavengers.every((t) => t.threatType === 'scavenger')).toBe(true)
    })

    it('returns empty array for monster type (no monsters defined yet)', () => {
      const monsters = getThreatsByType('monster')
      expect(monsters).toHaveLength(0)
    })
  })

  describe('getAllThreats', () => {
    it('returns all 7 threat profiles', () => {
      const all = getAllThreats()
      expect(all).toHaveLength(7)
    })

    it('includes all threat types', () => {
      const all = getAllThreats()
      const types = new Set(all.map((t) => t.threatType))
      expect(types).toContain('bandit')
      expect(types).toContain('wild_beast')
      expect(types).toContain('scavenger')
    })
  })

  describe('generateThreatEncounter', () => {
    // Deterministic RNG for testing
    const makeRng = (seed: number) => {
      let state = seed
      return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff
        return state / 0x7fffffff
      }
    }

    it('generates encounter with correct difficulty clamping', () => {
      const rng = makeRng(42)
      const encounter = generateThreatEncounter(rng, 5)
      expect(encounter.length).toBeGreaterThanOrEqual(1)
    })

    it('returns more threats at higher difficulty', () => {
      const rng1 = makeRng(42)
      const rng2 = makeRng(42)
      const easy = generateThreatEncounter(rng1, 2)
      const hard = generateThreatEncounter(rng2, 8)
      expect(hard.length).toBeGreaterThanOrEqual(easy.length)
    })

    it('uses deterministic RNG for reproducible encounters', () => {
      const rng1 = makeRng(123)
      const rng2 = makeRng(123)
      const encounter1 = generateThreatEncounter(rng1, 5)
      const encounter2 = generateThreatEncounter(rng2, 5)
      expect(encounter1.map((t) => t.id)).toEqual(encounter2.map((t) => t.id))
    })

    it('generates more threats at higher difficulty', () => {
      const rngLow = makeRng(42)
      const rngHigh = makeRng(42)
      const lowEncounter = generateThreatEncounter(rngLow, 3)
      const highEncounter = generateThreatEncounter(rngHigh, 9)

      // At difficulty 9, we should have access to hard threats
      expect(lowEncounter.length).toBeLessThanOrEqual(highEncounter.length)
    })

    it('clamps difficulty below 1 to minimum', () => {
      const rng = makeRng(42)
      const encounter = generateThreatEncounter(rng, 0)
      expect(encounter.length).toBeGreaterThanOrEqual(1)
    })

    it('clamps difficulty above 10 to maximum', () => {
      const rng = makeRng(42)
      const encounter = generateThreatEncounter(rng, 15)
      expect(encounter.length).toBeLessThanOrEqual(5) // Max at difficulty 10
    })
  })
})
