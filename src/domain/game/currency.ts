export const CURRENCY_UNIT = 'Marks' as const
export const CURRENCY_ABBREV = 'Mk' as const

export function formatMarks(amount: number): string {
  return `${amount} ${CURRENCY_UNIT}`
}

export function formatMarksAbbrev(amount: number): string {
  return `${amount} ${CURRENCY_ABBREV}`
}
