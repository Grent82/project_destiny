import { describe, it, expect } from 'vitest'
import { discoverQuestClue, addQuestParticipant, updateParticipantStatus, setQuestAftermath } from './questRuntime'
import { initialStateWithIda } from './testFixtures'
import type { GameState } from '../../domain'
import type { QuestRuntime } from '../../domain/quests/contracts'

function stateWithQuest(overrides: Partial<QuestRuntime> = {}): GameState {
  const runtime: QuestRuntime = {
    questId: 'quest-test-01',
    acceptedOnDay: 1,
    status: 'active',
    acceptedTitle: 'Test Contract',
    acceptedBriefing: null,
    stageId: 'accepted',
    objectiveMet: false,
    currentObjectiveLabel: 'Go do the thing.',
    progress: { requiredSteps: 3, completedSteps: 0, lastAdvancedDay: null, lastSurveillanceLoggedDay: null },
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
    clues: [
      { clueId: 'clue-1', label: 'A bloodstained ledger page', discovered: false, discoveredOnDay: null, usedInBranchId: null },
      { clueId: 'clue-2', label: 'A name scratched in the wall', discovered: false, discoveredOnDay: null, usedInBranchId: null },
    ],
    participants: [
      { npcId: 'npc-employer', role: 'employer', status: 'active' },
    ],
    aftermath: null,
    ...overrides,
  }
  return { ...initialStateWithIda, activeQuests: [runtime], day: 5 }
}

describe('discoverQuestClue', () => {
  it('marks a clue as discovered and records the day', () => {
    const state = stateWithQuest()
    const result = discoverQuestClue(state, 'quest-test-01', 'clue-1')
    const quest = result.activeQuests[0]!
    const clue = quest.clues.find((c) => c.clueId === 'clue-1')!
    expect(clue.discovered).toBe(true)
    expect(clue.discoveredOnDay).toBe(5)
  })

  it('appends a journal entry on discovery', () => {
    const state = stateWithQuest()
    const result = discoverQuestClue(state, 'quest-test-01', 'clue-1')
    const quest = result.activeQuests[0]!
    expect(quest.journalEntries.some((e) => e.includes('bloodstained ledger'))).toBe(true)
  })

  it('is a no-op for already discovered clues', () => {
    const state = stateWithQuest()
    const first = discoverQuestClue(state, 'quest-test-01', 'clue-1')
    const second = discoverQuestClue(first, 'quest-test-01', 'clue-1')
    expect(second.activeQuests[0]!.journalEntries.length).toBe(first.activeQuests[0]!.journalEntries.length)
  })

  it('returns unchanged state for unknown questId', () => {
    const state = stateWithQuest()
    const result = discoverQuestClue(state, 'quest-nonexistent', 'clue-1')
    expect(result).toBe(state)
  })

  it('returns unchanged state for unknown clueId', () => {
    const state = stateWithQuest()
    const result = discoverQuestClue(state, 'quest-test-01', 'clue-unknown')
    expect(result).toBe(state)
  })
})

describe('addQuestParticipant', () => {
  it('adds a new participant', () => {
    const state = stateWithQuest()
    const result = addQuestParticipant(state, 'quest-test-01', { npcId: 'npc-target', role: 'target', status: 'active' })
    expect(result.activeQuests[0]!.participants).toHaveLength(2)
  })

  it('does not add duplicate npcId', () => {
    const state = stateWithQuest()
    const result = addQuestParticipant(state, 'quest-test-01', { npcId: 'npc-employer', role: 'employer', status: 'active' })
    expect(result.activeQuests[0]!.participants).toHaveLength(1)
  })
})

describe('updateParticipantStatus', () => {
  it('updates participant status', () => {
    const state = stateWithQuest()
    const result = updateParticipantStatus(state, 'quest-test-01', 'npc-employer', 'dead')
    const p = result.activeQuests[0]!.participants.find((p) => p.npcId === 'npc-employer')!
    expect(p.status).toBe('dead')
  })

  it('returns unchanged state for unknown quest', () => {
    const state = stateWithQuest()
    const result = updateParticipantStatus(state, 'nonexistent', 'npc-employer', 'dead')
    expect(result).toBe(state)
  })
})

describe('setQuestAftermath', () => {
  it('attaches aftermath data', () => {
    const state = stateWithQuest()
    const aftermath = {
      worldConsequenceIds: ['consequence-district-lockdown'],
      factionImpacts: [{ factionId: 'faction-compact', delta: -10 }],
      unlockNpcIds: [],
      narrativeSummary: 'The district fell quiet after the raid.',
    }
    const result = setQuestAftermath(state, 'quest-test-01', aftermath)
    expect(result.activeQuests[0]!.aftermath).toEqual(aftermath)
  })

  it('returns unchanged state for unknown quest', () => {
    const state = stateWithQuest()
    const result = setQuestAftermath(state, 'nonexistent', { worldConsequenceIds: [], factionImpacts: [], unlockNpcIds: [], narrativeSummary: null })
    expect(result).toBe(state)
  })
})
