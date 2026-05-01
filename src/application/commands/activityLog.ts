import type { ActivityCategory, GameState } from '../../domain'

export const MAX_ACTIVITY_ENTRIES = 40

export function appendActivityLogEntry(
  state: GameState,
  category: ActivityCategory,
  message: string,
): GameState {
  return {
    ...state,
    activityLog: [
      {
        id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category,
        message,
      },
      ...state.activityLog,
    ].slice(0, MAX_ACTIVITY_ENTRIES),
  }
}
