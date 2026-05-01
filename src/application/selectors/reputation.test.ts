import { describe, it, expect } from 'vitest'
import type { RootState } from '../store/gameStore'
import { selectReputationScore, selectReputationTier } from './reputation'

function makeState(overrides: Partial<RootState['game']> = {}): RootState {
  return {
    game: {
      factionStandings: { 'faction-civic-compact': 30, 'faction-gilded-court': -10 },
      completedQuestIds: [],
      day: 5,
      ...overrides,
    } as RootState['game'],
  } as RootState
}

describe('selectReputationScore', () => {
  it('counts only positive faction standings', () => {
    const state = makeState()
    const score = selectReputationScore(state)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(200)
  })

  it('increases with completed quests', () => {
    const base = selectReputationScore(makeState({ completedQuestIds: [] }))
    const withQuests = selectReputationScore(makeState({ completedQuestIds: ['q1', 'q2'] }))
    expect(withQuests).toBeGreaterThan(base)
  })
})

describe('selectReputationTier', () => {
  it('returns unknown for fresh start', () => {
    const state = makeState({ factionStandings: {}, completedQuestIds: [], day: 1 })
    expect(selectReputationTier(state)).toBe('unknown')
  })

  it('returns respected at high score', () => {
    const state = makeState({
      factionStandings: { 'f1': 40, 'f2': 30 },
      completedQuestIds: Array(2).fill('q'),
      day: 5,
    })
    expect(selectReputationTier(state)).toBe('respected')
  })
})
