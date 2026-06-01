import type { Skills } from '../../domain'

export function calculateMercenaryContractWage(skills: Skills): number {
  const values = Object.values(skills) as number[]
  if (values.length === 0) return 6

  const top3 = [...values].sort((a, b) => b - a).slice(0, 3)
  const average = top3.reduce((sum, value) => sum + value, 0) / top3.length

  return Math.max(3, Math.min(20, Math.floor(average / 5)))
}
