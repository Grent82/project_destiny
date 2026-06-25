import type { GameState } from "../../../../domain"
import { appendActivityLogEntry } from "../../activityLog"
import { tickHouseRepairs } from "../../houseRepairs"

export function handleTimeAdvancePhase(state: GameState): GameState {
  let next = state

  // Phase: Advance day and time slot
  const nextDay = next.day + 1
  next = { ...next, day: nextDay, timeSlot: "morning" }
  next = appendActivityLogEntry(next, "system", `The day turns. Day ${nextDay}.`)
  next = tickHouseRepairs(next)

  return next
}
