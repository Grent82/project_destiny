import type { GameState } from '../../domain'
import { endDay } from './endDay'

export const SLOT_SEQUENCE = ['morning', 'afternoon', 'evening', 'night'] as const
export type TimeSlot = (typeof SLOT_SEQUENCE)[number]

/**
 * Advance the game clock by exactly one time slot.
 * If the clock crosses midnight (night → morning), endDay is fired automatically.
 */
export function advanceTimeSlotInState(state: GameState): GameState {
  const currentIndex = SLOT_SEQUENCE.indexOf(state.timeSlot as TimeSlot)
  const nextIndex = (currentIndex + 1) % SLOT_SEQUENCE.length
  const nextSlot = SLOT_SEQUENCE[nextIndex]!

  if (nextIndex === 0) {
    // Crossed midnight — run full day processing
    const afterDay = endDay({ ...state, timeSlot: nextSlot })
    return { ...afterDay, timeSlot: nextSlot }
  }

  return { ...state, timeSlot: nextSlot }
}

/**
 * Advance the game clock by N time slots.
 */
export function advanceSlotsInState(state: GameState, n: number): GameState {
  let next = state
  for (let i = 0; i < n; i++) {
    next = advanceTimeSlotInState(next)
  }
  return next
}

/**
 * Slots remaining until the next morning (exclusive of current slot if morning).
 * E.g. evening → night → morning = 2 advances.
 */
export function slotsUntilMorning(timeSlot: string): number {
  const idx = SLOT_SEQUENCE.indexOf(timeSlot as TimeSlot)
  if (idx === -1) return 0
  // morning is index 0; from current we need (4 - idx) advances to reach index 0 again
  return SLOT_SEQUENCE.length - idx
}

/**
 * Brief rest: 1 slot advance, partial recovery.
 * Reduces fatigue and stress slightly for all idle roster members.
 */
export function sleepBrief(state: GameState): GameState {
  let next = advanceTimeSlotInState(state)
  next = {
    ...next,
    roster: next.roster.map((npc) => ({
      ...npc,
      states: {
        ...npc.states,
        fatigue: Math.max(0, npc.states.fatigue - 15),
        stress: Math.max(0, npc.states.stress - 5),
      },
    })),
  }
  return next
}

/**
 * Full sleep: advances to next morning (however many slots required).
 * Full recovery of fatigue and partial stress reduction.
 */
export function sleepToMorning(state: GameState): GameState {
  const steps = slotsUntilMorning(state.timeSlot)
  let next = advanceSlotsInState(state, steps)
  next = {
    ...next,
    roster: next.roster.map((npc) => ({
      ...npc,
      states: {
        ...npc.states,
        fatigue: Math.max(0, npc.states.fatigue - 40),
        stress: Math.max(0, npc.states.stress - 15),
        health: Math.min(100, npc.states.health + 5),
      },
    })),
  }
  // Player recovery (health/injury, scaled by house lodging/treatment support) is applied
  // once via applyStateDecay as part of the endDay crossing above — see
  // docs/analysis/roster-npc-spatial-contract-2026-07-03.md and destiny-uj3s.
  return next
}
