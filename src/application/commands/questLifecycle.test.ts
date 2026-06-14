import { describe, expect, it } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameStateSchema } from '../../domain'
import { createQuestLeadRuntime, createQuestRuntime, type QuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../content/contentCatalog'
import { canDiscoverQuest } from './questLifecycle'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialGameStateSnapshot, ...overrides })
  return createGameStore(state)
}

function makeLead(questId: string, day = 1) {
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) throw new Error(`Unknown quest template: ${questId}`)
  return createQuestLeadRuntime(template, day)
}

function makeActiveQuest(questId: string, overrides: Partial<QuestRuntime> = {}): QuestRuntime {
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) throw new Error(`Unknown quest template: ${questId}`)
  const base = createQuestRuntime(template, 1)
  return { ...base, ...overrides, progress: { ...base.progress, ...overrides.progress }, context: { ...base.context, ...overrides.context }, journalEntries: overrides.journalEntries ?? base.journalEntries }
}

describe('canDiscoverQuest', () => {
  it('returns true when quest is not known', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      availableQuestLeads: [],
      activeQuests: [],
      completedQuestIds: [],
    })
    expect(canDiscoverQuest(state, 'quest-harborwatch')).toBe(true)
  })

  it('returns false when quest is already a lead', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      availableQuestLeads: [makeLead('quest-harborwatch')],
      activeQuests: [],
      completedQuestIds: [],
    })
    expect(canDiscoverQuest(state, 'quest-harborwatch')).toBe(false)
  })

  it('returns false when quest is active', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-harborwatch')],
      completedQuestIds: [],
    })
    expect(canDiscoverQuest(state, 'quest-harborwatch')).toBe(false)
  })

  it('returns false when quest is completed', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      availableQuestLeads: [],
      activeQuests: [],
      completedQuestIds: ['quest-harborwatch'],
    })
    expect(canDiscoverQuest(state, 'quest-harborwatch')).toBe(false)
  })
})

describe('acceptQuestFromLead (via acceptQuest action)', () => {
  it('moves quest from availableQuestLeads to activeQuests', () => {
    const store = makeStore({ availableQuestLeads: [makeLead('quest-harborwatch')], activeQuests: [], completedQuestIds: [] })
    store.dispatch(gameActions.acceptQuest({ questId: 'quest-harborwatch' }))
    const state = store.getState().game
    expect(state.availableQuestLeads.some((l) => l.questId === 'quest-harborwatch')).toBe(false)
    expect(state.activeQuests).toHaveLength(1)
    expect(state.activeQuests[0].questId).toBe('quest-harborwatch')
    expect(state.activeQuests[0].status).toBe('active')
  })

  it('does nothing when no matching valid lead exists', () => {
    const store = makeStore({ availableQuestLeads: [], activeQuests: [], completedQuestIds: [] })
    store.dispatch(gameActions.acceptQuest({ questId: 'quest-harborwatch' }))
    expect(store.getState().game.activeQuests).toHaveLength(0)
  })

  it('advances mainQuest to location-known when mira rescue lead is taken', () => {
    const store = makeStore({
      availableQuestLeads: [makeLead('quest-mira-rescue')],
      activeQuests: [],
      completedQuestIds: [],
      mainQuest: { stage: 'lead-found', lastClue: 'Tessaly knows.' },
    })
    store.dispatch(gameActions.acceptQuest({ questId: 'quest-mira-rescue' }))
    expect(store.getState().game.mainQuest.stage).toBe('location-known')
  })
})

describe('expireTimedQuestsOnState (via expireTimedQuests action)', () => {
  it('marks overdue quests as failed and removes them from activeQuests', () => {
    const store = makeStore({
      day: 10,
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-foundry-escort')], // timeLimitDays: 3
      completedQuestIds: [],
    })
    store.dispatch(gameActions.expireTimedQuests())
    expect(store.getState().game.activeQuests).toHaveLength(0)
  })

  it('applies standing penalty when a timed quest expires', () => {
    const store = makeStore({
      day: 10,
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-foundry-escort')],
      completedQuestIds: [],
      factionStandings: { 'faction-foundry-league': 20 },
    })
    store.dispatch(gameActions.expireTimedQuests())
    const standing = store.getState().game.factionStandings['faction-foundry-league']
    expect(standing).toBeLessThan(20)
  })

  it('keeps quests still within their time limit', () => {
    const store = makeStore({
      day: 2,
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-foundry-escort')],
      completedQuestIds: [],
    })
    store.dispatch(gameActions.expireTimedQuests())
    expect(store.getState().game.activeQuests).toHaveLength(1)
  })

  it('keeps quests with no time limit regardless of day', () => {
    const store = makeStore({
      day: 100,
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-ring-debt')],
      completedQuestIds: [],
    })
    store.dispatch(gameActions.expireTimedQuests())
    expect(store.getState().game.activeQuests).toHaveLength(1)
  })

  it('logs expiry message', () => {
    const store = makeStore({
      day: 10,
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-foundry-escort')],
      completedQuestIds: [],
    })
    store.dispatch(gameActions.expireTimedQuests())
    expect(store.getState().game.activityLog[0].message).toContain('Contract failed')
  })
})

