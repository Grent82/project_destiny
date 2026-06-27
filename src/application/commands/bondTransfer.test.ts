import { describe, it, expect } from 'vitest'
import type { NpcRuntimeState } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import {
  transferBondedNpc,
  checkBondAcquisitionOffers,
  applyNpcHeldConditionDecay,
  rescueBondedNpcLegal,
  rescueBondedNpcExtraction,
  rescueBondedNpcForce,
} from './bondTransfer'

const BUYER_COMPACT = 'buyer-compact-registrar'
const BUYER_NOBLE = 'buyer-noble-house-agent'
const BUYER_TALLOW = 'buyer-tallow-broker'

function bondedNpc(overrides: Partial<NpcRuntimeState> = {}): NpcRuntimeState {
  return {
    npcId: 'npc-test-bond',
    name: 'Sable',
    status: 'prisoner' as const,
    assignment: 'working' as const,
    assignedDistrictId: null,
    roomAssignment: null,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
    attributes: { might: 40, agility: 40, endurance: 40, intellect: 40, perception: 40, presence: 40, resolve: 40 },
    skills: { melee: 20, ranged: 20, medicine: 20, administration: 20, engineering: 20, negotiation: 20, survival: 20, security: 20, crafting: 20, performance: 20, academics: 20, intrigue: 20 },
    traits: { discipline: 40, ambition: 40, empathy: 20, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 40, vanity: 40, zeal: 40 },
    states: { health: 80, fatigue: 20, stress: 30, morale: 50, fear: 10, anger: 10, hunger: 0, injury: 0, intoxication: 0, hygiene: 60 },
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
    bondStatus: {
      holderId: 'player',
      contractValue: 200,
      termDays: 30,
      entryReason: 'debt-settlement' as const,
      alongsideFreeAssignmentDays: 0,
      lastEqualityNoticeDay: null,
      forSale: false,
      lastOfferDay: null,
      marketValue: 300,
      ownerType: 'player' as const,
      bondStartDay: 0,
    },
    ...overrides,
  }
}

function stateWithBondedNpc(npc: NpcRuntimeState, day = 10) {
  return {
    ...initialGameStateSnapshot,
    day,
    money: 500,
    roster: [npc],
    bondedPersonsRegistry: {},
  }
}

// --- transferBondedNpc ---

describe('transferBondedNpc', () => {
  it('adds money equal to marketValue × offerModifier', () => {
    const npc = bondedNpc()
    const state = stateWithBondedNpc(npc)
    const result = transferBondedNpc(state, npc.npcId, BUYER_COMPACT)
    // 300 * 0.85 = 255
    expect(result.money).toBe(755)
  })

  it('adds npcId to bondedPersonsRegistry under buyerId', () => {
    const npc = bondedNpc()
    const state = stateWithBondedNpc(npc)
    const result = transferBondedNpc(state, npc.npcId, BUYER_COMPACT)
    expect(result.bondedPersonsRegistry[BUYER_COMPACT]).toContain(npc.npcId)
  })

  it('marks roster npc as transferred with ownerType npc', () => {
    const npc = bondedNpc()
    const state = stateWithBondedNpc(npc)
    const result = transferBondedNpc(state, npc.npcId, BUYER_COMPACT)
    const transferred = result.roster.find((r) => r.npcId === npc.npcId)!
    expect(transferred.assignment).toBe('transferred')
    expect(transferred.bondStatus?.ownerType).toBe('npc')
    expect(transferred.bondStatus?.holderId).toBe(BUYER_COMPACT)
  })

  it('does nothing if npc has no bondStatus', () => {
    const npc = bondedNpc({ bondStatus: null as unknown as NpcRuntimeState['bondStatus'] })
    const state = stateWithBondedNpc(npc)
    const result = transferBondedNpc(state, npc.npcId, BUYER_COMPACT)
    expect(result.money).toBe(500) // unchanged
  })

  it('applies morale penalty to high-empathy roster witnesses', () => {
    const highEmpathyNpc: NpcRuntimeState = {
      ...bondedNpc({ npcId: 'npc-witness' }),
      traits: { discipline: 40, ambition: 40, empathy: 70, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 40, vanity: 40, zeal: 40 },
      bondStatus: null as unknown as NpcRuntimeState['bondStatus'],
    }
    const subject = bondedNpc()
    const state = {
      ...initialGameStateSnapshot,
      day: 10,
      money: 500,
      roster: [subject, highEmpathyNpc],
      bondedPersonsRegistry: {},
    }
    const result = transferBondedNpc(state, subject.npcId, BUYER_COMPACT)
    const witness = result.roster.find((r) => r.npcId === 'npc-witness')!
    expect(witness.states.morale).toBeLessThan(50)
  })

  it('uses noble agent 1.05 modifier', () => {
    const npc = bondedNpc()
    const state = stateWithBondedNpc(npc)
    const result = transferBondedNpc(state, npc.npcId, BUYER_NOBLE)
    // 300 * 1.05 = 315
    expect(result.money).toBe(815)
  })
})

