import { describe, expect, it } from 'vitest'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { acceptWard, advanceWardStage, formalizeAdultWard, tickWardStages } from './houseWard'
import type { WardOriginId } from './houseWard'
type WardOrigin = WardOriginId

describe('houseWard commands', () => {
  describe('acceptWard', () => {
    it('accepts a new child ward into the household', () => {
      const state = initialGameStateSnapshot
      const result = acceptWard(state, 'npc-new-ward-1', 'Tommy', 'ward-origin-street-orphan')

      expect(result.house.houseHeirs).toHaveLength(1)
      expect(result.house.houseHeirs[0]?.name).toBe('Tommy')
      expect(result.house.houseHeirs[0]?.stage).toBe('child')
      expect(result.house.houseHeirs[0]?.originStory).toContain('sheltering in the manor yard')
    })

    it('accepts a debt settlement ward', () => {
      const state = initialGameStateSnapshot
      const result = acceptWard(state, 'npc-new-ward-2', 'Sarah', 'ward-origin-debt-settlement')

      expect(result.house.houseHeirs).toHaveLength(1)
      expect(result.house.houseHeirs[0]?.stage).toBe('ward')
    })

    it('accepts a guild apprentice ward', () => {
      const state = initialGameStateSnapshot
      const result = acceptWard(state, 'npc-new-ward-3', 'Marcus', 'ward-origin-guild-apprentice')

      expect(result.house.houseHeirs).toHaveLength(1)
      expect(result.house.houseHeirs[0]?.stage).toBe('apprentice')
    })

    it('rejects ward if house already has 2 wards', () => {
      const state = {
        ...initialGameStateSnapshot,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'First', stage: 'child' as const, arrivalDay: 1, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
            { id: 'heir-2', name: 'Second', stage: 'child' as const, arrivalDay: 1, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = acceptWard(state, 'npc-new-ward', 'New', 'ward-origin-street-orphan')

      expect(result.house.houseHeirs).toHaveLength(2)
    })

    it('rejects ward with invalid origin ID', () => {
      const state = initialGameStateSnapshot
      const result = acceptWard(state, 'npc-new-ward', 'Test', 'invalid-origin' as unknown as WardOrigin)

      expect(result.house.houseHeirs).toHaveLength(0)
    })

    it('records activity log entry when ward is accepted', () => {
      const state = initialGameStateSnapshot
      const result = acceptWard(state, 'npc-new-ward-1', 'Tommy', 'ward-origin-street-orphan')

      const logEntry = result.activityLog.find(e => e.message.includes('Tommy joins'))
      expect(logEntry).toBeDefined()
    })
  })

  describe('advanceWardStage', () => {
    it('does not advance ward before duration requirement', () => {
      const state = {
        ...initialGameStateSnapshot,
        day: 10,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'Tommy', stage: 'child' as const, arrivalDay: 5, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = advanceWardStage(state, 'heir-1')

      expect(result.house.houseHeirs[0]?.stage).toBe('child')
    })

    it('advances ward from child to ward after 30 days', () => {
      const state = {
        ...initialGameStateSnapshot,
        day: 35,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'Tommy', stage: 'child' as const, arrivalDay: 5, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = advanceWardStage(state, 'heir-1')

      expect(result.house.houseHeirs[0]?.stage).toBe('ward')
    })

    it('advances ward from ward to apprentice after 60 days', () => {
      const state = {
        ...initialGameStateSnapshot,
        day: 100,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'Tommy', stage: 'ward' as const, arrivalDay: 40, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = advanceWardStage(state, 'heir-1')

      expect(result.house.houseHeirs[0]?.stage).toBe('apprentice')
    })

    it('advances ward from apprentice to adult after 90 days', () => {
      const state = {
        ...initialGameStateSnapshot,
        day: 200,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'Tommy', stage: 'apprentice' as const, arrivalDay: 100, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = advanceWardStage(state, 'heir-1')

      expect(result.house.houseHeirs[0]?.stage).toBe('adult')
    })

    it('does not advance adult wards', () => {
      const state = {
        ...initialGameStateSnapshot,
        day: 300,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'Tommy', stage: 'adult' as const, arrivalDay: 200, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = advanceWardStage(state, 'heir-1')

      expect(result.house.houseHeirs[0]?.stage).toBe('adult')
    })

    it('does nothing for non-existent ward', () => {
      const state = initialGameStateSnapshot
      const result = advanceWardStage(state, 'non-existent-id')

      expect(result.house.houseHeirs).toHaveLength(0)
    })

    it('records activity log entry on stage advancement', () => {
      const state = {
        ...initialGameStateSnapshot,
        day: 35,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'Tommy', stage: 'child' as const, arrivalDay: 5, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = advanceWardStage(state, 'heir-1')

      const logEntry = result.activityLog.find(e => e.message.includes('ward'))
      expect(logEntry).toBeDefined()
    })

    it('resets arrivalDay when stage advances', () => {
      const state = {
        ...initialGameStateSnapshot,
        day: 35,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'Tommy', stage: 'child' as const, arrivalDay: 5, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = advanceWardStage(state, 'heir-1')

      expect(result.house.houseHeirs[0]?.arrivalDay).toBe(35)
    })
  })

  describe('formalizeAdultWard', () => {
    it('formalizes an adult ward into the NPC roster', () => {
      const state = {
        ...initialGameStateSnapshot,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'npc-formalized-1', name: 'Tommy', stage: 'adult' as const, arrivalDay: 1, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const baseNpc = {
        name: 'Tommy',
        status: 'citizen' as const,
        assignment: 'idle' as const,
        assignedDistrictId: null,
        roomAssignment: null,
        dutyPostRoomId: null,
        activeTitle: null,
        wagesOwedDays: 0,
        trainingFocus: null,
        attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
        skills: { melee: 50, ranged: 50, medicine: 50, administration: 50, engineering: 50, negotiation: 50, survival: 50, security: 50, crafting: 50, performance: 50, academics: 50, intrigue: 50 },
        traits: { discipline: 50, ambition: 50, empathy: 50, ruthlessness: 50, prudence: 50, curiosity: 50, dominance: 50, loyalty: 50, vanity: 50, zeal: 50 },
        states: { health: 100, fatigue: 0, stress: 0, morale: 100, fear: 0, anger: 0, hunger: 0, injury: 0, intoxication: 0, hygiene: 0 },
        loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
        equipment: { weapon: null, armor: null, accessory: [] },
        personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
        clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
        armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
        npcMemory: [],
        factionRelationships: [],
        wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
        arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
        bondStatus: null,
        npcArc: null,
        currentDirectiveId: null,
        directiveDeadlineDay: null,
        currentEmployment: null,
        currentIntention: null,
        captivityState: undefined,
        pregnancyState: undefined,
      }
      const result = formalizeAdultWard(state, 'npc-formalized-1', baseNpc)

      expect(result.house.houseHeirs).toHaveLength(0)
      expect(result.roster.some(n => n.npcId === 'npc-formalized-1')).toBe(true)
    })

    it('does not formalize non-adult ward', () => {
      const state = {
        ...initialGameStateSnapshot,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'npc-child', name: 'Tommy', stage: 'child' as const, arrivalDay: 1, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = formalizeAdultWard(state, 'npc-child', {
        name: 'Tommy',
        status: 'ward' as const,
        assignment: 'idle' as const,
        assignedDistrictId: null,
        roomAssignment: null,
        dutyPostRoomId: null,
        activeTitle: null,
        wagesOwedDays: 0,
        trainingFocus: null,
        attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
        skills: { melee: 50, ranged: 50, medicine: 50, administration: 50, engineering: 50, negotiation: 50, survival: 50, security: 50, crafting: 50, performance: 50, academics: 50, intrigue: 50 },
        traits: { discipline: 50, ambition: 50, empathy: 50, ruthlessness: 50, prudence: 50, curiosity: 50, dominance: 50, loyalty: 50, vanity: 50, zeal: 50 },
        states: { health: 100, fatigue: 0, stress: 0, morale: 100, fear: 0, anger: 0, hunger: 0, injury: 0, intoxication: 0, hygiene: 0 },
        loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
        equipment: { weapon: null, armor: null, accessory: [] },
        personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
        clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
        armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
        npcMemory: [],
        factionRelationships: [],
        wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
        arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
        bondStatus: null,
        npcArc: null,
        currentDirectiveId: null,
        directiveDeadlineDay: null,
        currentEmployment: null,
        currentIntention: null,
        captivityState: undefined,
        pregnancyState: undefined,
      })

      expect(result.house.houseHeirs).toHaveLength(1)
      expect(result.roster.some(n => n.npcId === 'npc-child')).toBe(false)
    })

    it('does not formalize non-existent ward', () => {
      const state = initialGameStateSnapshot
      const result = formalizeAdultWard(state, 'non-existent', {
        name: 'Test',
        status: 'citizen' as const,
        assignment: 'idle' as const,
        assignedDistrictId: null,
        roomAssignment: null,
        dutyPostRoomId: null,
        activeTitle: null,
        wagesOwedDays: 0,
        trainingFocus: null,
        attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
        skills: { melee: 50, ranged: 50, medicine: 50, administration: 50, engineering: 50, negotiation: 50, survival: 50, security: 50, crafting: 50, performance: 50, academics: 50, intrigue: 50 },
        traits: { discipline: 50, ambition: 50, empathy: 50, ruthlessness: 50, prudence: 50, curiosity: 50, dominance: 50, loyalty: 50, vanity: 50, zeal: 50 },
        states: { health: 100, fatigue: 0, stress: 0, morale: 100, fear: 0, anger: 0, hunger: 0, injury: 0, intoxication: 0, hygiene: 0 },
        loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
        equipment: { weapon: null, armor: null, accessory: [] },
        personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
        clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
        armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
        npcMemory: [],
        factionRelationships: [],
        wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
        arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
        bondStatus: null,
        npcArc: null,
        currentDirectiveId: null,
        directiveDeadlineDay: null,
        currentEmployment: null,
        currentIntention: null,
        captivityState: undefined,
        pregnancyState: undefined,
      })

      expect(result.house.houseHeirs).toHaveLength(0)
      expect(result.roster.length).toBeGreaterThanOrEqual(0)
    })

    it('records activity log entry on formalization', () => {
      const state = {
        ...initialGameStateSnapshot,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'npc-formalized-2', name: 'Tommy', stage: 'adult' as const, arrivalDay: 1, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const baseNpc = {
        name: 'Tommy',
        status: 'citizen' as const,
        assignment: 'idle' as const,
        assignedDistrictId: null,
        roomAssignment: null,
        dutyPostRoomId: null,
        activeTitle: null,
        wagesOwedDays: 0,
        trainingFocus: null,
        attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
        skills: { melee: 50, ranged: 50, medicine: 50, administration: 50, engineering: 50, negotiation: 50, survival: 50, security: 50, crafting: 50, performance: 50, academics: 50, intrigue: 50 },
        traits: { discipline: 50, ambition: 50, empathy: 50, ruthlessness: 50, prudence: 50, curiosity: 50, dominance: 50, loyalty: 50, vanity: 50, zeal: 50 },
        states: { health: 100, fatigue: 0, stress: 0, morale: 100, fear: 0, anger: 0, hunger: 0, injury: 0, intoxication: 0, hygiene: 0 },
        loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
        equipment: { weapon: null, armor: null, accessory: [] },
        personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
        clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
        armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
        npcMemory: [],
        factionRelationships: [],
        wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
        arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
        bondStatus: null,
        npcArc: null,
        currentDirectiveId: null,
        directiveDeadlineDay: null,
        currentEmployment: null,
        currentIntention: null,
        captivityState: undefined,
        pregnancyState: undefined,
      }
      const result = formalizeAdultWard(state, 'npc-formalized-2', baseNpc)

      const logEntry = result.activityLog.find(e => e.message.includes('now a full member'))
      expect(logEntry).toBeDefined()
    })
  })

  describe('tickWardStages', () => {
    it('checks all wards for stage advancement', () => {
      const state = {
        ...initialGameStateSnapshot,
        day: 100,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'Tommy', stage: 'child' as const, arrivalDay: 5, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
            { id: 'heir-2', name: 'Sarah', stage: 'ward' as const, arrivalDay: 30, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = tickWardStages(state)

      expect(result.house.houseHeirs[0]?.stage).toBe('ward')
      expect(result.house.houseHeirs[1]?.stage).toBe('apprentice')
    })

    it('skips adult wards during tick', () => {
      const state = {
        ...initialGameStateSnapshot,
        day: 500,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'Tommy', stage: 'adult' as const, arrivalDay: 200, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = tickWardStages(state)

      expect(result.house.houseHeirs[0]?.stage).toBe('adult')
    })

    it('handles empty household', () => {
      const state = initialGameStateSnapshot
      const result = tickWardStages(state)

      expect(result.house.houseHeirs).toHaveLength(0)
    })

    it('processes multiple wards independently', () => {
      const state = {
        ...initialGameStateSnapshot,
        day: 150,
        house: {
          ...initialGameStateSnapshot.house,
          houseHeirs: [
            { id: 'heir-1', name: 'Tommy', stage: 'child' as const, arrivalDay: 5, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
            { id: 'heir-2', name: 'Sarah', stage: 'child' as const, arrivalDay: 130, legitimacyStatus: 'unknown' as const, birthContext: null, originStory: 'Test ward' },
          ],
        },
      }
      const result = tickWardStages(state)

      expect(result.house.houseHeirs[0]?.stage).toBe('ward')
      expect(result.house.houseHeirs[1]?.stage).toBe('child')
    })
  })
})
