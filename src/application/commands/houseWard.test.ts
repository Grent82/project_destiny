import { describe, it, expect } from 'vitest'
import { payWardAllowance, advanceWardStage, tickWardStages } from './houseWard'
import { type GameState } from '../../domain/game/contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'

function createWardNpc(
  npcId: string,
  name: string,
  lastAllowanceDay: number | null,
  allowancePerWeek = 2,
  personalSavings = 0,
) {
  return {
    npcId,
    name,
    status: 'ward' as const,
    assignment: 'idle' as const,
    assignedDistrictId: null,
    roomAssignment: null,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
    attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
    skills: { melee: 30, ranged: 30, medicine: 30, administration: 40, engineering: 30, negotiation: 30, survival: 30, security: 30, crafting: 30, performance: 20, academics: 30, intrigue: 30 },
    traits: { discipline: 40, ambition: 50, empathy: 50, ruthlessness: 20, prudence: 40, curiosity: 50, dominance: 30, loyalty: 50, vanity: 20, zeal: 20 },
    states: { health: 80, fatigue: 20, stress: 30, morale: 70, fear: 10, anger: 15, hunger: 20, injury: 0, intoxication: 0, hygiene: 60 },
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
    wardPersonalAllowance: { allowancePerWeek, personalSavings, lastAllowanceDay, allowedItems: [], restrictedItems: [] },
  }
}

describe('payWardAllowance', () => {
  it('pays allowance to wards who have not been paid in 7+ days', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 100,
      roster: [
        createWardNpc('npc-ward-1', 'Young Ward', 90, 2, 10), // 10 days since last payment
      ],
    }

    const result = payWardAllowance(state)

    const ward = result.roster[0]
    expect(ward.wardPersonalAllowance.personalSavings).toBe(12) // 10 + 2
    expect(ward.wardPersonalAllowance.lastAllowanceDay).toBe(100)
    expect(result.activityLog.length).toBe(1)
    expect(result.activityLog[0].message).toContain('receives 2 Mk weekly allowance')
  })

  it('does not pay allowance if less than 7 days have passed', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 100,
      roster: [
        createWardNpc('npc-ward-1', 'Young Ward', 95, 2, 10), // Only 5 days since last payment
      ],
    }

    const result = payWardAllowance(state)

    const ward = result.roster[0]
    expect(ward.wardPersonalAllowance.personalSavings).toBe(10) // Unchanged
    expect(ward.wardPersonalAllowance.lastAllowanceDay).toBe(95) // Unchanged
    expect(result.activityLog.length).toBe(0)
  })

  it('pays allowance on exactly day 7', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 100,
      roster: [
        createWardNpc('npc-ward-1', 'Young Ward', 93, 2, 10), // Exactly 7 days since last payment
      ],
    }

    const result = payWardAllowance(state)

    const ward = result.roster[0]
    expect(ward.wardPersonalAllowance.personalSavings).toBe(12) // 10 + 2
    expect(ward.wardPersonalAllowance.lastAllowanceDay).toBe(100)
  })

  it('handles wards with never-received allowance (lastAllowanceDay: null)', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 100,
      roster: [
        createWardNpc('npc-ward-1', 'Young Ward', null, 2, 0), // Never received allowance
      ],
    }

    const result = payWardAllowance(state)

    const ward = result.roster[0]
    expect(ward.wardPersonalAllowance.personalSavings).toBe(2)
    expect(ward.wardPersonalAllowance.lastAllowanceDay).toBe(100)
  })

  it('skips non-ward NPCs', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 100,
      roster: [
        createWardNpc('npc-ward-1', 'Young Ward', 90, 2, 10),
        {
          ...createWardNpc('npc-citizen-1', 'Regular NPC', 90, 2, 10),
          status: 'citizen' as const,
        },
      ],
    }

    const result = payWardAllowance(state)

    expect(result.roster[0].wardPersonalAllowance.personalSavings).toBe(12) // Ward gets paid
    expect(result.roster[1].wardPersonalAllowance.personalSavings).toBe(10) // Citizen unchanged
    expect(result.activityLog.length).toBe(1)
  })

  it('supports custom allowance amounts', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 100,
      roster: [
        createWardNpc('npc-ward-1', 'Generous Ward', 90, 5, 0), // 5 Mk per week
      ],
    }

    const result = payWardAllowance(state)

    const ward = result.roster[0]
    expect(ward.wardPersonalAllowance.personalSavings).toBe(5)
    expect(result.activityLog[0].message).toContain('receives 5 Mk weekly allowance')
  })
})

describe('advanceWardStage', () => {
  it('advances ward from child to ward after 30 days', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 100,
      house: {
        ...initialGameStateSnapshot.house,
        houseHeirs: [
          {
            id: 'heir-1',
            name: 'Test Child',
            stage: 'child',
            arrivalDay: 70,
            originStory: 'Found on the streets',
            legitimacyStatus: 'unknown',
            birthContext: null,
          },
        ],
      },
    }

    const result = advanceWardStage(state, 'heir-1')

    expect(result.house.houseHeirs[0].stage).toBe('ward')
    expect(result.house.houseHeirs[0].arrivalDay).toBe(100) // Reset to current day
  })

  it('does not advance if not enough days have passed', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 100,
      house: {
        ...initialGameStateSnapshot.house,
        houseHeirs: [
          {
            id: 'heir-1',
            name: 'Test Child',
            stage: 'child',
            arrivalDay: 80, // Only 20 days
            originStory: 'Found on the streets',
            legitimacyStatus: 'unknown',
            birthContext: null,
          },
        ],
      },
    }

    const result = advanceWardStage(state, 'heir-1')

    expect(result.house.houseHeirs[0].stage).toBe('child') // Unchanged
  })

  it('does not advance adult wards', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 100,
      house: {
        ...initialGameStateSnapshot.house,
        houseHeirs: [
          {
            id: 'heir-1',
            name: 'Test Adult',
            stage: 'adult',
            arrivalDay: 10,
            originStory: 'Found on the streets',
            legitimacyStatus: 'unknown',
            birthContext: null,
          },
        ],
      },
    }

    const result = advanceWardStage(state, 'heir-1')

    expect(result.house.houseHeirs[0].stage).toBe('adult') // Unchanged
  })
})

describe('tickWardStages', () => {
  it('checks all wards and advances eligible ones', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 100,
      house: {
        ...initialGameStateSnapshot.house,
        houseHeirs: [
          {
            id: 'heir-1',
            name: 'Ready Child',
            stage: 'child',
            arrivalDay: 69, // 31 days - ready to advance
            originStory: 'Found on the streets',
            legitimacyStatus: 'unknown',
            birthContext: null,
          },
          {
            id: 'heir-2',
            name: 'Not Ready Child',
            stage: 'child',
            arrivalDay: 85, // 15 days - not ready
            originStory: 'Found on the streets',
            legitimacyStatus: 'unknown',
            birthContext: null,
          },
        ],
      },
    }

    const result = tickWardStages(state)

    expect(result.house.houseHeirs[0].stage).toBe('ward') // Advanced
    expect(result.house.houseHeirs[1].stage).toBe('child') // Not advanced
  })
})
