export const CURRENCY_UNIT = 'Marks' as const
export const CURRENCY_ABBREV = 'Mk' as const

export function formatMarks(amount: number): string {
  return `${amount} ${CURRENCY_UNIT}`
}

export function formatMarksAbbrev(amount: number): string {
  return `${amount} ${CURRENCY_ABBREV}`
}

export function formatMarksPerDay(amount: number): string {
  return `${formatMarks(amount)}/day`
}

export function formatMarksPerWeek(amount: number): string {
  return `${formatMarks(amount)}/week`
}
