import type { GameState } from "../../../../domain"
import { expireTimedQuestsOnState } from "../../questLifecycle"
import { compactResolvedEventInstances } from "../../eventInstances"

export function handleQuestsPhase(state: GameState): GameState {
  let next = state

  // Phase: Quest expiry and debt crisis (end-of-day consequences)
  expireTimedQuestsOnState(next)

  // Debt crisis check
  if (
    !next.debtPaid &&
    !next.debtCrisisTriggered &&
    next.day >= next.debtDueDay &&
    next.money < next.debtAmount
  ) {
    next.debtCrisisTriggered = true
    next.activityLog.unshift({
      id: `log-${next.day}-${next.timeSlot}-debt-crisis`,
      day: next.day,
      timeSlot: next.timeSlot,
      category: 'system',
      message: 'The debt-claim against House Valdris has come due. Court-backed enforcers move on the note. The house is seized.',
    })
    if (next.activityLog.length >= 100) next.activityLog.pop()
  }

  // Compact event instances and return
  next = compactResolvedEventInstances(next)

  return next
}
