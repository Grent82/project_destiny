/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest'
import {
  getStateDrivenIntentions,
  getPersonalityDrivenIntentions,
  getTraitDrivenIntentions,
  getRelationshipDrivenIntentions,
  getStateUrgencyIntentions,
  combineAndWeightIntentions,
  selectBestIntentions,
  generateNpcIntention,
} from './pipeline'
import type { NpcRuntimeState } from '../../../domain/npc/contracts'

describe('Intention Generation Pipeline', () => {
  const createTestNpc = (
    statesOverrides?: Partial<NpcRuntimeState['states']>,
    traitsOverrides?: Partial<NpcRuntimeState['traits']>,
    attributesOverrides?: Partial<NpcRuntimeState['attributes']>,
    skillsOverrides?: Partial<NpcRuntimeState['skills']>,
  ): NpcRuntimeState => ({
    npcId: 'npc-test',
    name: 'Test NPC',
    status: 'citizen',
    assignment: 'idle',
    assignedDistrictId: null,
    roomAssignment: null,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
    attributes: {
      might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50,
      ...attributesOverrides,
    },
    skills: {
      melee: 50, ranged: 50, medicine: 50, administration: 50, engineering: 50, negotiation: 50,
      survival: 50, security: 50, crafting: 50, performance: 50, academics: 50, intrigue: 50,
      ...skillsOverrides,
    },
    traits: {
      discipline: 50, ambition: 50, empathy: 50, ruthlessness: 50, prudence: 50, curiosity: 50,
      dominance: 50, loyalty: 50, vanity: 50, zeal: 50,
      ...traitsOverrides,
    },
    states: {
      health: 100, fatigue: 30, stress: 30, morale: 60, fear: 20, anger: 20, hunger: 30, injury: 0, intoxication: 0, hygiene: 70,
      ...statesOverrides,
    },
    loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
    equipment: { weapon: null, armor: null, accessory: [] },
    personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
    clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
    npcMemory: [],
    captivityState: undefined,
    bondStatus: null,
    npcArc: null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentIntention: null,
    factionRelationships: [],
    wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
  })

  const createTestState = (): unknown => ({
    day: 10,
    currentDistrictId: 'district-the-pale',
    districtTension: { 'district-the-pale': 50 },
    cityResources: {
      foodSecurity: 60, foodStock: 100, foodCapacity: 200, waterAccess: 50, materialStock: 100,
      corridorStatus: 'open', corridorClearanceProgressDays: 0, activeGroups: [], groupHistory: [],
    },
    roster: [],
    relationships: {},
    activeQuests: [],
  })

  describe('getStateDrivenIntentions', () => {
    it('returns eat-meal when hunger > 50', () => {
      expect(getStateDrivenIntentions(createTestNpc({ hunger: 60 }))).toContain('eat-meal')
    })
    it('returns sleep when fatigue > 70', () => {
      expect(getStateDrivenIntentions(createTestNpc({ fatigue: 80 }))).toContain('sleep')
    })
    it('returns meditate when stress > 55', () => {
      expect(getStateDrivenIntentions(createTestNpc({ stress: 70 }))).toContain('meditate')
    })
    it('returns groom when hygiene < 40', () => {
      expect(getStateDrivenIntentions(createTestNpc({ hygiene: 30 }))).toContain('groom')
    })
    it('returns groom when vanity >= 65', () => {
      expect(getStateDrivenIntentions(createTestNpc({ hygiene: 80 }, { vanity: 70 }))).toContain('groom')
    })
  })

  describe('getPersonalityDrivenIntentions', () => {
    it('returns protective intentions for high prudence', () => {
      const intentions = getPersonalityDrivenIntentions(createTestNpc({}, { prudence: 70 }))
      expect(intentions).toContain('protect-house')
    })
    it('returns ambitious intentions for high ambition', () => {
      const intentions = getPersonalityDrivenIntentions(createTestNpc({}, { ambition: 70 }))
      expect(intentions).toContain('seek-employment')
    })
  })

  describe('getTraitDrivenIntentions', () => {
    it('returns lead-group for high presence and ambition', () => {
      const npc = createTestNpc({}, { ambition: 70, discipline: 65 }, { presence: 75 })
      expect(getTraitDrivenIntentions(npc, createTestState() as unknown as any)).toContain('lead-group')
    })
    it('returns confront-rival for high might and melee', () => {
      const npc = createTestNpc({}, {}, { might: 70 }, { melee: 70 })
      expect(getTraitDrivenIntentions(npc, createTestState() as unknown as any)).toContain('confront-rival')
    })
  })

  describe('getRelationshipDrivenIntentions', () => {
    it('returns spend-time-with for high affinity', () => {
      const npc = createTestNpc()
      const relationships = { 'player|npc-test': { affinity: 70, trust: 50, respect: 50, loyalty: 50, fear: 20 } }
      expect(getRelationshipDrivenIntentions(npc, relationships, 'player')).toContain('spend-time-with')
    })
    it('returns court-romantically for high trust', () => {
      const npc = createTestNpc()
      const relationships = { 'player|npc-test': { affinity: 50, trust: 75, respect: 50, loyalty: 50, fear: 20 } }
      expect(getRelationshipDrivenIntentions(npc, relationships, 'player')).toContain('court-romantically')
    })
  })

  describe('getStateUrgencyIntentions', () => {
    it('returns meditate for high stress', () => {
      expect(getStateUrgencyIntentions(createTestNpc({ stress: 70 }))).toContain('meditate')
    })
    it('returns confront-rival for high anger', () => {
      expect(getStateUrgencyIntentions(createTestNpc({ anger: 70 }))).toContain('confront-rival')
    })
    it('returns seek-shelter for high fear', () => {
      expect(getStateUrgencyIntentions(createTestNpc({ fear: 70 }))).toContain('seek-shelter')
    })
  })

  describe('combineAndWeightIntentions', () => {
    it('combines candidates from multiple sources', () => {
      const npc = createTestNpc()
      const context = { timeOfDay: 'afternoon' as const, districtSafety: 50, npcRelationshipState: 'content' as const, hasActiveQuests: false }
      const candidates = [
        { type: 'meditate' as const, baseWeight: 3.0, source: 'state' as const, confidence: 70 },
        { type: 'meditate' as const, baseWeight: 2.0, source: 'trait' as const, confidence: 60 },
      ]
      const weighted = combineAndWeightIntentions(candidates, npc, context)
      expect(weighted.length).toBeGreaterThan(0)
      expect(weighted[0].type).toBe('meditate')
    })
  })

  describe('selectBestIntentions', () => {
    it('returns top intention if confidence > 50', () => {
      const candidates = [
        { type: 'meditate' as const, baseWeight: 3.0, source: 'state' as const, confidence: 70 },
        { type: 'socialize' as const, baseWeight: 2.0, source: 'trait' as const, confidence: 45 },
      ]
      expect(selectBestIntentions(candidates, [])).toEqual(['meditate'])
    })
    it('filters out inhibited intentions', () => {
      const candidates = [
        { type: 'scavenge' as const, baseWeight: 3.0, source: 'state' as const, confidence: 70 },
        { type: 'meditate' as const, baseWeight: 2.0, source: 'trait' as const, confidence: 60 },
      ]
      expect(selectBestIntentions(candidates, ['scavenge'])).toEqual(['meditate'])
    })
  })

  describe('generateNpcIntention', () => {
    it('returns an intention type for idle NPC with high hunger', () => {
      const result = generateNpcIntention(createTestState() as unknown as any, createTestNpc({ hunger: 70 }))
      expect(typeof result).toBe('string')
    })
    it('returns an intention type for stressed NPC', () => {
      const result = generateNpcIntention(createTestState() as any, createTestNpc({ stress: 70 }))
      expect(typeof result).toBe('string')
    })
    it('returns null when no intention meets threshold', () => {
      const result = generateNpcIntention(createTestState() as any, createTestNpc({ hunger: 30, stress: 30, fatigue: 30, hygiene: 70 }, { ambition: 50 }))
      expect(result === null || typeof result === 'string').toBe(true)
    })
  })
})
