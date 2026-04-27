import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameStateSchema } from '../../domain'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialGameStateSnapshot, ...overrides })
  return createGameStore(state)
}

describe('acceptQuest', () => {
  it('moves quest from availableQuests to activeQuests', () => {
    const store = makeStore({
      availableQuests: ['quest-harborwatch'],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.acceptQuest({ questId: 'quest-harborwatch' }))

    const state = store.getState().game
    expect(state.availableQuests).not.toContain('quest-harborwatch')
    expect(state.activeQuests).toHaveLength(1)
    expect(state.activeQuests[0].questId).toBe('quest-harborwatch')
    expect(state.activeQuests[0].status).toBe('active')
    expect(state.activeQuests[0].objectiveMet).toBe(false)
  })

  it('logs an activity entry', () => {
    const store = makeStore({
      availableQuests: ['quest-harborwatch'],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.acceptQuest({ questId: 'quest-harborwatch' }))

    const log = store.getState().game.activityLog
    expect(log[0].message).toContain('Contract accepted')
    expect(log[0].message).toContain('Harborwatch')
  })

  it('does nothing if quest not in availableQuests', () => {
    const store = makeStore({
      availableQuests: [],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.acceptQuest({ questId: 'quest-harborwatch' }))

    const state = store.getState().game
    expect(state.activeQuests).toHaveLength(0)
  })
})

describe('completeQuest', () => {
  it('awards marks and moves quest to completedQuestIds', () => {
    const initialMoney = 100
    const store = makeStore({
      money: initialMoney,
      availableQuests: [],
      activeQuests: [{ questId: 'quest-harborwatch', acceptedOnDay: 1, status: 'active', objectiveMet: false }],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.completeQuest({ questId: 'quest-harborwatch' }))

    const state = store.getState().game
    expect(state.activeQuests).toHaveLength(0)
    expect(state.completedQuestIds).toContain('quest-harborwatch')
    // quest-harborwatch rewardMarks = 180
    expect(state.money).toBe(initialMoney + 180)
  })

  it('applies faction standing reward', () => {
    const store = makeStore({
      availableQuests: [],
      activeQuests: [{ questId: 'quest-harborwatch', acceptedOnDay: 1, status: 'active', objectiveMet: false }],
      completedQuestIds: [],
      factionStandings: {
        'faction-civic-compact': 10,
        'faction-gilded-court': -20,
        'faction-foundry-league': 5,
        'faction-tallow-ring': 15,
        'faction-restored': 0,
      },
    })

    store.dispatch(gameActions.completeQuest({ questId: 'quest-harborwatch' }))

    const state = store.getState().game
    // quest-harborwatch rewardStandingFactionId = 'faction-civic-compact', rewardStandingDelta = 8
    expect(state.factionStandings['faction-civic-compact']).toBe(18)
  })

  it('logs completion with marks received', () => {
    const store = makeStore({
      availableQuests: [],
      activeQuests: [{ questId: 'quest-harborwatch', acceptedOnDay: 1, status: 'active', objectiveMet: false }],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.completeQuest({ questId: 'quest-harborwatch' }))

    const log = store.getState().game.activityLog
    expect(log[0].message).toContain('Contract complete')
    expect(log[0].message).toContain('180 Marks')
  })
})

describe('failQuest', () => {
  it('applies standing penalty and removes from active', () => {
    const store = makeStore({
      availableQuests: [],
      activeQuests: [{ questId: 'quest-harborwatch', acceptedOnDay: 1, status: 'active', objectiveMet: false }],
      completedQuestIds: [],
      factionStandings: {
        'faction-civic-compact': 10,
        'faction-gilded-court': -20,
        'faction-foundry-league': 5,
        'faction-tallow-ring': 15,
        'faction-restored': 0,
      },
    })

    store.dispatch(gameActions.failQuest({ questId: 'quest-harborwatch' }))

    const state = store.getState().game
    expect(state.activeQuests).toHaveLength(0)
    // quest-harborwatch penaltyStandingDelta = -5, rewardStandingFactionId = 'faction-civic-compact'
    expect(state.factionStandings['faction-civic-compact']).toBe(5)
  })

  it('logs failure message', () => {
    const store = makeStore({
      availableQuests: [],
      activeQuests: [{ questId: 'quest-harborwatch', acceptedOnDay: 1, status: 'active', objectiveMet: false }],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.failQuest({ questId: 'quest-harborwatch' }))

    const log = store.getState().game.activityLog
    expect(log[0].message).toContain('Contract failed')
    expect(log[0].message).toContain('The house bears the cost')
  })
})

describe('expireTimedQuests', () => {
  it('removes overdue active quests', () => {
    const store = makeStore({
      day: 10,
      availableQuests: [],
      // quest-foundry-escort has timeLimitDays: 3, accepted on day 1 → expired at day 4+
      activeQuests: [
        { questId: 'quest-foundry-escort', acceptedOnDay: 1, status: 'active', objectiveMet: false },
      ],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.expireTimedQuests())

    const state = store.getState().game
    expect(state.activeQuests).toHaveLength(0)
  })

  it('does not remove quests still within time limit', () => {
    const store = makeStore({
      day: 2,
      availableQuests: [],
      // quest-foundry-escort timeLimitDays: 3, accepted day 1 → expires at day 4
      activeQuests: [
        { questId: 'quest-foundry-escort', acceptedOnDay: 1, status: 'active', objectiveMet: false },
      ],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.expireTimedQuests())

    const state = store.getState().game
    expect(state.activeQuests).toHaveLength(1)
  })

  it('does not remove quests with no time limit', () => {
    const store = makeStore({
      day: 100,
      availableQuests: [],
      // quest-ring-debt has timeLimitDays: null
      activeQuests: [
        { questId: 'quest-ring-debt', acceptedOnDay: 1, status: 'active', objectiveMet: false },
      ],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.expireTimedQuests())

    const state = store.getState().game
    expect(state.activeQuests).toHaveLength(1)
  })
})