// --- checkBondAcquisitionOffers ---

describe('checkBondAcquisitionOffers', () => {
  it('fires offer event when forSale=true and conditions met', () => {
    const npc = bondedNpc({ bondStatus: { ...bondedNpc().bondStatus!, forSale: true, bondStartDay: 0 } })
    const state = stateWithBondedNpc(npc, 10)
    const result = checkBondAcquisitionOffers(state, () => 0)
    expect(result.pendingEvents.some((e) => e.eventId === 'bond-acquisition-offer')).toBe(true)
    expect(result.pendingEvents.find((e) => e.eventId === 'bond-acquisition-offer')?.instanceId).toBeTruthy()
  })

  it('does not fire when forSale=false', () => {
    const npc = bondedNpc()
    const state = stateWithBondedNpc(npc, 10)
    const result = checkBondAcquisitionOffers(state, () => 0)
    expect(result.pendingEvents.some((e) => e.eventId === 'bond-acquisition-offer')).toBe(false)
  })

  it('does not fire before 5 days in service', () => {
    const npc = bondedNpc({ bondStatus: { ...bondedNpc().bondStatus!, forSale: true, bondStartDay: 0 } })
    const state = stateWithBondedNpc(npc, 3)
    const result = checkBondAcquisitionOffers(state, () => 0)
    expect(result.pendingEvents.some((e) => e.eventId === 'bond-acquisition-offer')).toBe(false)
  })

  it('does not fire within 10 days of last offer', () => {
    const npc = bondedNpc({ bondStatus: { ...bondedNpc().bondStatus!, forSale: true, bondStartDay: 0, lastOfferDay: 5 } })
    const state = stateWithBondedNpc(npc, 10)
    const result = checkBondAcquisitionOffers(state, () => 0)
    expect(result.pendingEvents.some((e) => e.eventId === 'bond-acquisition-offer')).toBe(false)
  })

  it('stores sourceNpcId and contextId in event instance', () => {
    const npc = bondedNpc({ bondStatus: { ...bondedNpc().bondStatus!, forSale: true, bondStartDay: 0 } })
    const state = stateWithBondedNpc(npc, 10)
    const result = checkBondAcquisitionOffers(state, () => 0)
    const instance = result.eventInstances.find((i) => i.eventId === 'bond-acquisition-offer')!
    expect(instance.sourceNpcId).toBe(npc.npcId)
    expect(instance.contextId).toBeTruthy()
  })
})

// --- applyNpcHeldConditionDecay ---

