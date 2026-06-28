import { describe, it, expect } from 'vitest'

import { advanceCorridorRunQuest } from './advanceCorridorRunQuest'
import { initialStateWithIda } from './testFixtures'

describe('advanceCorridorRunQuest', () => {
  const createCorridorRunQuest = () => ({
    questId: 'quest-corridor-run',
    acceptedOnDay: 10,
    status: 'active' as const,
    acceptedTitle: 'Corridor Run',
    acceptedBriefing: null,
    stageId: 'accepted',
    objectiveMet: false,
    currentObjectiveLabel: 'Clear the corridor',
    progress: {
      requiredSteps: 3,
      completedSteps: 0,
      lastAdvancedDay: null,
      lastSurveillanceLoggedDay: null,
    },
    context: {
      incidentDistrictId: null,
      issuerFactionId: null,
      sourceNpcId: null,
      discoverySource: 'notice_board' as const,
      discoveryDistrictId: null,
      lastMilestoneDay: null,
      retryBehavior: 'fail' as const,
      executionDurationWatches: null,
      selectedBranchId: null,
      executionDurationDays: null,
    },
    aftermath: null,
    journalEntries: [],
    clues: [],
    participants: [],
  })

  it('updates quest stage to in-progress', () => {
    const state = {
      ...initialStateWithIda,
      activeQuests: [createCorridorRunQuest()],
    }

    const result = advanceCorridorRunQuest(state, 'quest-corridor-run', ['npc-ida-rhys', 'npc-marion-vale'])

    expect(result.activeQuests[0]?.stageId).toBe('in-progress')
    expect(result.activeQuests[0]?.progress.completedSteps).toBe(1)
  })

  it('adds activity log entry with squad names', () => {
    const state = {
      ...initialStateWithIda,
      activeQuests: [createCorridorRunQuest()],
    }

    const result = advanceCorridorRunQuest(state, 'quest-corridor-run', ['npc-ida-rhys', 'npc-marion-vale'])

    expect(result.activityLog[0]?.message).toContain('Corridor run dispatched')
    expect(result.activityLog[0]?.message).toContain('2 operatives')
    expect(result.activityLog[0]?.category).toBe('system')
  })

  it('returns unchanged state if quest not found', () => {
    const state = {
      ...initialStateWithIda,
      activeQuests: [createCorridorRunQuest()],
    }

    const result = advanceCorridorRunQuest(state, 'non-existent-quest', ['npc-ida-rhys'])

    expect(result.activeQuests[0]?.stageId).toBe('accepted')
    expect(result.activeQuests[0]?.progress.completedSteps).toBe(0)
  })

  it('returns unchanged state if quest is not corridor-run type', () => {
    const nonCorridorQuest = {
      questId: 'quest-delivery',
      acceptedOnDay: 10,
      status: 'active' as const,
      acceptedTitle: 'Delivery',
      acceptedBriefing: null,
      stageId: 'accepted',
      objectiveMet: false,
      currentObjectiveLabel: 'Deliver goods',
      progress: {
        requiredSteps: 1,
        completedSteps: 0,
        lastAdvancedDay: null,
        lastSurveillanceLoggedDay: null,
      },
      context: {
        incidentDistrictId: null,
        issuerFactionId: null,
        sourceNpcId: null,
        discoverySource: 'notice_board' as const,
        discoveryDistrictId: null,
        lastMilestoneDay: null,
        retryBehavior: 'fail' as const,
        executionDurationWatches: null,
        selectedBranchId: null,
        executionDurationDays: null,
      },
      aftermath: null,
      journalEntries: [],
      clues: [],
      participants: [],
    }

    const state = {
      ...initialStateWithIda,
      activeQuests: [nonCorridorQuest],
    }

    const result = advanceCorridorRunQuest(state, 'quest-delivery', ['npc-ida-rhys'])

    expect(result.activeQuests[0]?.stageId).toBe('accepted')
  })
})
