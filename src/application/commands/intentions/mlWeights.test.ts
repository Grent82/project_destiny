import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INTENTION_WEIGHTS,
  calculateWeightedConfidence,
  adjustWeightsOnSuccess,
  adjustWeightsOnFailure,
  getSuccessRate,
  hasDevelopedStyle,
  type IntentionProfile,
} from './mlWeights'
import type { NpcIntentionType } from '../../../domain/npc/contracts'

describe('ML Weight System', () => {
  describe('DEFAULT_INTENTION_WEIGHTS', () => {
    it('has weights for all 35 intention types', () => {
      const expectedTypes = [
        'lead-group', 'support-group', 'scout-ahead', 'resource-gather',
        'confront-rival', 'protect-house', 'investigate-threat', 'patrol-district',
        'seek-employment', 'socialize',
        'eat-meal', 'drink', 'sleep', 'rest', 'groom',
        'flirt-with', 'court-romantically', 'visit-lover', 'jealousy-check', 'spend-time-with',
        'shop-for-goods', 'train-self', 'meditate', 'practice-skill',
        'people-watch', 'gossip',
        'assert-dominance', 'spy-on', 'intercept-communication', 'gather-leverage', 'consolidate-power',
        'form-squad', 'recruit-member', 'host-gathering', 'mediate-conflict', 'challenge-authority',
        'scavenge', 'fortify-position', 'escape-attempt', 'seek-shelter', 'care-for-injured',
      ]

      for (const type of expectedTypes) {
        expect(DEFAULT_INTENTION_WEIGHTS[type as NpcIntentionType]).toBeDefined()
      }
    })

    it('has scout-ahead with perception and survival weights', () => {
      const weights = DEFAULT_INTENTION_WEIGHTS['scout-ahead']
      expect(weights.attributeWeights.perception).toBe(1.3)
      expect(weights.skillWeights.survival).toBe(1.3)
      expect(weights.traitWeights.curiosity).toBe(1.2)
    })

    it('has confront-rival with might and melee weights', () => {
      const weights = DEFAULT_INTENTION_WEIGHTS['confront-rival']
      expect(weights.attributeWeights.might).toBe(1.3)
      expect(weights.skillWeights.melee).toBe(1.3)
    })
  })

  describe('calculateWeightedConfidence', () => {
    it('calculates base confidence for average NPC', () => {
      const npc = {
        attributes: { presence: 50, might: 50, endurance: 50, intellect: 50, perception: 50 },
        skills: { negotiation: 50, survival: 50, melee: 50 },
        traits: { ambition: 50, empathy: 50, discipline: 50 },
      }
      const result = calculateWeightedConfidence(npc, 'lead-group', DEFAULT_INTENTION_WEIGHTS['lead-group'])
      expect(result).toBe(50) // Base score for average values
    })

    it('calculates higher confidence for skilled NPC', () => {
      const npc = {
        attributes: { presence: 80, might: 50, endurance: 50, intellect: 50, perception: 50 },
        skills: { negotiation: 50, survival: 50, melee: 50 },
        traits: { ambition: 75, empathy: 50, discipline: 60 },
      }
      const result = calculateWeightedConfidence(npc, 'lead-group', DEFAULT_INTENTION_WEIGHTS['lead-group'])
      expect(result).toBeGreaterThan(50)
    })

    it('calculates lower confidence for unskilled NPC', () => {
      const npc = {
        attributes: { presence: 30, might: 50, endurance: 50, intellect: 50, perception: 50 },
        skills: { negotiation: 30, survival: 50, melee: 50 },
        traits: { ambition: 30, empathy: 50, discipline: 40 },
      }
      const result = calculateWeightedConfidence(npc, 'lead-group', DEFAULT_INTENTION_WEIGHTS['lead-group'])
      expect(result).toBeLessThan(50)
    })

    it('clamps result to 0-100', () => {
      const weakNpc = {
        attributes: { presence: 0, might: 0, endurance: 0, intellect: 0, perception: 0 },
        skills: { negotiation: 0, survival: 0, melee: 0 },
        traits: { ambition: 0, empathy: 0, discipline: 0 },
      }
      const result = calculateWeightedConfidence(weakNpc, 'lead-group', DEFAULT_INTENTION_WEIGHTS['lead-group'])
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(100)
    })
  })

  describe('adjustWeightsOnSuccess', () => {
    it('increases weights for high attributes', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: JSON.parse(JSON.stringify(DEFAULT_INTENTION_WEIGHTS['scout-ahead'])),
        successCount: 0,
        failureCount: 0,
        lastExecutionDay: 0,
        weightAdjustmentHistory: [],
      }
      const npc = {
        attributes: { perception: 75, agility: 60 },
        skills: { survival: 70 },
        traits: { curiosity: 65 },
      }
      const newWeights = adjustWeightsOnSuccess(profile, npc)
      expect(newWeights.attributeWeights.perception).toBeGreaterThan(1.3)
      expect(newWeights.skillWeights.survival).toBeGreaterThan(1.3)
    })

    it('applies 5% adjustment per success', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: JSON.parse(JSON.stringify(DEFAULT_INTENTION_WEIGHTS['scout-ahead'])),
        successCount: 0,
        failureCount: 0,
        lastExecutionDay: 0,
        weightAdjustmentHistory: [],
      }
      const npc = {
        attributes: { perception: 80 },
        skills: { survival: 50 },
        traits: { curiosity: 50 },
      }
      const newWeights = adjustWeightsOnSuccess(profile, npc)
      expect(newWeights.attributeWeights.perception).toBe(1.35) // 1.3 + 0.05
    })
  })

  describe('adjustWeightsOnFailure', () => {
    it('decreases weights for low attributes', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: JSON.parse(JSON.stringify(DEFAULT_INTENTION_WEIGHTS['scout-ahead'])),
        successCount: 0,
        failureCount: 0,
        lastExecutionDay: 0,
        weightAdjustmentHistory: [],
      }
      const npc = {
        attributes: { perception: 30, agility: 35 },
        skills: { survival: 25 },
        traits: { curiosity: 40 },
      }
      const newWeights = adjustWeightsOnFailure(profile, npc)
      expect(newWeights.attributeWeights.perception).toBeLessThan(1.3)
      expect(newWeights.skillWeights.survival).toBeLessThan(1.3)
    })

    it('applies 3% adjustment per failure', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: JSON.parse(JSON.stringify(DEFAULT_INTENTION_WEIGHTS['scout-ahead'])),
        successCount: 0,
        failureCount: 0,
        lastExecutionDay: 0,
        weightAdjustmentHistory: [],
      }
      const npc = {
        attributes: { perception: 30 },
        skills: { survival: 50 },
        traits: { curiosity: 50 },
      }
      const newWeights = adjustWeightsOnFailure(profile, npc)
      expect(newWeights.attributeWeights.perception).toBe(1.27) // 1.3 - 0.03
    })

    it('clamps weights to minimum 0.3', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: {
          attributeWeights: { perception: 0.3 },
          skillWeights: {},
          traitWeights: {},
        },
        successCount: 0,
        failureCount: 0,
        lastExecutionDay: 0,
        weightAdjustmentHistory: [],
      }
      const npc = {
        attributes: { perception: 20 },
        skills: {},
        traits: {},
      }
      const newWeights = adjustWeightsOnFailure(profile, npc)
      expect(newWeights.attributeWeights.perception).toBe(0.3) // Not below minimum
    })
  })

  describe('getSuccessRate', () => {
    it('returns 0.5 for new intentions with no history', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: DEFAULT_INTENTION_WEIGHTS['scout-ahead'],
        successCount: 0,
        failureCount: 0,
        lastExecutionDay: 0,
        weightAdjustmentHistory: [],
      }
      expect(getSuccessRate(profile)).toBe(0.5)
    })

    it('calculates correct success rate', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: DEFAULT_INTENTION_WEIGHTS['scout-ahead'],
        successCount: 8,
        failureCount: 2,
        lastExecutionDay: 10,
        weightAdjustmentHistory: [],
      }
      expect(getSuccessRate(profile)).toBe(0.8)
    })
  })

  describe('hasDevelopedStyle', () => {
    it('returns false for insufficient history (< 5 executions)', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: DEFAULT_INTENTION_WEIGHTS['scout-ahead'],
        successCount: 3,
        failureCount: 1,
        lastExecutionDay: 5,
        weightAdjustmentHistory: [],
      }
      expect(hasDevelopedStyle(profile)).toBe(false)
    })

    it('returns true for high success rate (> 0.6)', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: DEFAULT_INTENTION_WEIGHTS['scout-ahead'],
        successCount: 8,
        failureCount: 2,
        lastExecutionDay: 10,
        weightAdjustmentHistory: [],
      }
      expect(hasDevelopedStyle(profile)).toBe(true)
    })

    it('returns true for low success rate (< 0.4)', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: DEFAULT_INTENTION_WEIGHTS['scout-ahead'],
        successCount: 2,
        failureCount: 8,
        lastExecutionDay: 10,
        weightAdjustmentHistory: [],
      }
      expect(hasDevelopedStyle(profile)).toBe(true)
    })

    it('returns false for average success rate (0.4-0.6)', () => {
      const profile: IntentionProfile = {
        intentionType: 'scout-ahead',
        weights: DEFAULT_INTENTION_WEIGHTS['scout-ahead'],
        successCount: 5,
        failureCount: 5,
        lastExecutionDay: 10,
        weightAdjustmentHistory: [],
      }
      expect(hasDevelopedStyle(profile)).toBe(false)
    })
  })
})
