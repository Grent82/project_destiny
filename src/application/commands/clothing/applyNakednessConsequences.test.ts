import { describe, it, expect } from 'vitest'
import { applyNakednessConsequences } from './applyNakednessConsequences'
import { initialGameStateSnapshot } from '../../store/initialGameState'
import type { GameState } from '../../../domain/game/contracts'

function createNakedNpc(
  npcId: string,
  name: string,
  roomAssignment: string | null = null,
  morale = 50,
  stress = 30,
) {
  return {
    npcId,
    name,
    status: 'citizen' as const,
    assignment: (roomAssignment ? 'working' : 'idle'),
    assignedDistrictId: roomAssignment ? null : 'district-the-pale',
    roomAssignment,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
    attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
    skills: { melee: 30, ranged: 30, medicine: 30, administration: 40, engineering: 30, negotiation: 30, survival: 30, security: 30, crafting: 30, performance: 20, academics: 30, intrigue: 30 },
    traits: { discipline: 40, ambition: 50, empathy: 50, ruthlessness: 20, prudence: 40, curiosity: 50, dominance: 30, loyalty: 50, vanity: 20, zeal: 20 },
    states: { health: 80, fatigue: 20, stress, morale, fear: 10, anger: 15, hunger: 20, injury: 0, intoxication: 0, hygiene: 60 },
    loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
    equipment: { weapon: null, armor: null, accessory: [] },
    personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
    clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
    npcMemory: [],
    npcArc: null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentIntention: null,
    factionRelationships: [],
    captivityState: undefined,
    pregnancyState: undefined,
    bondStatus: null,
    wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
  }
}

