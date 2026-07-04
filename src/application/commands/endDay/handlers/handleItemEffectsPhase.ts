import type { GameState } from '../../../../domain/game/contracts'
import { appendActivityLogEntry } from '../../activityLog'

/**
 * Handle daily expiration of temporary effects.
 * Runs as part of the endDay tick to:
 * - Expire temporary stat boosts that have reached their expiration day
 * - Expire active training bonuses (typically end of day)
 * - Decrement duration on player statuses that have a duration
 */
export function handleItemEffectsPhase(state: GameState): GameState {
  let next = state

  // Expire temporary stat boosts that have reached their expiration day
  const activeBoosts = next.tempStatBoosts.filter((boost) => boost.expiresDay > next.day)
  const expiredBoosts = next.tempStatBoosts.filter((boost) => boost.expiresDay <= next.day)

  if (expiredBoosts.length > 0) {
    const expiredStats = expiredBoosts.map((b) => b.stat).join(', ')
    next = {
      ...next,
      tempStatBoosts: activeBoosts,
    }
    next = appendActivityLogEntry(
      next,
      'system',
      `Temporary stat boost(s) expired: ${expiredStats}.`,
    )
  } else {
    next = {
      ...next,
      tempStatBoosts: activeBoosts,
    }
  }

  // Expire active training bonuses (typically end of day)
  if (next.activeTrainingBonuses.length > 0) {
    const expiredSkills = next.activeTrainingBonuses.map((b) => b.skill).join(', ')
    next = {
      ...next,
      activeTrainingBonuses: [],
    }
    next = appendActivityLogEntry(
      next,
      'system',
      `Training bonus(ies) expired: ${expiredSkills}.`,
    )
  } else {
    next = {
      ...next,
      activeTrainingBonuses: [],
    }
  }

  // Decrement duration on player statuses that have a duration
  const statusesWithDuration = next.playerStatuses.filter((s) => s.duration !== undefined && s.duration !== null)
  const statusesWithoutDuration = next.playerStatuses.filter((s) => s.duration === undefined || s.duration === null)

  const updatedStatuses = statusesWithDuration
    .map((status) => ({
      ...status,
      duration: (status.duration ?? 0) - 1,
    }))
    .filter((status) => (status.duration ?? 0) > 0)

  const expiredStatuses = statusesWithDuration.filter((status) => ((status.duration ?? 0) - 1) <= 0)

  if (expiredStatuses.length > 0) {
    const expiredStatusIds = expiredStatuses.map((s) => s.statusId).join(', ')
    next = {
      ...next,
      playerStatuses: [...updatedStatuses, ...statusesWithoutDuration],
    }
    next = appendActivityLogEntry(
      next,
      'system',
      `Status effect(s) expired: ${expiredStatusIds}.`,
    )
  } else {
    next = {
      ...next,
      playerStatuses: [...updatedStatuses, ...statusesWithoutDuration],
    }
  }

  return next
}
