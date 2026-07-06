export const RUNWAY_BAR_MAX_DAYS = 180

export function runwayBarClass(days: number): string {
  if (days > 60) return 'ledger-runway--safe'
  if (days > 30) return 'ledger-runway--caution'
  if (days > 15) return 'ledger-runway--warning'
  return 'ledger-runway--critical'
}

export function runwayBarPercent(days: number, isUnbounded: boolean): number {
  if (isUnbounded) return 100
  return Math.min(100, Math.round((days / RUNWAY_BAR_MAX_DAYS) * 100))
}
