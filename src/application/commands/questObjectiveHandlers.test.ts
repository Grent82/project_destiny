import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameActions } from '../store/gameSlice'
import { advanceToOnSiteStep, resolveWithComplicationCheck, addQuestLeadIfNew, acceptQuestFromLead } from './questLifecycle'
import type { GameState } from '../../domain/game/contracts'

/** Build a game state with a delivery or survival quest already accepted */
function stateWithActiveQuest(questId: string): GameState {
  // Deep clone mutable arrays
  let state: GameState = JSON.parse(JSON.stringify(initialGameStateSnapshot))
  state = addQuestLeadIfNew(state, questId)
  state = acceptQuestFromLead(state, questId)
  return state
}

describe('advanceToOnSiteStep', () => {
  it('advances a delivery quest from step 0 to step 2', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const result = advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    expect(result).not.toBe(state) // Should return new state
    const runtime = result.activeQuests.find((q) => q.questId === 'quest-nightbloom-extract')!
    expect(runtime.progress.completedSteps).toBe(2)
    expect(runtime.stageId).toBe('on-site')
  })

  it('advances a survival quest from step 0 to step 2', () => {
    const state = stateWithActiveQuest('quest-pale-wagon-escort')
    const result = advanceToOnSiteStep(state, 'quest-pale-wagon-escort')
    const runtime = result.activeQuests.find((q) => q.questId === 'quest-pale-wagon-escort')!
    expect(runtime.progress.completedSteps).toBe(2)
  })

  it('returns same state when already at step 2', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const nextState = advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    const result = advanceToOnSiteStep(nextState, 'quest-nightbloom-extract')
    expect(result).toBe(nextState) // Should return same state (no change)
  })

  it('returns same state for unknown quest', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const result = advanceToOnSiteStep(state, 'quest-unknown')
    expect(result).toBe(state) // Should return same state (no change)
  })

  it('updates the objective label in the journal', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const result = advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    const runtime = result.activeQuests.find((q) => q.questId === 'quest-nightbloom-extract')!
    expect(runtime.journalEntries.length).toBeGreaterThan(0)
    expect(runtime.currentObjectiveLabel).toContain('exchange')
  })
})

describe('resolveSimpleContractObjective - step guard', () => {
  it('does not resolve a delivery quest that has not reached step 2', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const store = createGameStore(state)
    store.dispatch(gameActions.resolveSimpleContract({ questId: 'quest-nightbloom-extract' }))
    // Quest should still be active
    expect(store.getState().game.activeQuests.some((q) => q.questId === 'quest-nightbloom-extract')).toBe(true)
  })

  it('resolves after step 2 is reached', () => {
    let state = stateWithActiveQuest('quest-nightbloom-extract')
    state = advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    const store = createGameStore(state)
    store.dispatch(gameActions.resolveSimpleContract({ questId: 'quest-nightbloom-extract' }))
    expect(store.getState().game.completedQuestIds).toContain('quest-nightbloom-extract')
  })
})

describe('resolveWithComplicationCheck', () => {
  it('completes quest when complicationRisk is 0', () => {
    let state = stateWithActiveQuest('quest-nightbloom-extract')
    state = advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    state = resolveWithComplicationCheck(state, 'quest-nightbloom-extract', 0)
    expect(state.completedQuestIds).toContain('quest-nightbloom-extract')
  })

  it('returns unchanged state when completedSteps < 2', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const beforeSteps = state.activeQuests.find((q) => q.questId === 'quest-nightbloom-extract')?.progress.completedSteps
    const nextState = resolveWithComplicationCheck(state, 'quest-nightbloom-extract', 0)
    const afterSteps = nextState.activeQuests.find((q) => q.questId === 'quest-nightbloom-extract')?.progress.completedSteps
    expect(beforeSteps).toBe(afterSteps)
  })

  it('returns unchanged state for unknown quest', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const beforeQuests = state.activeQuests.length
    const nextState = resolveWithComplicationCheck(state, 'quest-unknown', 0)
    expect(nextState.activeQuests.length).toBe(beforeQuests)
  })

  it('can fail a delivery with high complication risk', () => {
    // complicationRisk = 1 means always fail
    let state = stateWithActiveQuest('quest-nightbloom-extract')
    state = advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    state = resolveWithComplicationCheck(state, 'quest-nightbloom-extract', 1)
    // Quest should be gone from activeQuests
    expect(state.activeQuests.some((q) => q.questId === 'quest-nightbloom-extract')).toBe(false)
    // And not in completed (it failed)
    expect(state.completedQuestIds).not.toContain('quest-nightbloom-extract')
  })

  it('runs survival quest through full progression', () => {
    let state = stateWithActiveQuest('quest-pale-wagon-escort')
    state = advanceToOnSiteStep(state, 'quest-pale-wagon-escort')
    state = resolveWithComplicationCheck(state, 'quest-pale-wagon-escort', 0)
    expect(state.completedQuestIds).not.toContain('quest-pale-wagon-escort')
    expect(state.activeQuests.some((q) => q.questId === 'quest-pale-wagon-escort')).toBe(true)
  })

  it('completes a multi-watch survival quest on the final watch', () => {
    let state = stateWithActiveQuest('quest-pale-wagon-escort')
    state = advanceToOnSiteStep(state, 'quest-pale-wagon-escort')
    state = resolveWithComplicationCheck(state, 'quest-pale-wagon-escort', 0)
    state = resolveWithComplicationCheck(state, 'quest-pale-wagon-escort', 0)
    expect(state.completedQuestIds).toContain('quest-pale-wagon-escort')
  })
})
