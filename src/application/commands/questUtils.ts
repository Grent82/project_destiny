/**
 * Pure utility functions shared across quest-related commands and UI selectors.
 * No GameState mutation here — all functions are deterministic transforms.
 */

/**
 * Returns the number of days remaining on an active quest's time limit.
 * Returns 0 when the deadline has passed. Returns null when the quest has no time limit.
 */
export function getQuestDaysRemaining(
  runtime: { acceptedOnDay: number },
  template: { timeLimitDays?: number | null },
  currentDay: number,
): number | null {
  if (template.timeLimitDays == null) return null
  return Math.max(runtime.acceptedOnDay + template.timeLimitDays - currentDay, 0)
}

/**
 * Returns true when an active quest's time limit has been reached or exceeded.
 */
export function isQuestExpired(
  runtime: { acceptedOnDay: number },
  template: { timeLimitDays?: number | null },
  currentDay: number,
): boolean {
  if (template.timeLimitDays == null) return false
  return currentDay - runtime.acceptedOnDay >= template.timeLimitDays
}
