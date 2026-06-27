import { describe, expect, it } from 'vitest'

import type { GameState, NpcRuntimeState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { applyNpcRoomInteractions } from './applyNpcRoomInteractions'
import { collapseSite, concretizeSite } from './siteLifecycle'

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

function stateWithActors(captive: NpcRuntimeState, actor: NpcRuntimeState): GameState {
  return {
    ...initialGameStateSnapshot,
    roster: [...initialGameStateSnapshot.roster, captive, actor],
    relationships: {
      ...initialGameStateSnapshot.relationships,
      [buildRelationshipKey('player', captive.npcId)]: {
        affinity: 0,
        respect: 0,
        fear: 0,
        trust: 0,
        loyalty: 0,
      },
    },
  }
}

describe('applyNpcRoomInteractions', () => {
  it('lets guards increase captive fear and push compliance toward conflicted', () => {
    const captiveId = 'npc-captive'
    const actorId = 'npc-guard'
    const baseState = stateWithActors(
      npcBase({ npcId: captiveId, name: 'Captive', states: { ...npcBase({}).states, fear: 10 } }),
      npcBase({ npcId: actorId, name: 'Guard', traits: { ...npcBase({}).traits, ruthlessness: 75, empathy: 15 } }),
    )
    const state = concretizeSite(baseState, 'site-world-house-sorn')
    const next = applyNpcRoomInteractions(
      {
        ...state,
        roster: state.roster.map((npc) =>
          npc.npcId === captiveId ? { ...npc, states: { ...npc.states, fear: 10 } } : npc,
        ),
        npcCaptivityStates: {
          ...state.npcCaptivityStates,
          [captiveId]: {
            status: 'captive' as const,
            holderId: 'faction-civic-compact',
            siteId: 'site-world-house-sorn',
            roomId: 'sorn-locked-cellar',
            regime: 'guarded' as const,
            condition: 'healthy' as const,
            compliance: 'resistant' as const,
            bondType: 'fear' as const,
            timeHeldDays: 4,
            lastTransferDay: 2,
            questTag: null,
          },
        },
        npcSitePresences: [
          {
            occupancyId: 'occ-guard-sorn',
            npcId: actorId,
            siteId: 'site-world-house-sorn',
            roomId: 'sorn-locked-cellar',
            role: 'guard' as const,
            visibility: 'hidden' as const,
            status: 'present' as const,
            sinceDay: 1,
          },
        ],
      },
      () => 0.25,
    )

    expect(next.npcCaptivityStates[captiveId]?.compliance).toBe('conflicted')
    expect(next.roster.find((npc) => npc.npcId === captiveId)?.states.fear).toBeGreaterThan(10)
  })

  it('lets protective or medical rooms improve captive condition and trust', () => {
    const captiveId = 'npc-captive'
    const actorId = 'npc-healer'
    const baseState = stateWithActors(
      npcBase({ npcId: captiveId, name: 'Captive', states: { ...npcBase({}).states, fear: 35 } }),
      npcBase({ npcId: actorId, name: 'Healer', traits: { ...npcBase({}).traits, empathy: 80 } }),
    )
    const state = concretizeSite(baseState, 'site-world-chapel-saint-vey')
    const next = applyNpcRoomInteractions(
      {
        ...state,
        roster: state.roster.map((npc) =>
          npc.npcId === captiveId ? { ...npc, states: { ...npc.states, fear: 35 } } : npc,
        ),
        npcCaptivityStates: {
          ...state.npcCaptivityStates,
          [captiveId]: {
            status: 'captive' as const,
            holderId: 'npc-sister-vael',
            siteId: 'site-world-chapel-saint-vey',
            roomId: 'chapel-infirmary',
            regime: 'medical' as const,
            condition: 'broken' as const,
            compliance: 'conflicted' as const,
            bondType: 'dependency' as const,
            timeHeldDays: 6,
            lastTransferDay: 2,
            questTag: null,
          },
        },
        npcSitePresences: [
          {
            occupancyId: 'occ-healer-chapel',
            npcId: actorId,
            siteId: 'site-world-chapel-saint-vey',
            roomId: 'chapel-infirmary',
            role: 'worker' as const,
            visibility: 'discreet' as const,
            status: 'present' as const,
            sinceDay: 1,
          },
        ],
      },
      () => 0.25,
    )

    expect(next.npcCaptivityStates[captiveId]?.condition).toBe('hurt')
    expect(next.roster.find((npc) => npc.npcId === captiveId)?.states.fear).toBeLessThan(35)
    expect(next.relationships[buildRelationshipKey('player', captiveId)]?.trust ?? 0).toBeGreaterThan(0)
  })

  it('lets observed captivity generate a room-level clue rumor that survives collapse-back', () => {
    const captiveId = 'npc-captive'
    const actorId = 'npc-visitor'
    const baseState = stateWithActors(
      npcBase({ npcId: captiveId, name: 'Captive' }),
      npcBase({ npcId: actorId, name: 'Visitor' }),
    )
    const concretized = concretizeSite(baseState, 'site-world-house-sorn')
    const interacted = applyNpcRoomInteractions(
      {
        ...concretized,
        npcCaptivityStates: {
          ...concretized.npcCaptivityStates,
          [captiveId]: {
            status: 'captive' as const,
            holderId: 'faction-civic-compact',
            siteId: 'site-world-house-sorn',
            roomId: 'sorn-locked-cellar',
            regime: 'guarded' as const,
            condition: 'hurt' as const,
            compliance: 'resistant' as const,
            bondType: 'fear' as const,
            timeHeldDays: 5,
            lastTransferDay: 2,
            questTag: 'quest-orren-wex-rescue',
          },
        },
        npcSitePresences: [
          {
            occupancyId: 'occ-visitor-sorn',
            npcId: actorId,
            siteId: 'site-world-house-sorn',
            roomId: 'sorn-locked-cellar',
            role: 'visitor' as const,
            visibility: 'discreet' as const,
            status: 'present' as const,
            sinceDay: 1,
          },
        ],
      },
      () => 0.2,
    )

    const collapsed = collapseSite(interacted, 'site-world-house-sorn')

    expect(collapsed.rumors.some((rumor) => rumor.eventSource === `room-observation:${captiveId}:site-world-house-sorn:sorn-locked-cellar`)).toBe(
      true,
    )
    expect(collapsed.npcCaptivityStates[captiveId]?.roomId).toBe('sorn-locked-cellar')
  })
})
