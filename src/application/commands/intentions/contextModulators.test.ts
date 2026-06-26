/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest'
import {
  buildIntentionContext,
  applyContextModifiers,
  getContextInhibitedIntentions,
  CONTEXT_MULTIPLIERS,
} from './contextModulators'
import type { IntentionContext } from './contextModulators'

describe('Context Modulators', () => {
  const createTestState = (
    districtTensionOverrides?: Record<string, number>,
    rosterOverrides?: unknown[],
  ): unknown => ({
    day: 10,
    timeSlot: 'morning',
    currentDistrictId: 'district-the-pale',
    districtTension: { 'district-the-pale': 50, ...(districtTensionOverrides || {}) },
    roster: rosterOverrides || [],
    cityResources: {
      foodSecurity: 60,
      foodStock: 100,
      foodCapacity: 200,
      waterAccess: 50,
      materialStock: 100,
      corridorStatus: 'open',
      corridorClearanceProgressDays: 0,
      activeCoalitions: [],
      coalitionHistory: [],
    },
    relationships: {},
    activeQuests: [],
  })

  describe('buildIntentionContext', () => {
    it('builds context from game state', () => {
      const state = createTestState(
        { 'district-the-pale': 30 },
        [{ npcId: 'npc-test', states: { stress: 30, morale: 80 } }],
      )
      const context = buildIntentionContext(state as any, 'npc-test')
      expect(context.districtSafety).toBe(70)
      expect(context.npcRelationshipState).toBe('euphoric')
    })

    it('detects stressed state', () => {
      const state = createTestState(
        {},
        [{ npcId: 'npc-test', states: { stress: 70, morale: 50 } }],
      )
      const context = buildIntentionContext(state as any, 'npc-test')
      expect(context.npcRelationshipState).toBe('stressed')
    })

    it('detects lonely state', () => {
      const state = createTestState(
        {},
        [{ npcId: 'npc-test', states: { stress: 30, morale: 30 } }],
      )
      const context = buildIntentionContext(state as any, 'npc-test')
      expect(context.npcRelationshipState).toBe('lonely')
    })

    it('uses default values when NPC not found', () => {
      const state = createTestState()
      const context = buildIntentionContext(state as unknown as any, 'nonexistent-npc')
      expect(context.npcRelationshipState).toBe('content')
      expect(context.districtSafety).toBe(50)
    })
  })

  describe('applyContextModifiers', () => {
    const createContext = (overrides: Partial<IntentionContext> = {}): IntentionContext => ({
      timeOfDay: 'afternoon',
      districtSafety: 50,
      npcRelationshipState: 'content',
      hasActiveQuests: false,
      ...overrides,
    })

    it('applies morning multiplier to train-self', () => {
      const context = createContext({ timeOfDay: 'morning' })
      const modified = applyContextModifiers(100, 'train-self', context)
      expect(modified).toBe(182)
    })

    it('applies evening multiplier to flirt-with', () => {
      const context = createContext({ timeOfDay: 'evening' })
      const modified = applyContextModifiers(100, 'flirt-with', context)
      expect(modified).toBe(140)
    })

    it('applies night multiplier to sleep', () => {
      const context = createContext({ timeOfDay: 'night' })
      const modified = applyContextModifiers(100, 'sleep', context)
      expect(modified).toBe(150)
    })

    it('applies unsafe district multiplier to protect-house', () => {
      const context = createContext({ districtSafety: 30 })
      const modified = applyContextModifiers(100, 'protect-house', context)
      expect(modified).toBe(150)
    })

    it('applies stressed state multiplier to meditate', () => {
      const context = createContext({ npcRelationshipState: 'stressed' })
      const modified = applyContextModifiers(100, 'meditate', context)
      expect(modified).toBe(160)
    })

    it('applies multiple modifiers cumulatively', () => {
      const context = createContext({
        timeOfDay: 'morning',
        districtSafety: 80,
        npcRelationshipState: 'content',
      })
      const modified = applyContextModifiers(100, 'train-self', context)
      expect(modified).toBe(218)
    })

    it('returns base score when no modifiers apply', () => {
      const context = createContext()
      const modified = applyContextModifiers(100, 'eat-meal', context)
      expect(modified).toBe(100)
    })
  })

  describe('getContextInhibitedIntentions', () => {
    it('returns night-inhibited intentions', () => {
      const context: IntentionContext = {
        timeOfDay: 'night',
        districtSafety: 50,
        npcRelationshipState: 'content',
        hasActiveQuests: false,
      }
      const inhibited = getContextInhibitedIntentions(context)
      expect(inhibited).toContain('scavenge')
      expect(inhibited).toContain('patrol-district')
      expect(inhibited).toContain('shop-for-goods')
    })

    it('returns unsafe district inhibited intentions', () => {
      const context: IntentionContext = {
        timeOfDay: 'afternoon',
        districtSafety: 20,
        npcRelationshipState: 'content',
        hasActiveQuests: false,
      }
      const inhibited = getContextInhibitedIntentions(context)
      expect(inhibited).toContain('scavenge')
      expect(inhibited).toContain('host-gathering')
      expect(inhibited).toContain('socialize')
    })

    it('returns stressed state inhibited intentions', () => {
      const context: IntentionContext = {
        timeOfDay: 'afternoon',
        districtSafety: 50,
        npcRelationshipState: 'stressed',
        hasActiveQuests: false,
      }
      const inhibited = getContextInhibitedIntentions(context)
      expect(inhibited).toContain('confront-rival')
      expect(inhibited).toContain('assert-dominance')
      expect(inhibited).toContain('challenge-authority')
    })

    it('combines all inhibited intentions', () => {
      const context: IntentionContext = {
        timeOfDay: 'night',
        districtSafety: 20,
        npcRelationshipState: 'stressed',
        hasActiveQuests: false,
      }
      const inhibited = getContextInhibitedIntentions(context)
      expect(inhibited.length).toBeGreaterThan(5)
    })
  })

  describe('CONTEXT_MULTIPLIERS structure', () => {
    it('has time of day multipliers', () => {
      expect(CONTEXT_MULTIPLIERS.morning).toBeDefined()
      expect(CONTEXT_MULTIPLIERS.afternoon).toBeDefined()
      expect(CONTEXT_MULTIPLIERS.evening).toBeDefined()
      expect(CONTEXT_MULTIPLIERS.night).toBeDefined()
    })

    it('has relationship state multipliers', () => {
      expect(CONTEXT_MULTIPLIERS.lonely).toBeDefined()
      expect(CONTEXT_MULTIPLIERS.content).toBeDefined()
      expect(CONTEXT_MULTIPLIERS.stressed).toBeDefined()
      expect(CONTEXT_MULTIPLIERS.euphoric).toBeDefined()
    })

    it('has district safety multipliers', () => {
      expect(CONTEXT_MULTIPLIERS.unsafe).toBeDefined()
      expect(CONTEXT_MULTIPLIERS.safe).toBeDefined()
    })
  })
})