describe('applyNpcHeldConditionDecay', () => {
  it('decays health by 1 for Compact-held npc', () => {
    const npc = bondedNpc({
      assignment: 'transferred' as const,
      bondStatus: { ...bondedNpc().bondStatus!, ownerType: 'npc' as const, holderId: BUYER_COMPACT },
    })
    const state = stateWithBondedNpc(npc)
    const result = applyNpcHeldConditionDecay(state)
    expect(result.roster[0]!.states.health).toBe(79)
  })

  it('decays health by 2 for Tallow Ring-held npc', () => {
    const npc = bondedNpc({
      assignment: 'transferred' as const,
      bondStatus: { ...bondedNpc().bondStatus!, ownerType: 'npc' as const, holderId: BUYER_TALLOW },
    })
    const state = stateWithBondedNpc(npc)
    const result = applyNpcHeldConditionDecay(state)
    expect(result.roster[0]!.states.health).toBe(78)
  })

  it('improves health by 1 for Noble-held npc', () => {
    const npc = bondedNpc({
      assignment: 'transferred' as const,
      bondStatus: { ...bondedNpc().bondStatus!, ownerType: 'npc' as const, holderId: BUYER_NOBLE },
      states: { ...bondedNpc().states, health: 60 },
    })
    const state = stateWithBondedNpc(npc)
    const result = applyNpcHeldConditionDecay(state)
    expect(result.roster[0]!.states.health).toBe(61)
  })

  it('does not affect non-transferred npcs', () => {
    const npc = bondedNpc()
    const state = stateWithBondedNpc(npc)
    const result = applyNpcHeldConditionDecay(state)
    expect(result.roster[0]!.states.health).toBe(80)
  })
})

// --- rescue paths ---

describe('rescueBondedNpcLegal', () => {
  it('returns rescued npc to roster as recovering, deducts ransom', () => {
    const npc = bondedNpc({
      assignment: 'transferred' as const,
      bondStatus: { ...bondedNpc().bondStatus!, ownerType: 'npc' as const, holderId: BUYER_COMPACT },
    })
    const state = {
      ...stateWithBondedNpc(npc),
      money: 1000,
      bondedPersonsRegistry: { [BUYER_COMPACT]: [npc.npcId] },
    }
    const result = rescueBondedNpcLegal(state, npc.npcId)
    const rescued = result.roster.find((r) => r.npcId === npc.npcId)!
    expect(rescued.assignment).toBe('recovering')
    expect(rescued.bondStatus?.ownerType).toBe('player')
    expect(result.bondedPersonsRegistry[BUYER_COMPACT] ?? []).not.toContain(npc.npcId)
    // 300 * 1.5 = 450
    expect(result.money).toBe(550)
  })

  it('does nothing if player cannot afford ransom', () => {
    const npc = bondedNpc({
      assignment: 'transferred' as const,
      bondStatus: { ...bondedNpc().bondStatus!, ownerType: 'npc' as const, holderId: BUYER_COMPACT },
    })
    const state = { ...stateWithBondedNpc(npc), money: 100 }
    const result = rescueBondedNpcLegal(state, npc.npcId)
    expect(result.money).toBe(100)
  })
})

describe('rescueBondedNpcExtraction', () => {
  it('returns npc to recovering, applies health penalty, costs Tallow Ring standing', () => {
    const npc = bondedNpc({
      assignment: 'transferred' as const,
      bondStatus: { ...bondedNpc().bondStatus!, ownerType: 'npc' as const, holderId: BUYER_COMPACT },
    })
    const state = {
      ...stateWithBondedNpc(npc),
      bondedPersonsRegistry: { [BUYER_COMPACT]: [npc.npcId] },
      factionStandings: { 'faction-tallow-ring': 0 },
    }
    const result = rescueBondedNpcExtraction(state, npc.npcId)
    const rescued = result.roster.find((r) => r.npcId === npc.npcId)!
    expect(rescued.assignment).toBe('recovering')
    expect(rescued.states.health).toBe(60) // 80 - 20
    expect(result.factionStandings['faction-tallow-ring']).toBe(-15)
  })
})

describe('rescueBondedNpcForce', () => {
  it('returns npc to recovering with health -15', () => {
    const npc = bondedNpc({
      assignment: 'transferred' as const,
      bondStatus: { ...bondedNpc().bondStatus!, ownerType: 'npc' as const, holderId: BUYER_COMPACT },
    })
    const state = {
      ...stateWithBondedNpc(npc),
      bondedPersonsRegistry: { [BUYER_COMPACT]: [npc.npcId] },
    }
    const result = rescueBondedNpcForce(state, npc.npcId)
    const rescued = result.roster.find((r) => r.npcId === npc.npcId)!
    expect(rescued.assignment).toBe('recovering')
    expect(rescued.states.health).toBe(65) // 80 - 15
  })
})
