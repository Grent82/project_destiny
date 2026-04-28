import type { RootState } from '../store/gameStore'

export type ReputationTier = 'unknown' | 'noticed' | 'known' | 'respected' | 'feared'

export function selectReputationScore(state: RootState): number {
  const { factionStandings, completedQuestIds, day } = state.game

  const standingScore = Object.values(factionStandings).reduce(
    (sum, s) => sum + Math.max(0, s),
    0
  )
  const questScore = (completedQuestIds?.length ?? 0) * 15
  const dayScore = Math.min(day * 2, 60)

  return Math.min(200, standingScore + questScore + dayScore)
}

export function selectReputationTier(state: RootState): ReputationTier {
  const score = selectReputationScore(state)
  if (score >= 160) return 'feared'
  if (score >= 100) return 'respected'
  if (score >= 50) return 'known'
  if (score >= 20) return 'noticed'
  return 'unknown'
}
