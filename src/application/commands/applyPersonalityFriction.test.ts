import { describe, it, expect } from 'vitest'
import { applyPersonalityFriction } from './applyPersonalityFriction'
import { initialStateWithIda } from './testFixtures'
import type { NpcRuntimeState } from '../../domain'

const noop = () => 0

const baseTraits = {
  discipline: 50,
  ambition: 50,
  empathy: 50,
  ruthlessness: 30,
  prudence: 50,
  curiosity: 30,
  dominance: 50,
  loyalty: 50,
  vanity: 20,
  zeal: 20,
}

function makeNpc(partial: Partial<NpcRuntimeState> & { npcId: string; name: string }): NpcRuntimeState {
  const { npcId, name, ...overrides } = partial
  return {
    npcId,
    name,
    status: 'mercenary',
    assignment: 'idle',
    assignedDistrictId: null,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
    attributes: {
      might: 50, agility: 50, endurance: 50, intellect: 50,
      perception: 50, presence: 50, resolve: 50,
    },
    skills: {
      melee: 30, ranged: 30, medicine: 10, administration: 10,
      engineering: 10, negotiation: 10, survival: 10, security: 10,
      crafting: 10, performance: 10, academics: 10, intrigue: 10,
    },
    traits: { ...baseTraits, ...partial.traits },
    states: {
      health: 80, fatigue: 20, stress: 20, morale: 60,
      fear: 10, anger: 10, hunger: 20,
      intoxication: 0, hygiene: 60,
    },
    loadout: {
      primaryWeaponId: null, secondaryWeaponId: null,
      armorId: null, accessoryIds: [], consumableIds: [],
    },
    npcMemory: [],
    npcArc: null,
    ...overrides,
  } as NpcRuntimeState
}

function stateWithNpcs(...npcs: NpcRuntimeState[]) {
  return { ...initialStateWithIda, npcRuntimeStates: npcs }
}

