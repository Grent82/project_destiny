import { describe, expect, it } from 'vitest'
import {
  fuzzify,
  fuzzyWeights,
  fuzzyScore,
  combineFuzzyScores,
  applyFuzzyRules,
  type FuzzyLevel,
} from './fuzzyLogic'

describe('Fuzzy Logic System', () => {
  describe('fuzzify', () => {
    it('maps very-low values (0-19)', () => {
      expect(fuzzify(0)).toBe('very-low')
      expect(fuzzify(10)).toBe('very-low')
      expect(fuzzify(19)).toBe('very-low')
    })

    it('maps low values (20-34)', () => {
      expect(fuzzify(20)).toBe('low')
      expect(fuzzify(25)).toBe('low')
      expect(fuzzify(34)).toBe('low')
    })

    it('maps medium values (35-54)', () => {
      expect(fuzzify(35)).toBe('medium')
      expect(fuzzify(45)).toBe('medium')
      expect(fuzzify(54)).toBe('medium')
    })

    it('maps high values (55-69)', () => {
      expect(fuzzify(55)).toBe('high')
      expect(fuzzify(60)).toBe('high')
      expect(fuzzify(69)).toBe('high')
    })

    it('maps very-high values (70-100)', () => {
      expect(fuzzify(70)).toBe('very-high')
      expect(fuzzify(80)).toBe('very-high')
      expect(fuzzify(100)).toBe('very-high')
    })

    it('handles boundary values correctly', () => {
      expect(fuzzify(19)).toBe('very-low')
      expect(fuzzify(20)).toBe('low')
      expect(fuzzify(34)).toBe('low')
      expect(fuzzify(35)).toBe('medium')
      expect(fuzzify(54)).toBe('medium')
      expect(fuzzify(55)).toBe('high')
      expect(fuzzify(69)).toBe('high')
      expect(fuzzify(70)).toBe('very-high')
    })
  })

  describe('fuzzyWeights', () => {
    it('has correct weight values', () => {
      expect(fuzzyWeights['very-low']).toBe(0.2)
      expect(fuzzyWeights['low']).toBe(0.5)
      expect(fuzzyWeights['medium']).toBe(1.0)
      expect(fuzzyWeights['high']).toBe(1.5)
      expect(fuzzyWeights['very-high']).toBe(2.0)
    })
  })

  describe('fuzzyScore', () => {
    it('calculates score for medium value', () => {
      // 50 * 1.0 / 100 = 0.5
      expect(fuzzyScore(50)).toBe(0.5)
    })

    it('calculates score for high value (70 is very-high, weight 2.0)', () => {
      // 70 * 2.0 / 100 = 1.4
      expect(fuzzyScore(70)).toBe(1.4)
    })

    it('calculates score for very-low value', () => {
      // 10 * 0.2 / 100 = 0.02
      expect(fuzzyScore(10)).toBe(0.02)
    })
  })

  describe('combineFuzzyScores', () => {
    it('combines scores with weights', () => {
      const result = combineFuzzyScores([
        { value: 70, weight: 0.4 }, // very-high -> 70 * 2.0 / 100 = 1.4
        { value: 50, weight: 0.35 }, // medium -> 50 * 1.0 / 100 = 0.5
        { value: 60, weight: 0.25 }, // high -> 60 * 1.5 / 100 = 0.9
      ])
      // (1.4 * 0.4 + 0.5 * 0.35 + 0.9 * 0.25) * 100 = 96
      expect(result).toBe(96)
    })

    it('returns 100 for all very-high values', () => {
      const result = combineFuzzyScores([
        { value: 80, weight: 0.5 },
        { value: 90, weight: 0.5 },
      ])
      expect(result).toBe(100)
    })

    it('returns low score for all very-low values', () => {
      const result = combineFuzzyScores([
        { value: 10, weight: 0.5 },
        { value: 20, weight: 0.5 },
      ])
      // 10 * 0.2 / 100 = 0.02, 20 * 0.5 / 100 = 0.1
      // (0.02 * 0.5 + 0.1 * 0.5) * 100 = 6
      expect(result).toBe(6)
    })
  })

  describe('applyFuzzyRules', () => {
    it('matches excellent scout rule', () => {
      const npc = {
        attributes: { perception: 75 },
        skills: { survival: 72 },
        traits: { curiosity: 50 },
      }
      const rules = [
        {
          name: 'excellent scout',
          conditions: [
            { type: 'attribute' as const, name: 'perception', level: 'high' as FuzzyLevel },
            { type: 'skill' as const, name: 'survival', level: 'high' as FuzzyLevel },
          ],
          resultWeight: 1.5,
        },
      ]
      const result = applyFuzzyRules(npc, rules)
      // perception 75 is very-high (not high), so rule doesn't match
      expect(result).toBe(0)
    })

    it('matches multiple rules with correct levels', () => {
      const npc = {
        attributes: { perception: 65, might: 68 },
        skills: { survival: 65 },
        traits: { curiosity: 50 },
      }
      const rules = [
        {
          name: 'excellent scout',
          conditions: [
            { type: 'attribute' as const, name: 'perception', level: 'high' as FuzzyLevel },
            { type: 'skill' as const, name: 'survival', level: 'high' as FuzzyLevel },
          ],
          resultWeight: 1.5,
        },
        {
          name: 'fierce warrior',
          conditions: [
            { type: 'attribute' as const, name: 'might', level: 'high' as FuzzyLevel },
          ],
          resultWeight: 1.0,
        },
      ]
      const result = applyFuzzyRules(npc, rules)
      // Both rules match: (1.5 + 1.0) * 20 = 50
      expect(result).toBe(50)
    })

    it('returns 0 when no rules match', () => {
      const npc = {
        attributes: { perception: 30 },
        skills: { survival: 25 },
        traits: { curiosity: 20 },
      }
      const rules = [
        {
          name: 'excellent scout',
          conditions: [
            { type: 'attribute' as const, name: 'perception', level: 'high' as FuzzyLevel },
            { type: 'skill' as const, name: 'survival', level: 'high' as FuzzyLevel },
          ],
          resultWeight: 1.5,
        },
      ]
      const result = applyFuzzyRules(npc, rules)
      expect(result).toBe(0)
    })
  })
})