function createClothedNpc(
  npcId: string,
  name: string,
  morale = 50,
  stress = 30,
) {
  return {
    npcId,
    name,
    status: 'citizen' as const,
    assignment: 'idle' as const,
    assignedDistrictId: null,
    roomAssignment: 'room-quarters',
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
    attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
    skills: { melee: 30, ranged: 30, medicine: 30, administration: 40, engineering: 30, negotiation: 30, survival: 30, security: 30, crafting: 30, performance: 20, academics: 30, intrigue: 30 },
    traits: { discipline: 40, ambition: 50, empathy: 50, ruthlessness: 20, prudence: 40, curiosity: 50, dominance: 30, loyalty: 50, vanity: 20, zeal: 20 },
    states: { health: 80, fatigue: 20, stress, morale, fear: 10, anger: 15, hunger: 20, injury: 0, intoxication: 0, hygiene: 60 },
    loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
    equipment: { weapon: null, armor: null, accessory: [] },
    personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
    clothing: { head: null, torso: 'item-tunic', arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
    npcMemory: [],
    npcArc: null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentIntention: null,
    factionRelationships: [],
    captivityState: undefined,
    pregnancyState: undefined,
    bondStatus: null,
    wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
  }
}

describe('applyNakednessConsequences', () => {
  it('applies public penalty to naked NPCs in public (roomAssignment: null)', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [createNakedNpc('npc-naked-public', 'Naked Wanderer', null, 50, 30)],
    } as unknown as GameState

    const result = applyNakednessConsequences(state)

    const npc = result.roster[0]
    expect(npc.states.morale).toBe(30) // 50 - 20
    expect(npc.states.stress).toBe(45) // 30 + 15
    // 2 activity log entries: one for consequence, one for public sighting
    expect(result.activityLog.length).toBe(2)
    expect(result.activityLog.some((e) => e.message.includes('in public'))).toBe(true)
    expect(result.activityLog.some((e) => e.message.includes('was seen naked'))).toBe(true)
  })

  it('applies private penalty to naked NPCs with room assignment', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [createNakedNpc('npc-naked-private', 'Private Nude', 'room-quarters', 50, 30)],
    } as unknown as GameState

    const result = applyNakednessConsequences(state)

    const npc = result.roster[0]
    expect(npc.states.morale).toBe(48) // 50 - 2
    expect(npc.states.stress).toBe(33) // 30 + 3
  })

  it('does not apply penalties to clothed NPCs', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [createClothedNpc('npc-clothed', 'Proper Citizen', 50, 30)],
    } as unknown as GameState

    const result = applyNakednessConsequences(state)

    const npc = result.roster[0]
    expect(npc.states.morale).toBe(50) // Unchanged
    expect(npc.states.stress).toBe(30) // Unchanged
    expect(result.activityLog.length).toBe(0)
  })

  it('handles multiple naked NPCs with different contexts', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [
        createNakedNpc('npc-public', 'Public Naked', null, 50, 30),
        createNakedNpc('npc-private', 'Private Naked', 'room-quarters', 50, 30),
        createClothedNpc('npc-clothed', 'Clothed', 50, 30),
      ],
    } as unknown as GameState

    const result = applyNakednessConsequences(state)

    expect(result.roster[0].states.morale).toBe(30) // Public: -20
    expect(result.roster[0].states.stress).toBe(45) // Public: +15
    expect(result.roster[1].states.morale).toBe(48) // Private: -2
    expect(result.roster[1].states.stress).toBe(33) // Private: +3
    expect(result.roster[2].states.morale).toBe(50) // Cloth: unchanged
    expect(result.roster[2].states.stress).toBe(30) // Cloth: unchanged
    // 3 activity log entries: 2 consequences + 1 public sighting
    expect(result.activityLog.length).toBe(3)
  })

  it('caps morale at 0 (cannot go negative)', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [createNakedNpc('npc-low-morale', 'Low Morale', null, 10, 30)],
    } as unknown as GameState

    const result = applyNakednessConsequences(state)

    const npc = result.roster[0]
    expect(npc.states.morale).toBe(0) // 10 - 20 = -10, capped at 0
  })

  it('caps stress at 100 (cannot exceed)', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [createNakedNpc('npc-high-stress', 'High Stress', null, 50, 95)],
    } as unknown as GameState

    const result = applyNakednessConsequences(state)

    const npc = result.roster[0]
    expect(npc.states.stress).toBe(100) // 95 + 15 = 110, capped at 100
  })

  it('logs appropriate context for public vs private nakedness', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [
        createNakedNpc('npc-public', 'Public', null, 50, 30),
        createNakedNpc('npc-private', 'Private', 'room-quarters', 50, 30),
      ],
    } as unknown as GameState

    const result = applyNakednessConsequences(state)

    // Check that both contexts appear in the log (order may vary based on roster iteration)
    const messages = result.activityLog.map((entry) => entry.message)
    expect(messages.some((m) => m.includes('in public'))).toBe(true)
    expect(messages.some((m) => m.includes('without clothes'))).toBe(true)
  })

  it('publishes npc-naked-public event for naked NPCs in public', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 42,
      roster: [createNakedNpc('npc-event-test', 'Event Victim', null, 50, 30)],
    } as unknown as GameState

    const result = applyNakednessConsequences(state)

    // Check that a world event was published
    expect(result.worldEvents.length).toBeGreaterThan(0)
    const nakedEvent = result.worldEvents.find((e) => e.type === 'npc-naked-public')
    expect(nakedEvent).toBeDefined()
    expect(nakedEvent?.type).toBe('npc-naked-public')
    expect(nakedEvent?.source).toBe('system')
    expect(nakedEvent?.sourceNpcId).toBe('npc-event-test')
    expect(nakedEvent?.payload.npcName).toBe('Event Victim')
    expect(nakedEvent?.payload.moraleDelta).toBe(-20)
    expect(nakedEvent?.payload.stressDelta).toBe(15)
    expect(nakedEvent?.day).toBe(42)
  })

  it('does not publish event for naked NPCs in private', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [createNakedNpc('npc-private-no-event', 'Private Only', 'room-quarters', 50, 30)],
    } as unknown as GameState

    const result = applyNakednessConsequences(state)

    // Should have no npc-naked-public events
    const nakedEvents = result.worldEvents.filter((e) => e.type === 'npc-naked-public')
    expect(nakedEvents.length).toBe(0)
  })
})