describe('applyPersonalityFriction', () => {
  describe('dominance rivalry (Rule 1)', () => {
    it('fires event-npc-dominance-tension when both dominance >65 and same title status', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'Alpha', traits: { ...baseTraits, dominance: 70 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'Beta', traits: { ...baseTraits, dominance: 70 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      expect(result.pendingEvents.some((e) => e.eventId === 'event-npc-dominance-tension')).toBe(true)
      expect(
        result.pendingEvents.find((e) => e.eventId === 'event-npc-dominance-tension')?.instanceId,
      ).toBeTruthy()
    })

    it('does not fire dominance event when one NPC has a title (title differentiation)', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'Alpha', traits: { ...baseTraits, dominance: 70 }, activeTitle: 'title-enforcer' })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'Beta', traits: { ...baseTraits, dominance: 70 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      expect(result.pendingEvents.some((e) => e.eventId === 'event-npc-dominance-tension')).toBe(false)
    })

    it('does not fire when dominance is at 65 (threshold is >65, not >=)', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'Alpha', traits: { ...baseTraits, dominance: 65 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'Beta', traits: { ...baseTraits, dominance: 70 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      expect(result.pendingEvents.some((e) => e.eventId === 'event-npc-dominance-tension')).toBe(false)
    })
  })

  describe('moral methods disagreement (Rule 2)', () => {
    it('fires event-npc-methods-disagreement when one ruthlessness >60 and other empathy >60', () => {
      // Both dom<=65 so R1 does not block this
      const ruthless = makeNpc({ npcId: 'npc-r', name: 'Ruthless', traits: { ...baseTraits, ruthlessness: 65, dominance: 50 } })
      const empathic = makeNpc({ npcId: 'npc-e', name: 'Empathic', traits: { ...baseTraits, empathy: 65, dominance: 50 } })
      const state = stateWithNpcs(ruthless, empathic)
      const result = applyPersonalityFriction(state, noop)
      expect(result.pendingEvents.some((e) => e.eventId === 'event-npc-methods-disagreement')).toBe(true)
    })

    it('fires when the ruthless and empathic roles are reversed', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, empathy: 70, dominance: 50 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, ruthlessness: 65, dominance: 50 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      expect(result.pendingEvents.some((e) => e.eventId === 'event-npc-methods-disagreement')).toBe(true)
    })

    it('does not fire when both have dominance >65 (dominance rivalry fires first)', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, dominance: 70, ruthlessness: 65 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, dominance: 70, empathy: 65 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      // Dominance rivalry fires first for this pair
      expect(result.pendingEvents.some((e) => e.eventId === 'event-npc-dominance-tension')).toBe(true)
      expect(result.pendingEvents.some((e) => e.eventId === 'event-npc-methods-disagreement')).toBe(false)
    })
  })

  describe('ambition rivalry (Rule 3)', () => {
    it('fires event-npc-ambition-comparison when both ambition >65 and neither has a title', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, ambition: 70, dominance: 50 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, ambition: 70, dominance: 50 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      expect(result.pendingEvents.some((e) => e.eventId === 'event-npc-ambition-comparison')).toBe(true)
    })

    it('does not fire ambition rivalry when one NPC already has a title', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, ambition: 70 }, activeTitle: 'title-enforcer' })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, ambition: 70 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      expect(result.pendingEvents.some((e) => e.eventId === 'event-npc-ambition-comparison')).toBe(false)
    })
  })

  describe('bonding: late conversation', () => {
    it('applies affinity +3 and trust +2 when both curiosity >55 and score >20', () => {
      // Both high empathy (both >60) → R2 gives +12, baseline +10 → score=22 > 20
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, curiosity: 60, empathy: 70 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, curiosity: 60, empathy: 70 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      const keyAB = 'npc-a-to-npc-b'
      const keyBA = 'npc-b-to-npc-a'
      expect(result.relationships[keyAB]?.affinity).toBeGreaterThanOrEqual(3)
      expect(result.relationships[keyAB]?.trust).toBeGreaterThanOrEqual(2)
      expect(result.relationships[keyBA]?.affinity).toBeGreaterThanOrEqual(3)
      expect(result.relationships[keyBA]?.trust).toBeGreaterThanOrEqual(2)
    })

    it('adds an activity log entry for the late conversation', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'Anya', traits: { ...baseTraits, curiosity: 60, empathy: 70 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'Bora', traits: { ...baseTraits, curiosity: 60, empathy: 70 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      expect(result.activityLog.some((e) => /lamps went out/i.test(e.message))).toBe(true)
    })

    it('does not fire late conversation when curiosity is at 55 (threshold is >55)', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, curiosity: 55, empathy: 70 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, curiosity: 60, empathy: 70 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      expect(result.activityLog.some((e) => /lamps went out/i.test(e.message))).toBe(false)
    })

    it('does not fire bonding when score is <= 20', () => {
      // Low empathy pair: score = 0 + baseline 10 = 10, not > 20
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, curiosity: 60 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, curiosity: 60 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      expect(result.activityLog.some((e) => /lamps went out/i.test(e.message))).toBe(false)
    })
  })

  describe('cooldown deduplication', () => {
    it('does not re-fire dominance event within 14-day cooldown', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, dominance: 70 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, dominance: 70 } })
      const state = stateWithNpcs(npcA, npcB)
      const firstResult = applyPersonalityFriction(state, noop)
      expect(firstResult.pendingEvents.some((e) => e.eventId === 'event-npc-dominance-tension')).toBe(true)

      // Re-run on same day (cooldown active)
      const secondState = { ...firstResult, pendingEvents: [] }
      const secondResult = applyPersonalityFriction(secondState, noop)
      expect(secondResult.pendingEvents.some((e) => e.eventId === 'event-npc-dominance-tension')).toBe(false)
    })

    it('re-fires after the 14-day cooldown expires', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, dominance: 70 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, dominance: 70 } })
      const state = { ...stateWithNpcs(npcA, npcB), day: 1 }
      const firstResult = applyPersonalityFriction(state, noop)

      // 14 days later — cooldown just expired (day 1 + 14 = day 15, difference = 14 → not < 14)
      const laterState = { ...firstResult, pendingEvents: [], day: 15 }
      const laterResult = applyPersonalityFriction(laterState, noop)
      expect(laterResult.pendingEvents.some((e) => e.eventId === 'event-npc-dominance-tension')).toBe(true)
    })

    it('does not re-fire bonding event within 7-day cooldown', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, curiosity: 60, empathy: 70 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, curiosity: 60, empathy: 70 } })
      const state = stateWithNpcs(npcA, npcB)
      const firstResult = applyPersonalityFriction(state, noop)
      // Remove pending events and re-run on same day
      const secondState = { ...firstResult, pendingEvents: [] }
      const secondResult = applyPersonalityFriction(secondState, noop)
      // No new affinity gain beyond what was applied the first time
      expect(secondResult.activityLog.filter((e) => /lamps went out/i.test(e.message))).toHaveLength(1)
    })
  })

  describe('max-2 events per cycle cap', () => {
    it('generates at most 2 events when multiple pairs qualify', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, dominance: 70 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, dominance: 70 } })
      const npcC = makeNpc({ npcId: 'npc-c', name: 'C', traits: { ...baseTraits, dominance: 70 } })
      // 3 NPCs: pairs (A,B), (A,C), (B,C) all qualify for dominance rivalry
      const state = stateWithNpcs(npcA, npcB, npcC)
      const result = applyPersonalityFriction(state, noop)
      const frictionEvents = result.pendingEvents.filter((e) => e.eventId === 'event-npc-dominance-tension')
      expect(frictionEvents).toHaveLength(2)
    })
  })

  describe('eligibility', () => {
    it('excludes recovering NPCs', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, dominance: 70 }, assignment: 'recovering' })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, dominance: 70 } })
      const state = stateWithNpcs(npcA, npcB)
      const result = applyPersonalityFriction(state, noop)
      expect(result.pendingEvents.some((e) => e.eventId === 'event-npc-dominance-tension')).toBe(false)
    })

    it('returns state unchanged when fewer than 2 eligible NPCs', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, dominance: 70 } })
      const state = stateWithNpcs(npcA)
      const result = applyPersonalityFriction(state, noop)
      expect(result).toEqual(state)
    })
  })

  describe('cooldown key is pair-order-independent', () => {
    it('same cooldown applies regardless of which NPC is A or B', () => {
      const npcA = makeNpc({ npcId: 'npc-a', name: 'A', traits: { ...baseTraits, dominance: 70 } })
      const npcB = makeNpc({ npcId: 'npc-b', name: 'B', traits: { ...baseTraits, dominance: 70 } })
      // First run: fires event
      const state1 = stateWithNpcs(npcA, npcB)
      const result1 = applyPersonalityFriction(state1, noop)
      // Second run with reversed roster order
      const state2 = { ...result1, pendingEvents: [], npcRuntimeStates: [npcB, npcA] }
      const result2 = applyPersonalityFriction(state2, noop)
      expect(result2.pendingEvents.some((e) => e.eventId === 'event-npc-dominance-tension')).toBe(false)
    })
  })
})
