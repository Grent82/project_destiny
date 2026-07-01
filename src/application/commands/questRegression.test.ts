import { describe, expect, it } from 'vitest'

import { createQuestLeadRuntime, type QuestLeadRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../content/contentCatalog'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialStateWithIda } from './testFixtures'

function makeLead(questId: string, day = 1): QuestLeadRuntime {
  const template = getQuestTemplates().find((quest) => quest.id === questId)
  if (!template) {
    throw new Error(`Unknown quest template in test: ${questId}`)
  }

  return createQuestLeadRuntime(template, day)
}

function makeStoreForAcceptedQuest(questId: string, overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const store = createGameStore({
    ...initialStateWithIda,
    ...overrides,
    availableQuestLeads: [makeLead(questId)],
    activeQuests: [],
    completedQuestIds: [],
    failedQuestIds: [],
    questHistory: [],
  })

  store.dispatch(gameActions.acceptQuest({ questId }))
  return store
}

function concludeActiveCombatWithOutcome(
  store: ReturnType<typeof createGameStore>,
  outcome: 'victory' | 'defeat',
) {
  const current = store.getState().game
  if (!current.activeCombat) {
    throw new Error('Expected active combat before concluding encounter.')
  }

  store.dispatch(gameActions.replaceGameState({
    ...current,
    activeCombat: {
      ...current.activeCombat,
      outcome,
      activeCombatantId: null,
    },
  }))

  store.dispatch(gameActions.concludeCombatEncounter())
}

describe('quest regression coverage', () => {
  it('completes quest-compact-watch only after the real three-day investigation loop', () => {
    const store = makeStoreForAcceptedQuest('quest-compact-watch', {
      currentDistrictId: 'district-the-pale',
      day: 1,
      timeSlot: 'morning',
    })

    for (let dayIndex = 0; dayIndex < 3; dayIndex += 1) {
      store.dispatch(gameActions.startInvestigation({ questId: 'quest-compact-watch' }))
      store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'surveillance' }))
      store.dispatch(gameActions.replaceGameState({
        ...store.getState().game,
        rngSeed: 42,
      }))
      store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

      const state = store.getState().game
      const surveillanceEntries = state.questHistory
        .flatMap((quest) => quest.journalEntries)
        .concat(state.activeQuests.flatMap((quest) => quest.journalEntries))
        .filter((entry) => entry.startsWith('Surveillance day '))

      expect(surveillanceEntries).toHaveLength(dayIndex + 1)

      if (dayIndex < 2) {
        expect(state.completedQuestIds).not.toContain('quest-compact-watch')
        expect(state.activeQuests.some((quest) => quest.questId === 'quest-compact-watch')).toBe(true)
        store.dispatch(gameActions.sleepToMorning())
      }
    }

    const finalState = store.getState().game
    expect(finalState.completedQuestIds).toContain('quest-compact-watch')
    expect(finalState.activeQuests.find((quest) => quest.questId === 'quest-compact-watch')).toBeUndefined()
    expect(finalState.money).toBeGreaterThan(initialStateWithIda.money)
  })

  it('does not double-log surveillance progress when quest-compact-watch is re-run on the same day', () => {
    const store = makeStoreForAcceptedQuest('quest-compact-watch', {
      currentDistrictId: 'district-the-pale',
      day: 1,
      timeSlot: 'morning',
    })

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-compact-watch' }))
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'surveillance' }))
    store.dispatch(gameActions.replaceGameState({
      ...store.getState().game,
      rngSeed: 42,
    }))
    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const afterFirstRun = store.getState().game
    const afterFirstRuntime = afterFirstRun.activeQuests.find((quest) => quest.questId === 'quest-compact-watch')
    if (!afterFirstRuntime) {
      throw new Error('Expected compact watch to remain active after the first day.')
    }

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-compact-watch' }))
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'surveillance' }))
    store.dispatch(gameActions.replaceGameState({
      ...store.getState().game,
      rngSeed: 42,
    }))
    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const afterSecondRun = store.getState().game
    const afterSecondRuntime = afterSecondRun.activeQuests.find((quest) => quest.questId === 'quest-compact-watch')
    if (!afterSecondRuntime) {
      throw new Error('Expected compact watch to remain active after a same-day re-run.')
    }

    const surveillanceEntries = afterSecondRuntime.journalEntries.filter((entry) =>
      entry.startsWith('Surveillance day '),
    )

    expect(afterSecondRuntime.progress.completedSteps).toBe(afterFirstRuntime.progress.completedSteps)
    expect(surveillanceEntries).toEqual(['Surveillance day 1 of 3 logged.'])
    expect(afterSecondRun.completedQuestIds).not.toContain('quest-compact-watch')
  })

  it('keeps quest-pale-wagon-escort active after the first watch and completes it on the second', () => {
    const store = makeStoreForAcceptedQuest('quest-pale-wagon-escort', {
      currentDistrictId: 'district-the-pale',
      day: 1,
      timeSlot: 'morning',
    })

    store.dispatch(gameActions.advanceToOnSiteStep({ questId: 'quest-pale-wagon-escort' }))
    store.dispatch(gameActions.advanceTimeSlot())
    store.dispatch(gameActions.resolveContractWithComplicationCheck({ questId: 'quest-pale-wagon-escort' }))

    let state = store.getState().game
    expect(state.completedQuestIds).not.toContain('quest-pale-wagon-escort')
    expect(state.activeQuests.some((quest) => quest.questId === 'quest-pale-wagon-escort')).toBe(true)

    store.dispatch(gameActions.advanceTimeSlot())
    store.dispatch(gameActions.resolveContractWithComplicationCheck({ questId: 'quest-pale-wagon-escort' }))

    state = store.getState().game
    expect(state.completedQuestIds).toContain('quest-pale-wagon-escort')
    expect(state.activeQuests.find((quest) => quest.questId === 'quest-pale-wagon-escort')).toBeUndefined()
  })

  it('settles quest-ring-debt-collection when a linked combat ends in victory', () => {
    const store = makeStoreForAcceptedQuest('quest-ring-debt-collection', {
      currentDistrictId: 'district-the-hollows',
      selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
    })

    store.dispatch(gameActions.startCombatEncounter({ questId: 'quest-ring-debt-collection' }))
    concludeActiveCombatWithOutcome(store, 'victory')

    const state = store.getState().game
    expect(state.completedQuestIds).toContain('quest-ring-debt-collection')
    expect(state.activeQuests.find((quest) => quest.questId === 'quest-ring-debt-collection')).toBeUndefined()
  })

  it('fails quest-ring-debt-collection when a linked combat ends in defeat', () => {
    const store = makeStoreForAcceptedQuest('quest-ring-debt-collection', {
      currentDistrictId: 'district-the-hollows',
      selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
    })

    store.dispatch(gameActions.startCombatEncounter({ questId: 'quest-ring-debt-collection' }))
    concludeActiveCombatWithOutcome(store, 'defeat')

    const state = store.getState().game
    expect(state.completedQuestIds).not.toContain('quest-ring-debt-collection')
    expect(state.failedQuestIds).toContain('quest-ring-debt-collection')
    expect(state.activeQuests.find((quest) => quest.questId === 'quest-ring-debt-collection')).toBeUndefined()
  })
})
