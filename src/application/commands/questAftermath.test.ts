import { describe, it, expect } from 'vitest'
import { settleQuestSuccess, settleQuestPartialSuccess, settleQuestFailure } from './questSettlement'
import { setQuestAftermath } from './questRuntime'
import { initialStateWithIda } from './testFixtures'
import type { GameState } from '../../domain'
import type { QuestRuntime } from '../../domain/quests/contracts'

function makeQuestState(overrides: Partial<QuestRuntime> = {}): GameState {
  const runtime: QuestRuntime = {
    questId: 'quest-test-aftermath',
    acceptedOnDay: 1,
    status: 'active',
    acceptedTitle: 'Test Aftermath Contract',
    acceptedBriefing: null,
    stageId: 'accepted',
    objectiveMet: false,
    currentObjectiveLabel: 'Do the thing.',
    progress: { requiredSteps: 2, completedSteps: 1, lastAdvancedDay: null },
    context: {
      incidentDistrictId: null,
      issuerFactionId: null,
      sourceNpcId: null,
      discoverySource: null,
      discoveryDistrictId: null,
      selectedBranchId: null,
      retryBehavior: 'fail',
      executionDurationDays: null,
      executionDurationWatches: null,
    },
    journalEntries: [],
    clues: [],
    participants: [],
    aftermath: null,
    ...overrides,
  }
  return {
    ...initialStateWithIda,
    activeQuests: [runtime],
    day: 5,
    factionStandings: { ...initialStateWithIda.factionStandings, 'faction-test': 10 },
  }
}

describe('settleQuestSuccess — aftermath application', () => {
  it('applies faction impact from aftermath', () => {
    let state = makeQuestState()
    state = setQuestAftermath(state, 'quest-test-aftermath', {
      factionImpacts: [{ factionId: 'faction-test', delta: 15 }],
      worldConsequenceIds: [],
      unlockNpcIds: [],
      narrativeSummary: null,
    })
    settleQuestSuccess(state, 'quest-test-aftermath')
    expect(state.factionStandings['faction-test']).toBe(25) // 10 + 15
  })

  it('logs narrative summary from aftermath', () => {
    let state = makeQuestState()
    state = setQuestAftermath(state, 'quest-test-aftermath', {
      factionImpacts: [],
      worldConsequenceIds: [],
      unlockNpcIds: [],
      narrativeSummary: 'The district grew quieter after the raid.',
    })
    settleQuestSuccess(state, 'quest-test-aftermath')
    const hasNarrative = state.activityLog.some((e) => e.message.includes('quieter after the raid'))
    expect(hasNarrative).toBe(true)
  })

  it('logs world consequence ids', () => {
    let state = makeQuestState()
    state = setQuestAftermath(state, 'quest-test-aftermath', {
      factionImpacts: [],
      worldConsequenceIds: ['consequence-district-lockdown'],
      unlockNpcIds: [],
      narrativeSummary: null,
    })
    settleQuestSuccess(state, 'quest-test-aftermath')
    const hasConsequence = state.activityLog.some((e) => e.message.includes('district-lockdown'))
    expect(hasConsequence).toBe(true)
  })
})

describe('settleQuestPartialSuccess', () => {
  it('marks quest completed with partial stage', () => {
    const state = makeQuestState()
    settleQuestPartialSuccess(state, 'quest-test-aftermath', {
      partialReason: 'Half the job done, guard alerted.',
    })
    expect(state.completedQuestIds).toContain('quest-test-aftermath')
    expect(state.activeQuests).toHaveLength(0)
  })

  it('logs partial completion message', () => {
    const state = makeQuestState()
    settleQuestPartialSuccess(state, 'quest-test-aftermath')
    const hasPartial = state.activityLog.some((e) => e.message.includes('partial resolution'))
    expect(hasPartial).toBe(true)
  })

  it('is distinct from full failure — partial marks as completed', () => {
    const successState = makeQuestState()
    const failState = makeQuestState({ questId: 'quest-test-aftermath-2' })

    settleQuestPartialSuccess(successState, 'quest-test-aftermath')
    settleQuestFailure(failState, 'quest-test-aftermath-2')

    expect(successState.completedQuestIds).toContain('quest-test-aftermath')
    expect(failState.completedQuestIds).not.toContain('quest-test-aftermath-2')
  })
})

describe('settleQuestFailure — aftermath application', () => {
  it('applies aftermath faction impact even on failure', () => {
    let state = makeQuestState()
    state = setQuestAftermath(state, 'quest-test-aftermath', {
      factionImpacts: [{ factionId: 'faction-test', delta: -20 }],
      worldConsequenceIds: [],
      unlockNpcIds: [],
      narrativeSummary: 'The failure left a stain.',
    })
    settleQuestFailure(state, 'quest-test-aftermath')
    expect(state.factionStandings['faction-test']).toBe(-10) // 10 - 20
  })
})
