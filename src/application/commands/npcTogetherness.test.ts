import { describe, it, expect } from 'vitest'

import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { isEligibleForHouseholdTogetherness } from './npcTogetherness'

const HOUSE_DISTRICT_ID = 'district-the-pale'

function npcBase(overrides: Partial<NpcRuntimeState>): NpcRuntimeState {
  return {
    npcId: 'npc-a',
    name: 'Alpha',
    npcType: 'roster',
    playerRosterMember: true,
    status: 'mercenary',
    assignment: 'idle',
    assignedDistrictId: null,
    worldDisposition: null,
    lastContactDay: null,
    locationOverride: null,
    roomAssignment: null,
    dutyPostRoomId: null,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
    attributes: { might: 40, agility: 40, endurance: 40, intellect: 40, perception: 40, presence: 40, resolve: 40 },
    skills: { melee: 15, ranged: 15, medicine: 15, administration: 15, engineering: 15, negotiation: 15, survival: 15, security: 15, crafting: 15, performance: 15, academics: 15, intrigue: 15 },
    traits: { discipline: 50, ambition: 50, empathy: 65, ruthlessness: 20, prudence: 50, curiosity: 50, dominance: 30, loyalty: 60, vanity: 20, zeal: 30 },
    states: { health: 80, fatigue: 10, stress: 10, morale: 70, fear: 5, anger: 5, hunger: 10, injury: 0, intoxication: 0, hygiene: 70 },
    loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
    equipment: { weapon: null, armor: null, accessory: [] },
    personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
    clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
    npcMemory: [],
    bondStatus: null,
    npcArc: null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentEmployment: null,
    currentIntention: null,
    factionRelationships: [],
    wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
    ...overrides,
  }
}

describe('isEligibleForHouseholdTogetherness', () => {
  it('allows an idle NPC at the house', () => {
    expect(isEligibleForHouseholdTogetherness(npcBase({}), HOUSE_DISTRICT_ID)).toBe(true)
  })

  it('allows an NPC working an in-house duty (no district assignment)', () => {
    const npc = npcBase({ assignment: 'working', assignedDistrictId: null })
    expect(isEligibleForHouseholdTogetherness(npc, HOUSE_DISTRICT_ID)).toBe(true)
  })

  it('excludes a deployed NPC', () => {
    const npc = npcBase({ assignment: 'deployed' })
    expect(isEligibleForHouseholdTogetherness(npc, HOUSE_DISTRICT_ID)).toBe(false)
  })

  it('excludes an NPC working away in a different district', () => {
    const npc = npcBase({ assignment: 'working', assignedDistrictId: 'district-harbor' })
    expect(isEligibleForHouseholdTogetherness(npc, HOUSE_DISTRICT_ID)).toBe(false)
  })

  it('allows an NPC assigned to a district that happens to equal the house district', () => {
    const npc = npcBase({ assignment: 'working', assignedDistrictId: HOUSE_DISTRICT_ID })
    expect(isEligibleForHouseholdTogetherness(npc, HOUSE_DISTRICT_ID)).toBe(true)
  })

  it('excludes a transferred NPC away in another district', () => {
    const npc = npcBase({ assignment: 'transferred', assignedDistrictId: 'district-ironworks' })
    expect(isEligibleForHouseholdTogetherness(npc, HOUSE_DISTRICT_ID)).toBe(false)
  })

  it('excludes a ward', () => {
    const npc = npcBase({ status: 'ward' })
    expect(isEligibleForHouseholdTogetherness(npc, HOUSE_DISTRICT_ID)).toBe(false)
  })

  it('excludes a captive NPC even if roomAssignment still matches another resident', () => {
    const npc = npcBase({
      roomAssignment: 'room-quarters',
      captivityState: {
        status: 'captive',
        holderId: 'holder-001',
        siteId: 'site-1',
        roomId: 'room-1',
        regime: 'guarded',
        condition: 'hurt',
        compliance: 'resistant',
        bondType: 'fear',
        timeHeldDays: 3,
        lastTransferDay: null,
        questTag: null,
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    })
    expect(isEligibleForHouseholdTogetherness(npc, HOUSE_DISTRICT_ID)).toBe(false)
  })

  it('excludes a missing NPC', () => {
    const npc = npcBase({
      captivityState: {
        status: 'missing',
        holderId: null,
        siteId: null,
        roomId: null,
        regime: 'unknown',
        condition: 'healthy',
        compliance: 'resistant',
        bondType: 'none',
        timeHeldDays: 0,
        lastTransferDay: null,
        questTag: null,
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    })
    expect(isEligibleForHouseholdTogetherness(npc, HOUSE_DISTRICT_ID)).toBe(false)
  })
})
