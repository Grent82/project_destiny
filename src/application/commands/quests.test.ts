import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameStateSchema } from '../../domain'
import { createQuestLeadRuntime, createQuestRuntime, type QuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../content/contentCatalog'
import { contentCatalog } from '../content/contentCatalog'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialGameStateSnapshot, ...overrides })
  return createGameStore(state)
}

function makeActiveQuest(questId: string, overrides: Partial<QuestRuntime> = {}): QuestRuntime {
  const template = getQuestTemplates().find((quest) => quest.id === questId)
  if (!template) {
    throw new Error(`Unknown quest template in test: ${questId}`)
  }

  const base = createQuestRuntime(template, 1)
  return {
    ...base,
    ...overrides,
    progress: {
      ...base.progress,
      ...overrides.progress,
    },
    context: {
      ...base.context,
      ...overrides.context,
    },
    journalEntries: overrides.journalEntries ?? base.journalEntries,
  }
}

function makeLead(questId: string, day = 1) {
  const template = getQuestTemplates().find((quest) => quest.id === questId)
  if (!template) {
    throw new Error(`Unknown quest template in test: ${questId}`)
  }

  return createQuestLeadRuntime(template, day)
}

describe('acceptQuest', () => {
  it('moves quest from availableQuestLeads to activeQuests', () => {
    const store = makeStore({
      availableQuestLeads: [makeLead('quest-harborwatch')],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.acceptQuest({ questId: 'quest-harborwatch' }))

    const state = store.getState().game
    expect(state.availableQuestLeads.some((lead) => lead.questId === 'quest-harborwatch')).toBe(false)
    expect(state.activeQuests).toHaveLength(1)
    expect(state.activeQuests[0].questId).toBe('quest-harborwatch')
    expect(state.activeQuests[0].acceptedTitle).toBe('The Harborwatch Dispute')
    expect(state.activeQuests[0].status).toBe('active')
    expect(state.activeQuests[0].stageId).toBe('accepted')
    expect(state.activeQuests[0].objectiveMet).toBe(false)
    expect(state.activeQuests[0].context.incidentDistrictId).toBe('district-the-warrens')
    expect(state.activeQuests[0].progress.requiredSteps).toBeGreaterThan(1)
  })

  it('logs an activity entry', () => {
    const store = makeStore({
      availableQuestLeads: [makeLead('quest-harborwatch')],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.acceptQuest({ questId: 'quest-harborwatch' }))

    const log = store.getState().game.activityLog
    expect(log[0].message).toContain('Contract accepted')
    expect(log[0].message).toContain('Harborwatch')
  })

  it('does nothing if quest not in availableQuestLeads', () => {
    const store = makeStore({
      availableQuestLeads: [],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.acceptQuest({ questId: 'quest-harborwatch' }))

    const state = store.getState().game
    expect(state.activeQuests).toHaveLength(0)
  })

  it('does not accept a lead after it has expired', () => {
    const store = makeStore({
      day: 7,
      availableQuestLeads: [makeLead('quest-harborwatch', 1)],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.acceptQuest({ questId: 'quest-harborwatch' }))

    const state = store.getState().game
    expect(state.activeQuests).toHaveLength(0)
    expect(state.availableQuestLeads.some((lead) => lead.questId === 'quest-harborwatch')).toBe(true)
  })

  it('advances Mira to location-known only when the rescue lead is explicitly taken on', () => {
    const store = makeStore({
      availableQuestLeads: [makeLead('quest-mira-rescue')],
      activeQuests: [],
      completedQuestIds: [],
      mainQuest: {
        stage: 'lead-found',
        lastClue: 'Tessaly Ash claims she can help if the house commits.',
      },
    })

    store.dispatch(gameActions.acceptQuest({ questId: 'quest-mira-rescue' }))

    expect(store.getState().game.mainQuest.stage).toBe('location-known')
    expect(store.getState().game.mainQuest.lastClue).toContain('old tannery')
  })

  it('keeps authored execution duration separate from time limit when a lead is accepted', () => {
    const store = makeStore({
      availableQuestLeads: [makeLead('quest-compact-watch')],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.acceptQuest({ questId: 'quest-compact-watch' }))

    const runtime = store.getState().game.activeQuests[0]
    expect(runtime.context.executionDurationDays).toBe(3)
    expect(runtime.context.executionDurationWatches).toBeNull()
  })
})

describe('quest lead discovery', () => {
  it('discovers local work when the player reviews contracts at the matching POI', () => {
    const store = makeStore({
      availableQuestLeads: [],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(
      gameActions.discoverQuestLeadsAtPoi({
        districtId: 'district-harbor',
        poiId: 'poi-harbor-guild-hall',
      }),
    )

    const state = store.getState().game
    expect(state.availableQuestLeads.some((lead) => lead.questId === 'quest-harborwatch')).toBe(true)
  })

  it('does not discover guild work from the wrong venue type', () => {
    const store = makeStore({
      availableQuestLeads: [],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(
      gameActions.discoverQuestLeadsAtPoi({
        districtId: 'district-harbor',
        poiId: 'poi-harbor-the-berth',
      }),
    )

    const state = store.getState().game
    expect(state.availableQuestLeads.some((lead) => lead.questId === 'quest-harborwatch')).toBe(false)
  })

  it('discovers NPC-gated story work only from the matching contact', () => {
    const store = makeStore({
      availableQuestLeads: [],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(
      gameActions.discoverQuestLeadsFromNpc({
        districtId: 'district-the-pale',
        npcId: 'npc-tessaly-ash',
        poiId: 'poi-pale-wren-safe-house',
      }),
    )

    const state = store.getState().game
    expect(state.availableQuestLeads.some((lead) => lead.questId === 'quest-mira-rescue')).toBe(true)
  })
})

describe('completeQuest', () => {
  it('awards marks and moves quest to completedQuestIds', () => {
    const initialMoney = 100
    const store = makeStore({
      money: initialMoney,
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-harborwatch')],
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
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-harborwatch')],
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
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-harborwatch')],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.completeQuest({ questId: 'quest-harborwatch' }))

    const log = store.getState().game.activityLog
    const completionLog = log.find((e) => e.message.includes('Contract complete'))
    expect(completionLog?.message).toContain('Contract complete')
    expect(completionLog?.message).toContain('180 Marks')
  })

  it('rescues Mira only when the dedicated rescue quest is completed', () => {
    const store = makeStore({
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-mira-rescue')],
      completedQuestIds: [],
      mainQuest: {
        stage: 'location-known',
        lastClue: 'The Pale tannery lies beyond the second gate.',
      },
    })

    store.dispatch(gameActions.completeQuest({ questId: 'quest-mira-rescue' }))

    expect(store.getState().game.mainQuest.stage).toBe('rescued')
    expect(store.getState().game.mainQuest.lastClue).toContain('Mira is back')
    expect(store.getState().game.activityLog.some((entry) => entry.message.includes('Mira is out'))).toBe(true)
  })
})

describe('failQuest', () => {
  it('applies standing penalty and removes from active', () => {
    const store = makeStore({
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-harborwatch')],
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
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-harborwatch')],
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
      availableQuestLeads: [],
      // quest-foundry-escort has timeLimitDays: 3, accepted on day 1 → expired at day 4+
      activeQuests: [
        makeActiveQuest('quest-foundry-escort'),
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
      availableQuestLeads: [],
      // quest-foundry-escort timeLimitDays: 3, accepted day 1 → expires at day 4
      activeQuests: [
        makeActiveQuest('quest-foundry-escort'),
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
      availableQuestLeads: [],
      // quest-ring-debt has timeLimitDays: null
      activeQuests: [
        makeActiveQuest('quest-ring-debt'),
      ],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.expireTimedQuests())

    const state = store.getState().game
    expect(state.activeQuests).toHaveLength(1)
  })

  it('keeps multi-stage runtime context after acceptance', () => {
    const store = makeStore({
      availableQuestLeads: [makeLead('quest-mira-rescue')],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.acceptQuest({ questId: 'quest-mira-rescue' }))

    const runtime = store.getState().game.activeQuests[0]
    expect(runtime.acceptedTitle).toBeTruthy()
    expect(runtime.currentObjectiveLabel).toBeTruthy()
    expect(runtime.context.discoverySource).toBe('npc')
    expect(runtime.context.discoveryDistrictId).toBe('district-the-pale')
    expect(runtime.context.sourceNpcId).toBeTruthy()
    expect(runtime.progress.requiredSteps).toBeGreaterThan(1)
    expect(runtime.journalEntries.length).toBeGreaterThan(0)
  })
})

describe('quest catalog integrity', () => {
  it('every quest template has a sourceNpcId assigned', () => {
    const templates = getQuestTemplates()
    const withoutGiver = templates.filter((t) => t.sourceNpcId == null)

    expect(withoutGiver).toHaveLength(0)
    if (withoutGiver.length > 0) {
      console.error('Quests without sourceNpcId:', withoutGiver.map((t) => t.id))
    }
  })

  it('every sourceNpcId references a valid NPC definition', () => {
    const templates = getQuestTemplates()
    const invalidGivers = templates.filter((t) => {
      if (t.sourceNpcId == null) return false
      return !contentCatalog.npcsById.has(t.sourceNpcId)
    })

    expect(invalidGivers).toHaveLength(0)
    if (invalidGivers.length > 0) {
      console.error('Quests with invalid sourceNpcId:', invalidGivers.map((t) => ({ id: t.id, sourceNpcId: t.sourceNpcId })))
    }
  })
})
