import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameActions } from '../store/gameSlice'
import { advanceToOnSiteStep, resolveWithComplicationCheck, addQuestLeadIfNew, acceptQuestFromLead } from './questLifecycle'
import type { GameState } from '../../domain/game/contracts'

/** Build a game state with a delivery or survival quest already accepted */
function stateWithActiveQuest(questId: string): GameState {
  // Deep clone mutable arrays
  const cloned: GameState = JSON.parse(JSON.stringify(initialGameStateSnapshot))
  addQuestLeadIfNew(cloned, questId)
  acceptQuestFromLead(cloned, questId)
  return cloned
}

describe('advanceToOnSiteStep', () => {
  it('advances a delivery quest from step 0 to step 2', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const result = advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    expect(result).toBe(true)
    const runtime = state.activeQuests.find((q) => q.questId === 'quest-nightbloom-extract')!
    expect(runtime.progress.completedSteps).toBe(2)
    expect(runtime.stageId).toBe('on-site')
  })

  it('advances a survival quest from step 0 to step 2', () => {
    const state = stateWithActiveQuest('quest-pale-wagon-escort')
    const result = advanceToOnSiteStep(state, 'quest-pale-wagon-escort')
    expect(result).toBe(true)
    const runtime = state.activeQuests.find((q) => q.questId === 'quest-pale-wagon-escort')!
    expect(runtime.progress.completedSteps).toBe(2)
  })

  it('returns false when already at step 2', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    const result = advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    expect(result).toBe(false)
  })

  it('returns false for unknown quest', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const result = advanceToOnSiteStep(state, 'quest-unknown')
    expect(result).toBe(false)
  })

  it('updates the objective label in the journal', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    const runtime = state.activeQuests.find((q) => q.questId === 'quest-nightbloom-extract')!
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
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const store = createGameStore(state)
    store.dispatch(gameActions.advanceToOnSiteStep({ questId: 'quest-nightbloom-extract' }))
    store.dispatch(gameActions.resolveSimpleContract({ questId: 'quest-nightbloom-extract' }))
    expect(store.getState().game.completedQuestIds).toContain('quest-nightbloom-extract')
  })
})

describe('resolveWithComplicationCheck', () => {
  it('returns success when complicationRisk is 0', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    const result = resolveWithComplicationCheck(state, 'quest-nightbloom-extract', 0)
    expect(result).toBe('success')
    expect(state.completedQuestIds).toContain('quest-nightbloom-extract')
  })

  it('returns not_ready when completedSteps < 2', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const result = resolveWithComplicationCheck(state, 'quest-nightbloom-extract', 0)
    expect(result).toBe('not_ready')
  })

  it('returns not_applicable for unknown quest', () => {
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    const result = resolveWithComplicationCheck(state, 'quest-unknown', 0)
    expect(result).toBe('not_applicable')
  })

  it('can fail a delivery with high complication risk', () => {
    // complicationRisk = 1 means always fail
    const state = stateWithActiveQuest('quest-nightbloom-extract')
    advanceToOnSiteStep(state, 'quest-nightbloom-extract')
    const result = resolveWithComplicationCheck(state, 'quest-nightbloom-extract', 1)
    expect(result).toBe('failed')
    // Quest should be gone from activeQuests
    expect(state.activeQuests.some((q) => q.questId === 'quest-nightbloom-extract')).toBe(false)
    // And not in completed (it failed)
    expect(state.completedQuestIds).not.toContain('quest-nightbloom-extract')
  })

  it('runs survival quest through full progression', () => {
    const state = stateWithActiveQuest('quest-pale-wagon-escort')
    advanceToOnSiteStep(state, 'quest-pale-wagon-escort')
    const result = resolveWithComplicationCheck(state, 'quest-pale-wagon-escort', 0)
    expect(result).toBe('in_progress')
    expect(state.completedQuestIds).not.toContain('quest-pale-wagon-escort')
    expect(state.activeQuests.some((q) => q.questId === 'quest-pale-wagon-escort')).toBe(true)
  })

  it('completes a multi-watch survival quest on the final watch', () => {
    const state = stateWithActiveQuest('quest-pale-wagon-escort')
    advanceToOnSiteStep(state, 'quest-pale-wagon-escort')
    expect(resolveWithComplicationCheck(state, 'quest-pale-wagon-escort', 0)).toBe('in_progress')
    expect(resolveWithComplicationCheck(state, 'quest-pale-wagon-escort', 0)).toBe('success')
    expect(state.completedQuestIds).toContain('quest-pale-wagon-escort')
  })
})
