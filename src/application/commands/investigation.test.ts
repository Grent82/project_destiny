import { describe, it, expect, vi, afterEach } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { initialStateWithIda } from './testFixtures'
import { gameStateSchema } from '../../domain'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialStateWithIda, ...overrides })
  return createGameStore(state)
}

afterEach(() => {
  vi.restoreAllMocks()
})

// Marion Vale has negotiation: 68, intrigue: 41 (both above difficulty 55)
// With skill 68: effectiveRoll = roll + (68 - 55) = roll + 13 → need roll >= 7 for success
// With Math.random() = 0.99 → roll = 99, effectiveRoll = 112 → success

describe('startInvestigation', () => {
  it('sets activeInvestigation for an investigation quest', () => {
    const store = makeStore({
      activeQuests: [
        { questId: 'quest-ledger-recovery', acceptedOnDay: 1, status: 'active', objectiveMet: false },
      ],
    })

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-ledger-recovery' }))

    const state = store.getState().game
    expect(state.activeInvestigation).not.toBeNull()
    expect(state.activeInvestigation?.questId).toBe('quest-ledger-recovery')
    expect(state.activeInvestigation?.districtId).toBe('district-the-pale')
    expect(state.activeInvestigation?.rollResult).toBe('pending')
  })

  it('is a no-op for a non-investigation quest', () => {
    const store = makeStore({
      activeQuests: [
        { questId: 'quest-harborwatch', acceptedOnDay: 1, status: 'active', objectiveMet: false },
      ],
    })

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-harborwatch' }))

    const state = store.getState().game
    expect(state.activeInvestigation).toBeNull()
  })

  it('is a no-op for an unknown quest id', () => {
    const store = makeStore()
    store.dispatch(gameActions.startInvestigation({ questId: 'quest-does-not-exist' }))
    expect(store.getState().game.activeInvestigation).toBeNull()
  })
})

describe('resolveInvestigation', () => {
  it('produces success with high skill and high roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // roll = 99, effectiveRoll = 99 + 13 = 112 → success

    const store = makeStore({
      activeInvestigation: {
        questId: 'quest-ledger-recovery',
        districtId: 'district-the-pale',
        rollResult: 'pending',
      },
      activeQuests: [
        { questId: 'quest-ledger-recovery', acceptedOnDay: 1, status: 'active', objectiveMet: false },
      ],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 20,
      },
      money: 0,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.activeInvestigation).toBeNull()
    expect(state.money).toBe(250) // rewardMarks
    expect(state.factionStandings['faction-gilded-court']).toBe(30) // 20 + 10
    expect(state.completedQuestIds).toContain('quest-ledger-recovery')
    expect(state.activeQuests.find((q) => q.questId === 'quest-ledger-recovery')).toBeUndefined()
    expect(state.activityLog[0].message).toMatch(/investigation concludes/i)
  })

  it('produces partial result with moderate roll', () => {
    // effectiveRoll must be >= 0 and < 20
    // With Marion's negotiation 68: effectiveRoll = roll + 13
    // Need effectiveRoll in [0, 20) → roll in [-13, 7) → Math.random returns 0.05 → roll=5 → effectiveRoll=18 → partial
    vi.spyOn(Math, 'random').mockReturnValue(0.05)

    const store = makeStore({
      activeInvestigation: {
        questId: 'quest-ledger-recovery',
        districtId: 'district-the-pale',
        rollResult: 'pending',
      },
      activeQuests: [
        { questId: 'quest-ledger-recovery', acceptedOnDay: 1, status: 'active', objectiveMet: false },
      ],
      money: 0,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.activeInvestigation).toBeNull()
    expect(state.money).toBe(125) // half of 250
    expect(state.completedQuestIds).toContain('quest-ledger-recovery')
    expect(state.activityLog[0].message).toMatch(/yields something/i)
  })

  it('produces failure with low skill and low roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // roll = 1

    // Use Ida Rhys who has low investigation skills (intrigue: 11, security: 31, admin: unknown)
    const store = makeStore({
      activeInvestigation: {
        questId: 'quest-ledger-recovery',
        districtId: 'district-the-pale',
        rollResult: 'pending',
      },
      activeQuests: [
        { questId: 'quest-ledger-recovery', acceptedOnDay: 1, status: 'active', objectiveMet: false },
      ],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 20,
      },
      money: 100,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-ida-rhys'] }))

    // Ida Rhys: best skill likely intrigue:11, security:31 → bestSkill=31
    // effectiveRoll = 1 + (31 - 55) = 1 - 24 = -23 → failure
    const state = store.getState().game
    expect(state.activeInvestigation).toBeNull()
    expect(state.money).toBe(100) // no reward
    expect(state.factionStandings['faction-gilded-court']).toBe(12) // 20 + (-8 penalty)
    expect(state.completedQuestIds).not.toContain('quest-ledger-recovery')
    expect(state.activityLog[0].message).toMatch(/goes nowhere/i)
  })

  it('failure applies standing penalty', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0) // roll = 0

    const store = makeStore({
      activeInvestigation: {
        questId: 'quest-ledger-recovery',
        districtId: 'district-the-pale',
        rollResult: 'pending',
      },
      activeQuests: [
        { questId: 'quest-ledger-recovery', acceptedOnDay: 1, status: 'active', objectiveMet: false },
      ],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 0,
      },
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-ida-rhys'] }))

    // penaltyStandingDelta: -8
    const state = store.getState().game
    expect(state.factionStandings['faction-gilded-court']).toBe(-8)
  })

  it('success awards full marks and standing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    const store = makeStore({
      activeInvestigation: {
        questId: 'quest-restored-appeal',
        districtId: null,
        rollResult: 'pending',
      },
      activeQuests: [
        { questId: 'quest-restored-appeal', acceptedOnDay: 1, status: 'active', objectiveMet: false },
      ],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-restored': 10,
      },
      money: 50,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.money).toBe(200) // 50 + 150 reward
    expect(state.factionStandings['faction-restored']).toBe(25) // 10 + 15
    expect(state.completedQuestIds).toContain('quest-restored-appeal')
  })

  it('does nothing if no activeInvestigation is set', () => {
    const store = makeStore({ activeInvestigation: null })
    const before = store.getState().game

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.money).toBe(before.money)
    expect(state.activityLog.length).toBe(before.activityLog.length)
  })
})
