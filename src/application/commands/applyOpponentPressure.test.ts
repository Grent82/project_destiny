import { describe, it, expect } from 'vitest'
import { applyOpponentPressure, logOpponentPressure } from './applyOpponentPressure'
import type { GameState } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { createQuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../content/contentCatalog'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialGameStateSnapshot,
    ...overrides,
    day: overrides.day ?? 1,
    activeQuests: overrides.activeQuests ?? [],
  } as GameState
}

function makeActiveQuest(questId: string, overrides: Partial<ReturnType<typeof createQuestRuntime>> = {}): ReturnType<typeof createQuestRuntime> {
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) throw new Error(`Unknown quest template: ${questId}`)
  const base = createQuestRuntime(template, 1)
  return { ...base, ...overrides, progress: { ...base.progress, ...overrides.progress }, context: { ...base.context, ...overrides.context } }
}

describe('applyOpponentPressure', () => {
  it('returns empty array when no active quests have enemies', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-nightbloom-extract')], // no enemy
    })
    const result = applyOpponentPressure(state, [0.01])
    expect(result).toHaveLength(0)
  })

  it('returns empty array when quest stage is not pressure-able', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-harborwatch', { stageId: 'resolved' })],
    })
    const result = applyOpponentPressure(state, [0.01])
    expect(result).toHaveLength(0)
  })

  it('returns empty array when roll >= 0.15', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-harborwatch', { stageId: 'accepted' })],
    })
    const result = applyOpponentPressure(state, [0.5])
    expect(result).toHaveLength(0)
  })

  it('applies pressured beat when roll < 0.15 and quest has enemy', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-harborwatch', { stageId: 'accepted' })],
    })
    const result = applyOpponentPressure(state, [0.1])
    expect(result).toHaveLength(1)
    expect(result[0]?.questId).toBe('quest-harborwatch')
    expect(result[0]?.beatLabel).toContain('timeline')
  })

  it('increments requiredSteps when pressure is applied', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-harborwatch', { stageId: 'accepted' })],
    })
    const beforeSteps = state.activeQuests[0]?.progress.requiredSteps ?? 0
    applyOpponentPressure(state, [0.1])
    const afterSteps = state.activeQuests[0]?.progress.requiredSteps ?? 0
    expect(afterSteps).toBe(beforeSteps + 1)
  })

  it('sets stageId to pressured when pressure is applied', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-harborwatch', { stageId: 'accepted' })],
    })
    applyOpponentPressure(state, [0.1])
    expect(state.activeQuests[0]?.stageId).toBe('pressured')
  })

  it('is idempotent - does not apply beat twice to same quest', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-harborwatch', { stageId: 'accepted' })],
    })
    applyOpponentPressure(state, [0.1])
    const journalCountBefore = state.activeQuests[0]?.journalEntries.length ?? 0
    applyOpponentPressure(state, [0.01]) // another low roll, should not re-apply
    const journalCountAfter = state.activeQuests[0]?.journalEntries.length ?? 0
    expect(journalCountAfter).toBe(journalCountBefore)
  })

  it('skips quests without pressured beat in template', () => {
    // quest-nightbloom-extract has no enemy
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-nightbloom-extract', { stageId: 'accepted' })],
    })
    const result = applyOpponentPressure(state, [0.01])
    expect(result).toHaveLength(0)
  })

  it('works with enemyFactionId (not just enemyNpcId)', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-mira-rescue', { stageId: 'accepted' })],
    })
    const result = applyOpponentPressure(state, [0.1])
    expect(result).toHaveLength(1)
  })

  it('works with on-site stage', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-harborwatch', { stageId: 'on-site' })],
    })
    const result = applyOpponentPressure(state, [0.1])
    expect(result).toHaveLength(1)
  })

  it('works with on-site-prep stage', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-harborwatch', { stageId: 'on-site-prep' })],
    })
    const result = applyOpponentPressure(state, [0.1])
    expect(result).toHaveLength(1)
  })
})

describe('logOpponentPressure', () => {
  it('appends activity log entries for each pressured quest', () => {
    const state = makeState({
      activeQuests: [makeActiveQuest('quest-harborwatch', { stageId: 'accepted' })],
    })
    const pressured = applyOpponentPressure(state, [0.1])
    logOpponentPressure(state, pressured)

    const logMessages = state.activityLog.filter((e) => e.message.includes('Harborwatch'))
    expect(logMessages).toHaveLength(1)
  })
})