describe('resolveSimpleContractObjective (via resolveSimpleContract action)', () => {
  it('settles a delivery quest and moves it to completedQuestIds', () => {
    const store = makeStore({
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-nightbloom-extract')],
      completedQuestIds: [],
    })
    // Must advance to on-site step first (step guard in resolveSimpleContractObjective)
    store.dispatch(gameActions.advanceToOnSiteStep({ questId: 'quest-nightbloom-extract' }))
    store.dispatch(gameActions.resolveSimpleContract({ questId: 'quest-nightbloom-extract' }))
    const state = store.getState().game
    expect(state.activeQuests.some((q) => q.questId === 'quest-nightbloom-extract')).toBe(false)
    expect(state.completedQuestIds).toContain('quest-nightbloom-extract')
  })

  it('does nothing for a combat-type quest', () => {
    const store = makeStore({
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-harborwatch')], // combat objective
      completedQuestIds: [],
    })
    store.dispatch(gameActions.resolveSimpleContract({ questId: 'quest-harborwatch' }))
    expect(store.getState().game.activeQuests).toHaveLength(1)
    expect(store.getState().game.completedQuestIds).toHaveLength(0)
  })

  it('does nothing if quest is not active', () => {
    const store = makeStore({ availableQuestLeads: [], activeQuests: [], completedQuestIds: [] })
    store.dispatch(gameActions.resolveSimpleContract({ questId: 'quest-nightbloom-extract' }))
    expect(store.getState().game.completedQuestIds).toHaveLength(0)
  })
})

describe('failed quest archiving and rediscovery prevention', () => {
  it('archives failed quests to questHistory and failedQuestIds', () => {
    const store = makeStore({
      day: 10,
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-foundry-escort')],
      completedQuestIds: [],
      failedQuestIds: [],
      questHistory: [],
    })
    store.dispatch(gameActions.expireTimedQuests())
    const state = store.getState().game
    expect(state.failedQuestIds).toContain('quest-foundry-escort')
    expect(state.questHistory).toHaveLength(1)
    expect(state.questHistory[0].questId).toBe('quest-foundry-escort')
    expect(state.questHistory[0].status).toBe('failed')
  })

  it('archives completed quests to questHistory', () => {
    const store = makeStore({
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-nightbloom-extract')],
      completedQuestIds: [],
      failedQuestIds: [],
      questHistory: [],
    })
    store.dispatch(gameActions.advanceToOnSiteStep({ questId: 'quest-nightbloom-extract' }))
    store.dispatch(gameActions.resolveSimpleContract({ questId: 'quest-nightbloom-extract' }))
    const state = store.getState().game
    expect(state.questHistory).toHaveLength(1)
    expect(state.questHistory[0].questId).toBe('quest-nightbloom-extract')
    expect(state.questHistory[0].status).toBe('completed')
  })

  it('prevents rediscovery of failed quests with retryBehavior fail', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      availableQuestLeads: [],
      activeQuests: [],
      completedQuestIds: [],
      failedQuestIds: ['quest-foundry-escort'],
      questHistory: [makeActiveQuest('quest-foundry-escort', { status: 'failed' })],
    })
    // quest-foundry-escort has retryBehavior 'fail' (default)
    expect(canDiscoverQuest(state, 'quest-foundry-escort')).toBe(false)
  })

  it('allows rediscovery of failed quests with retryBehavior retryable', () => {
    // Create a failed quest with retryable behavior
    const failedQuest = makeActiveQuest('quest-harborwatch', {
      status: 'failed',
      context: { ...makeActiveQuest('quest-harborwatch').context, retryBehavior: 'retryable' },
    })
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      availableQuestLeads: [],
      activeQuests: [],
      completedQuestIds: [],
      failedQuestIds: ['quest-harborwatch'],
      questHistory: [failedQuest],
    })
    expect(canDiscoverQuest(state, 'quest-harborwatch')).toBe(true)
  })
})
