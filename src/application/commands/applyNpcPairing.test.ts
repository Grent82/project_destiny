import { describe, it, expect } from 'vitest'
import { applyNpcPairing } from './applyNpcPairing'
import { setNpcPairingPolicy } from './setHousePolicy'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

const noopRng = () => 0.5
const alwaysRng = () => 0   // triggers pregnancy (< 0.02) when used

function npcBase(overrides: Partial<NpcRuntimeState>): NpcRuntimeState {
  return {
    npcId: 'npc-a',
    name: 'Alpha',
    status: 'mercenary',
    assignment: 'idle',
    assignedDistrictId: null,
    roomAssignment: null,
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
    npcMemory: [],
    bondStatus: null,
    npcArc: null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentIntention: null,
    factionRelationships: [],
    ...overrides,
  }
}

function stateWithPair(npcA: NpcRuntimeState, npcB: NpcRuntimeState, relOverrides?: Record<string, unknown>): GameState {
  return {
    ...initialGameStateSnapshot,
    roster: [...initialGameStateSnapshot.roster, npcA, npcB],
    relationships: {
      ...initialGameStateSnapshot.relationships,
      [buildRelationshipKey(npcA.npcId, npcB.npcId)]: {
        affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0,
        ...relOverrides,
      },
      [buildRelationshipKey(npcB.npcId, npcA.npcId)]: {
        affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0,
        ...relOverrides,
      },
    },
    lastFiredDay: {},
  }
}

describe('applyNpcPairing — stage progression', () => {
  it('does nothing when roster has fewer than 2 eligible NPCs', () => {
    const result = applyNpcPairing(initialGameStateSnapshot, noopRng)
    expect(result).toBe(initialGameStateSnapshot)
  })

  it('advances none→affinity when conditions are met', () => {
    const npcA = npcBase({ npcId: 'npc-a', name: 'Alpha' })
    const npcB = npcBase({ npcId: 'npc-b', name: 'Beta' })
    const state = stateWithPair(npcA, npcB, { affinity: 35, trust: 25 })
    const result = applyNpcPairing(state, noopRng)
    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(abEdge?.intimacyStage).toBe('affinity')
  })

  it('does not advance when compatibility score is below threshold', () => {
    // High dominance imbalance and low empathy → very low compatibility
    const npcA = npcBase({ npcId: 'npc-a', traits: { ...npcBase({}).traits, dominance: 90, empathy: 5 } })
    const npcB = npcBase({ npcId: 'npc-b', traits: { ...npcBase({}).traits, dominance: 10, empathy: 90 } })
    const state = stateWithPair(npcA, npcB, { affinity: 50, trust: 40 })
    const result = applyNpcPairing(state, noopRng)
    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    // Very large dominance imbalance (80) blocks the pair
    expect(abEdge?.intimacyStage).toBeUndefined()
  })

  it('blocks new bonds when policy is forbidden', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = setNpcPairingPolicy(
      stateWithPair(npcA, npcB, { affinity: 35, trust: 25 }),
      'forbidden',
    )
    const result = applyNpcPairing(state, noopRng)
    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(abEdge?.intimacyStage).toBeUndefined()
  })

  it('does not advance when high fear blocks bond', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = stateWithPair(npcA, npcB, { affinity: 35, trust: 25, fear: -40 })
    const result = applyNpcPairing(state, noopRng)
    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(abEdge?.intimacyStage).toBeUndefined()
  })

  it('fires noticed event when pair reaches attachment', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    // Pre-set affinity stage
    const baseState = stateWithPair(npcA, npcB, { affinity: 50, trust: 45, intimacyStage: 'affinity' as const })
    const result = applyNpcPairing(baseState, noopRng)
    const hasPairingEvent = result.pendingEvents.some((pe) => pe.eventId === 'event-npc-pairing-noticed')
    expect(hasPairingEvent).toBe(true)
    expect(result.pendingEvents.find((pe) => pe.eventId === 'event-npc-pairing-noticed')?.instanceId).toBeTruthy()
  })

  it('skips deployed NPCs', () => {
    const npcA = npcBase({ npcId: 'npc-a', assignment: 'deployed' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = stateWithPair(npcA, npcB, { affinity: 35, trust: 25 })
    const result = applyNpcPairing(state, noopRng)
    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(abEdge?.intimacyStage).toBeUndefined()
  })

  it('sets dedup key in lastFiredDay on stage advance', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = stateWithPair(npcA, npcB, { affinity: 35, trust: 25 })
    const result = applyNpcPairing(state, noopRng)
    const key = 'npc-pairing-npc-a-npc-b-stage-affinity'
    expect(result.lastFiredDay[key]).toBeDefined()
  })
})

describe('applyNpcPairing — pregnancy', () => {
  it('sets pregnancyState when committed pair is in open policy and rng triggers', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = stateWithPair(npcA, npcB, {
      affinity: 70, trust: 65, loyalty: 45, intimacyStage: 'committed' as const,
    })
    // alwaysRng returns 0, which is < 0.02 → pregnancy triggers
    const result = applyNpcPairing(state, alwaysRng)
    const hasPregnancy = result.roster.some((n) => n.pregnancyState !== undefined)
    expect(hasPregnancy).toBe(true)
  })

  it('pregnancy blocked when policy is discouraged', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = setNpcPairingPolicy(
      stateWithPair(npcA, npcB, {
        affinity: 70, trust: 65, loyalty: 45, intimacyStage: 'committed' as const,
      }),
      'discouraged',
    )
    const result = applyNpcPairing(state, alwaysRng)
    expect(result.roster.some((n) => n.pregnancyState)).toBe(false)
  })

  it('pregnancy sets partnerNpcId on the pregnant NPC', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = stateWithPair(npcA, npcB, {
      affinity: 70, trust: 65, loyalty: 45, intimacyStage: 'committed' as const,
    })
    const result = applyNpcPairing(state, alwaysRng)
    const pregnant = result.roster.find((n) => n.pregnancyState)
    expect(pregnant?.pregnancyState?.partnerNpcId).toBeTruthy()
    expect(pregnant?.pregnancyState?.context).toBe('consensual')
  })

  it('fires pregnancy discovery event', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = stateWithPair(npcA, npcB, {
      affinity: 70, trust: 65, loyalty: 45, intimacyStage: 'committed' as const,
    })
    const result = applyNpcPairing(state, alwaysRng)
    expect(result.pendingEvents.some((pe) => pe.eventId === 'event-npc-pairing-pregnancy-discovery')).toBe(true)
    expect(
      result.pendingEvents.find((pe) => pe.eventId === 'event-npc-pairing-pregnancy-discovery')?.instanceId,
    ).toBeTruthy()
  })
})

describe('setNpcPairingPolicy', () => {
  it('updates house policy', () => {
    const result = setNpcPairingPolicy(initialGameStateSnapshot, 'forbidden')
    expect(result.house.npcPairingPolicy).toBe('forbidden')
  })

  it('adds activity log entry', () => {
    const result = setNpcPairingPolicy(initialGameStateSnapshot, 'discouraged')
    expect(result.activityLog.some((e) => e.message.includes('private'))).toBe(true)
  })

  it('returns state unchanged if policy already matches', () => {
    const result = setNpcPairingPolicy(initialGameStateSnapshot, 'open')
    expect(result).toBe(initialGameStateSnapshot)
  })
})
