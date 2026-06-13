import type { ActivityCategory, GameState } from '../../domain'

export const MAX_ACTIVITY_ENTRIES = 100

/**
 * Extracts the sequence number from an existing activity log entry ID.
 * Returns the numeric sequence or 0 if the ID doesn't match the expected pattern.
 */
function extractSequenceFromId(id: string): number {
  const match = id.match(/^-?(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Finds the highest sequence number used for a given day+timeslot.
 * Handles both numeric sequences and special suffixes like 'rescue-npcId'.
 */
function findMaxSequenceForDayAndSlot(activityLog: GameState['activityLog'], day: number, timeSlot: string): number {
  const entries = activityLog.filter((entry) => entry.day === day && entry.timeSlot === timeSlot)
  let maxSeq = 0

  for (const entry of entries) {
    // Try to extract numeric sequence from the end of the ID
    const parts = entry.id.split('-')
    if (parts.length >= 4) {
      // Check if the last part is a number (standard format: log-day-slot-seq)
      const lastPart = parts[parts.length - 1]
      const seq = extractSequenceFromId(lastPart)
      if (seq > 0) {
        maxSeq = Math.max(maxSeq, seq)
      }
    }
  }

  return maxSeq
}

/**
 * Generates a unique ID for a new activity log entry.
 * Uses a per-day+timeslot sequence to ensure uniqueness even after eviction.
 */
export function generateActivityLogId(activityLog: GameState['activityLog'], day: number, timeSlot: string): string {
  const maxSeq = findMaxSequenceForDayAndSlot(activityLog, day, timeSlot)
  return `log-${day}-${timeSlot}-${maxSeq + 1}`
}

export function appendActivityLogEntry(
  state: GameState,
  category: ActivityCategory,
  message: string,
): GameState {
  const newEntry = {
    id: generateActivityLogId(state.activityLog, state.day, state.timeSlot),
    day: state.day,
    timeSlot: state.timeSlot,
    category,
    message,
  }

  const newLog = [newEntry, ...state.activityLog].slice(0, MAX_ACTIVITY_ENTRIES)

  return {
    ...state,
    activityLog: newLog,
  }
}
