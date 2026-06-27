import { describe, expect, it } from 'vitest'

import type { GameState, NpcRuntimeState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { applyHouseholdIntimacy } from './applyHouseholdIntimacy'

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
    arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
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
        affinity: 55, respect: 0, fear: 0, trust: 50, loyalty: 35,
        intimacyStage: 'attachment',
        ...relOverrides,
      },
      [buildRelationshipKey(npcB.npcId, npcA.npcId)]: {
        affinity: 55, respect: 0, fear: 0, trust: 50, loyalty: 35,
        intimacyStage: 'attachment',
        ...relOverrides,
      },
    },
    lastFiredDay: {},
  }
}

describe('applyHouseholdIntimacy', () => {
  it('creates a domestic beat for an attached pair sharing intact quarters under an open policy', () => {
    const npcA = npcBase({ npcId: 'npc-a', name: 'Alpha', roomAssignment: 'room-quarters' })
    const npcB = npcBase({ npcId: 'npc-b', name: 'Beta', roomAssignment: 'room-quarters' })
    const state = stateWithPair(npcA, npcB)

    const result = applyHouseholdIntimacy(state)

    const beat = result.house.lastDomesticRelationshipBeat
    expect(beat).not.toBeNull()
    expect(beat?.npcNames).toEqual(['Alpha', 'Beta'])
    expect(beat?.roomId).toBe('room-quarters')
    expect(beat?.policy).toBe('open')
    expect(beat?.summary).toMatch(/The house begins to read them as a pair/i)
    expect(beat?.effects).toContain('Trust +3 each')

    const edge = result.relationships[buildRelationshipKey('npc-a', 'npc-b')]
    expect(edge?.trust).toBe(53)
    expect(edge?.affinity).toBe(57)
    expect(edge?.loyalty).toBe(36)
  })

  it('does nothing when the pair is not actually sharing the same quarters', () => {
    const npcA = npcBase({ npcId: 'npc-a', roomAssignment: 'room-quarters' })
    const npcB = npcBase({ npcId: 'npc-b', roomAssignment: 'room-bureau' })
    const state = stateWithPair(npcA, npcB)

    const result = applyHouseholdIntimacy(state)

    expect(result.house.lastDomesticRelationshipBeat).toBeNull()
    expect(result).toBe(state)
  })

  it('respects household policy and avoids domestic beats when pairing is forbidden', () => {
    const npcA = npcBase({ npcId: 'npc-a', roomAssignment: 'room-quarters' })
    const npcB = npcBase({ npcId: 'npc-b', roomAssignment: 'room-quarters' })
    const state = {
      ...stateWithPair(npcA, npcB),
      house: {
        ...initialGameStateSnapshot.house,
        npcPairingPolicy: 'forbidden' as const,
        lastDomesticRelationshipBeat: null,
      },
    }

    const result = applyHouseholdIntimacy(state)

    expect(result.house.lastDomesticRelationshipBeat).toBeNull()
    expect(result).toBe(state)
  })
})
