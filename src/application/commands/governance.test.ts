import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { selectIsBlacklisted } from '../selectors/governance'
import type { RootState } from '../store/gameStore'
import type { CouncilVoteEvent } from '../../domain'

// Helper to build a minimal RootState from a GameState
function mockRootState(overrides: Partial<typeof initialGameStateSnapshot>): RootState {
  return {
    game: { ...initialGameStateSnapshot, ...overrides },
  } as RootState
}

// Import reducers via the slice actions
import { gameSliceReducer, gameActions } from '../store/gameSlice'

describe('setInstitutionalStanding', () => {
  it('updates the institutional standing for the correct faction', () => {
    const next = gameSliceReducer(
      initialGameStateSnapshot,
      gameActions.setInstitutionalStanding({ factionId: 'faction-civic-compact', tier: 'hostile' }),
    )
    expect(next.institutionalStanding['faction-civic-compact']).toBe('hostile')
  })

  it('does not affect other factions', () => {
    const next = gameSliceReducer(
      initialGameStateSnapshot,
      gameActions.setInstitutionalStanding({ factionId: 'faction-civic-compact', tier: 'hostile' }),
    )
    expect(next.institutionalStanding['faction-gilded-court']).toBe('watched')
  })

  it('logs a message when tier is blacklisted', () => {
    const next = gameSliceReducer(
      initialGameStateSnapshot,
      gameActions.setInstitutionalStanding({ factionId: 'faction-foundry-league', tier: 'blacklisted' }),
    )
    expect(next.activityLog[0]?.message).toContain('blacklisted')
    expect(next.activityLog[0]?.message).toContain('Enforcement will follow')
  })

  it('logs a message when tier is hostile', () => {
    const next = gameSliceReducer(
      initialGameStateSnapshot,
      gameActions.setInstitutionalStanding({ factionId: 'faction-civic-compact', tier: 'hostile' }),
    )
    expect(next.activityLog[0]?.message).toContain('institutional arm')
  })

  it('does not log when tier is neutral', () => {
    const logLengthBefore = initialGameStateSnapshot.activityLog.length
    const next = gameSliceReducer(
      initialGameStateSnapshot,
      gameActions.setInstitutionalStanding({ factionId: 'faction-civic-compact', tier: 'neutral' }),
    )
    expect(next.activityLog.length).toBe(logLengthBefore)
  })
})

describe('resolveCouncilVote', () => {
  const vote: CouncilVoteEvent = {
    id: 'test-vote-001',
    title: 'Test Levy',
    description: 'A test levy on the house.',
    proposingFactionId: 'faction-gilded-court',
    targetFactionId: null,
    effect: 'Nothing changes. The Register notes it.',
    mechanicalEffects: [],
    playerInfluenceThreshold: 30,
    expiresOnDay: 10,
    outcome: 'pending',
    playerVote: null,
  }

  it('removes the resolved vote from activeCouncilVotes', () => {
    const stateWithVote = {
      ...initialGameStateSnapshot,
      activeCouncilVotes: [vote],
    }
    const next = gameSliceReducer(
      stateWithVote,
      gameActions.resolveCouncilVote({ voteId: 'test-vote-001', playerInfluenced: false, passes: false }),
    )
    expect(next.activeCouncilVotes).toHaveLength(0)
  })

  it('logs an outcome message', () => {
    const stateWithVote = {
      ...initialGameStateSnapshot,
      activeCouncilVotes: [vote],
    }
    const next = gameSliceReducer(
      stateWithVote,
      gameActions.resolveCouncilVote({ voteId: 'test-vote-001', playerInfluenced: false, passes: true }),
    )
    expect(next.activityLog[0]?.message).toContain('Test Levy')
    expect(next.activityLog[0]?.message).toMatch(/passed|failed/)
  })

  it('does nothing if vote ID not found', () => {
    const stateWithVote = {
      ...initialGameStateSnapshot,
      activeCouncilVotes: [vote],
    }
    const next = gameSliceReducer(
      stateWithVote,
      gameActions.resolveCouncilVote({ voteId: 'nonexistent', playerInfluenced: false, passes: false }),
    )
    expect(next.activeCouncilVotes).toHaveLength(1)
  })

  it('player influence causes vote to pass when standing exceeds threshold', () => {
    const stateWithHighStanding = {
      ...initialGameStateSnapshot,
      activeCouncilVotes: [vote],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 50, // above threshold of 30
      },
    }
    const next = gameSliceReducer(
      stateWithHighStanding,
      gameActions.resolveCouncilVote({ voteId: 'test-vote-001', playerInfluenced: true, passes: true }),
    )
    expect(next.activityLog[0]?.message).toContain('passed')
  })

  it('player influence causes vote to fail when standing below threshold', () => {
    const stateWithLowStanding = {
      ...initialGameStateSnapshot,
      activeCouncilVotes: [vote],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': -20, // below threshold of 30
      },
    }
    const next = gameSliceReducer(
      stateWithLowStanding,
      gameActions.resolveCouncilVote({ voteId: 'test-vote-001', playerInfluenced: true, passes: false }),
    )
    expect(next.activityLog[0]?.message).toContain('failed')
  })
})

describe('selectIsBlacklisted', () => {
  it('returns true when faction institutional standing is blacklisted', () => {
    const state = mockRootState({
      institutionalStanding: { 'faction-civic-compact': 'blacklisted' },
    })
    expect(selectIsBlacklisted('faction-civic-compact')(state)).toBe(true)
  })

  it('returns false when faction institutional standing is not blacklisted', () => {
    const state = mockRootState({
      institutionalStanding: { 'faction-civic-compact': 'neutral' },
    })
    expect(selectIsBlacklisted('faction-civic-compact')(state)).toBe(false)
  })

  it('returns false when faction has no institutional standing record', () => {
    const state = mockRootState({ institutionalStanding: {} })
    expect(selectIsBlacklisted('faction-civic-compact')(state)).toBe(false)
  })
})
