import { describe, expect, it } from 'vitest'

import type { GameState, NpcRuntimeState } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { applyAbstractCustodySimulation, ABSTRACT_CUSTODY_ALERT_EVENT_ID } from './applyAbstractCustodySimulation'
import { concretizeSite } from './siteLifecycle'

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
    npcMemory: [],
    bondStatus: null,
    npcArc: null,
    ...overrides,
  }
}

function stateWithActors(captive: NpcRuntimeState, actor: NpcRuntimeState): GameState {
  return {
    ...initialGameStateSnapshot,
    roster: [...initialGameStateSnapshot.roster, captive, actor],
  }
}

describe('applyAbstractCustodySimulation', () => {
  it('worsens harsh abstract captivity and queues a custody alert event', () => {
    const captiveId = 'npc-captive'
    const actorId = 'npc-guard'
    const state = stateWithActors(
      npcBase({ npcId: captiveId, name: 'Captive', states: { ...npcBase({}).states, fear: 14 } }),
      npcBase({ npcId: actorId, name: 'Guard', traits: { ...npcBase({}).traits, ruthlessness: 80, empathy: 10 } }),
    )

    const next = applyAbstractCustodySimulation(
      {
        ...state,
        npcCaptivityStates: {
          ...state.npcCaptivityStates,
          [captiveId]: {
            status: 'captive' as const,
            holderId: 'faction-gilded-court',
            siteId: 'site-world-house-sorn',
            roomId: 'sorn-locked-cellar',
            regime: 'guarded' as const,
            condition: 'hurt' as const,
            compliance: 'resistant' as const,
            bondType: 'fear' as const,
            timeHeldDays: 6,
            lastTransferDay: 2,
            questTag: 'quest-mira-rescue',
          },
        },
        npcSitePresences: [
          {
            occupancyId: 'occ-guard-sorn-abstract',
            npcId: actorId,
            siteId: 'site-world-house-sorn',
            roomId: null,
            role: 'guard' as const,
            visibility: 'hidden' as const,
            status: 'present' as const,
            sinceDay: 1,
          },
        ],
      },
      () => 0,
    )

    expect(next.npcCaptivityStates[captiveId]?.condition).toBe('broken')
    expect(next.roster.find((npc) => npc.npcId === captiveId)?.states.fear).toBeGreaterThan(14)
    expect(next.pendingEvents.some((event) => event.eventId === ABSTRACT_CUSTODY_ALERT_EVENT_ID)).toBe(true)
    expect(
      next.pendingEvents.find((event) => event.eventId === ABSTRACT_CUSTODY_ALERT_EVENT_ID)?.instanceId,
    ).toBeTruthy()
  })

  it('lets protective abstract custody improve condition and reduce fear', () => {
    const captiveId = 'npc-captive'
    const actorId = 'npc-healer'
    const state = stateWithActors(
      npcBase({ npcId: captiveId, name: 'Captive', states: { ...npcBase({}).states, fear: 36 } }),
      npcBase({ npcId: actorId, name: 'Healer', traits: { ...npcBase({}).traits, empathy: 85, ruthlessness: 5 } }),
    )

    const next = applyAbstractCustodySimulation(
      {
        ...state,
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
            timeHeldDays: 5,
            lastTransferDay: 2,
            questTag: null,
          },
        },
        npcSitePresences: [
          {
            occupancyId: 'occ-healer-chapel-abstract',
            npcId: actorId,
            siteId: 'site-world-chapel-saint-vey',
            roomId: null,
            role: 'worker' as const,
            visibility: 'discreet' as const,
            status: 'present' as const,
            sinceDay: 1,
          },
        ],
      },
      () => 0,
    )

    expect(next.npcCaptivityStates[captiveId]?.condition).toBe('hurt')
    expect(next.roster.find((npc) => npc.npcId === captiveId)?.states.fear).toBeLessThan(36)
  })

  it('preserves abstract custody consequences when the site becomes concrete later', () => {
    const captiveId = 'npc-captive'
    const actorId = 'npc-guard'
    const state = stateWithActors(
      npcBase({ npcId: captiveId, name: 'Captive' }),
      npcBase({ npcId: actorId, name: 'Guard', traits: { ...npcBase({}).traits, ruthlessness: 80, empathy: 10 } }),
    )

    const simulated = applyAbstractCustodySimulation(
      {
        ...state,
        npcCaptivityStates: {
          ...state.npcCaptivityStates,
          [captiveId]: {
            status: 'captive' as const,
            holderId: 'faction-gilded-court',
            siteId: 'site-world-house-sorn',
            roomId: 'sorn-locked-cellar',
            regime: 'guarded' as const,
            condition: 'hurt' as const,
            compliance: 'resistant' as const,
            bondType: 'fear' as const,
            timeHeldDays: 6,
            lastTransferDay: 2,
            questTag: null,
          },
        },
        npcSitePresences: [
          {
            occupancyId: 'occ-guard-sorn-abstract',
            npcId: actorId,
            siteId: 'site-world-house-sorn',
            roomId: null,
            role: 'guard' as const,
            visibility: 'hidden' as const,
            status: 'present' as const,
            sinceDay: 1,
          },
        ],
      },
      () => 0,
    )

    const concretized = concretizeSite(simulated, 'site-world-house-sorn')

    expect(concretized.npcCaptivityStates[captiveId]?.condition).toBe('broken')
    expect(concretized.npcCaptivityStates[captiveId]?.bondType).toBe('fear')
    expect(concretized.siteRuntimes['site-world-house-sorn']?.mode).toBe('concrete')
  })
})
