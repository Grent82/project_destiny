import { describe, it, expect } from 'vitest'
import { applyNpcPairing, tryAdvanceIntimacyStage, INTIMACY_ADVANCE_COOLDOWN_DAYS } from './applyNpcPairing'
import { setNpcPairingPolicy } from './setHousePolicy'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState, WorldNpcRuntimeState } from '../../domain/npc/contracts'

const noopRng = () => 0.5
const alwaysRng = () => 0   // triggers pregnancy (< 0.02) when used

function npcBase(overrides: Partial<NpcRuntimeState>): NpcRuntimeState {
  return {
    npcId: 'npc-a',
    name: 'Alpha',
    npcType: 'roster',
    playerRosterMember: true,
    worldDisposition: null,
    lastContactDay: null,
    locationOverride: null,
    status: 'mercenary',
    assignment: 'idle',
    assignedDistrictId: null,
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

function worldNpcBase(overrides: Partial<WorldNpcRuntimeState>): WorldNpcRuntimeState {
  return {
    npcId: 'npc-world-a',
    lastContactDay: null,
    disposition: 'neutral',
    locationOverride: null,
    flags: [],
    intimacyStage: 'none',
    pregnancyState: null,
    health: 100,
    injury: 0,
    recovering: false,
    clothing: { head: null, torso: 'cloth-tunic-simple', arms: null, legs: 'cloth-trousers-burlap', feet: 'cloth-boots-work', full: null, undergarments: 'cloth-underclothes-simple', accessories: [] },
    armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    ...overrides,
  }
}

function stateWithWorldPair(
  npcA: WorldNpcRuntimeState,
  npcB: WorldNpcRuntimeState,
  relOverrides?: Record<string, unknown>,
): GameState {
  return {
    ...initialGameStateSnapshot,
    worldNpcStates: [...initialGameStateSnapshot.worldNpcStates, npcA, npcB],
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

  it('no longer advances roster<->roster pairs directly — that is courtRomanticallyHandler\'s job now (intention-driven redesign)', () => {
    const npcA = npcBase({ npcId: 'npc-a', name: 'Alpha' })
    const npcB = npcBase({ npcId: 'npc-b', name: 'Beta' })
    const state = stateWithPair(npcA, npcB, { affinity: 35, trust: 25 })
    const result = applyNpcPairing(state, noopRng)
    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(abEdge?.intimacyStage ?? 'none').toBe('none')
  })

  it('still advances a world<->world pair (World NPCs cannot hold an Intention)', () => {
    const npcA = worldNpcBase({ npcId: 'npc-world-a' })
    const npcB = worldNpcBase({ npcId: 'npc-world-b' })
    const state = stateWithWorldPair(npcA, npcB, { affinity: 35, trust: 25 })
    const result = applyNpcPairing(state, noopRng)
    const abEdge = result.relationships[buildRelationshipKey('npc-world-a', 'npc-world-b')]
    expect(abEdge?.intimacyStage).toBe('affinity')
  })

  it('still advances a roster<->world pair', () => {
    const rosterNpc = npcBase({ npcId: 'npc-a' })
    const worldNpc = worldNpcBase({ npcId: 'npc-world-a' })
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [...initialGameStateSnapshot.roster, rosterNpc],
      worldNpcStates: [...initialGameStateSnapshot.worldNpcStates, worldNpc],
      relationships: {
        ...initialGameStateSnapshot.relationships,
        [buildRelationshipKey('npc-a', 'npc-world-a')]: { affinity: 35, respect: 0, fear: 0, trust: 25, loyalty: 0 },
        [buildRelationshipKey('npc-world-a', 'npc-a')]: { affinity: 35, respect: 0, fear: 0, trust: 25, loyalty: 0 },
      },
      lastFiredDay: {},
    }
    const result = applyNpcPairing(state, noopRng)
    const edge = result.relationships[buildRelationshipKey('npc-a', 'npc-world-a')]
    expect(edge?.intimacyStage).toBe('affinity')
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

  // "Noticed" event requires both sides to be roster NPCs ('traits' in npcA && 'traits' in npcB),
  // and roster<->roster pairs no longer advance via applyNpcPairing — see the
  // tryAdvanceIntimacyStage describe block below for that coverage.

  it('skips deployed NPCs', () => {
    const npcA = npcBase({ npcId: 'npc-a', assignment: 'deployed' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = stateWithPair(npcA, npcB, { affinity: 35, trust: 25 })
    const result = applyNpcPairing(state, noopRng)
    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(abEdge?.intimacyStage).toBeUndefined()
  })

  it('skips a pair when one NPC is working away in another district (no current co-presence)', () => {
    const npcA = npcBase({ npcId: 'npc-a', assignment: 'working', assignedDistrictId: 'district-harbor' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = stateWithPair(npcA, npcB, { affinity: 35, trust: 25 })
    expect(state.houseDistrictId).not.toBe('district-harbor')

    const result = applyNpcPairing(state, noopRng)

    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(abEdge?.intimacyStage).toBeUndefined()
  })

  it('still advances a world<->world pair regardless of room assignment (World NPCs have no rooms)', () => {
    const npcA = worldNpcBase({ npcId: 'npc-world-a' })
    const npcB = worldNpcBase({ npcId: 'npc-world-b' })
    const state = stateWithWorldPair(npcA, npcB, { affinity: 35, trust: 25 })

    const result = applyNpcPairing(state, noopRng)

    const abEdge = result.relationships[buildRelationshipKey('npc-world-a', 'npc-world-b')]
    expect(abEdge?.intimacyStage).toBe('affinity')
  })

  it('sets dedup key in lastFiredDay on a world-pair stage advance', () => {
    const npcA = worldNpcBase({ npcId: 'npc-world-a' })
    const npcB = worldNpcBase({ npcId: 'npc-world-b' })
    const state = stateWithWorldPair(npcA, npcB, { affinity: 35, trust: 25 })
    const result = applyNpcPairing(state, noopRng)
    const key = 'npc-pairing-npc-world-a-npc-world-b-stage-affinity'
    expect(result.lastFiredDay[key]).toBeDefined()
  })
})

describe('tryAdvanceIntimacyStage (shared mechanic — used directly by courtRomanticallyHandler for roster<->roster pairs, and by applyNpcPairing for world-involving pairs)', () => {
  it('advances none→affinity when conditions are met, for a roster<->roster pair', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = stateWithPair(npcA, npcB, { affinity: 35, trust: 25 })
    const result = tryAdvanceIntimacyStage(state, npcA, npcB, 'open')
    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(abEdge?.intimacyStage).toBe('affinity')
  })

  it('fires the noticed event when a roster<->roster pair reaches attachment', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const baseState = stateWithPair(npcA, npcB, { affinity: 50, trust: 45, intimacyStage: 'affinity' as const })
    const result = tryAdvanceIntimacyStage(baseState, npcA, npcB, 'open')
    const hasPairingEvent = result.pendingEvents.some((pe) => pe.eventId === 'event-npc-pairing-noticed')
    expect(hasPairingEvent).toBe(true)
  })

  it('sets dedup key in lastFiredDay on stage advance', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const state = stateWithPair(npcA, npcB, { affinity: 35, trust: 25 })
    const result = tryAdvanceIntimacyStage(state, npcA, npcB, 'open')
    const key = 'npc-pairing-npc-a-npc-b-stage-affinity'
    expect(result.lastFiredDay[key]).toBeDefined()
  })

  it('respects the cooldown — does not re-advance before it elapses', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const key = 'npc-pairing-npc-a-npc-b-stage-affinity'
    const state: GameState = {
      ...stateWithPair(npcA, npcB, { affinity: 35, trust: 25 }),
      day: 10,
      lastFiredDay: { [key]: 8 }, // fired 2 days ago; cooldown for 'none' is 3 days
    }
    const result = tryAdvanceIntimacyStage(state, npcA, npcB, 'open')
    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(abEdge?.intimacyStage ?? 'none').toBe('none')
  })

  it('allows advancement once the cooldown has elapsed', () => {
    const npcA = npcBase({ npcId: 'npc-a' })
    const npcB = npcBase({ npcId: 'npc-b' })
    const key = 'npc-pairing-npc-a-npc-b-stage-affinity'
    const state: GameState = {
      ...stateWithPair(npcA, npcB, { affinity: 35, trust: 25 }),
      day: 11,
      lastFiredDay: { [key]: 8 }, // fired 3 days ago; cooldown for 'none' is exactly 3 days
    }
    const result = tryAdvanceIntimacyStage(state, npcA, npcB, 'open')
    const abEdge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(abEdge?.intimacyStage).toBe('affinity')
  })

  it('uses the reduced 3/5/7-day cooldown values (not the old 14/21/30)', () => {
    expect(INTIMACY_ADVANCE_COOLDOWN_DAYS).toEqual({ none: 3, affinity: 5, attachment: 7 })
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
