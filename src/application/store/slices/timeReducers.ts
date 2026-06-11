import { current } from '@reduxjs/toolkit'
import type { GameState } from '../../../domain'
import { endDay as endDayCommand } from '../../commands/endDay'
import { sleepBrief, sleepToMorning, advanceTimeSlotInState } from '../../commands/timeAdvance'
import { expireTimedQuestsOnState } from '../../commands/questLifecycle'
import { MAX_ACTIVITY_ENTRIES } from '../../commands/activityLog'

const SLOT_SEQUENCE = ['morning', 'afternoon', 'evening', 'night'] as const
type TimeSlot = typeof SLOT_SEQUENCE[number]

function runEndOfDay(state: GameState): GameState {
  const afterDay = endDayCommand(state)
  afterDay.isFirstRun = false
  expireTimedQuestsOnState(afterDay)
  if (
    !afterDay.debtPaid &&
    !afterDay.debtCrisisTriggered &&
    afterDay.day >= afterDay.debtDueDay &&
    afterDay.money < afterDay.debtAmount
  ) {
    afterDay.debtCrisisTriggered = true
    afterDay.activityLog.unshift({
      id: `log-${afterDay.day}-${afterDay.timeSlot}-debt-crisis`,
      day: afterDay.day,
      timeSlot: afterDay.timeSlot,
      category: 'system',
      message: 'The debt-claim against House Valdris has come due. Court-backed enforcers move on the note. The house is seized.',
    })
    if (afterDay.activityLog.length >= MAX_ACTIVITY_ENTRIES) afterDay.activityLog.pop()
  }
  return afterDay
}

export const timeReducers = {
  endDay(state: GameState) {
    return runEndOfDay(state)
  },

  advanceTimeSlot(state: GameState) {
    const currentIndex = SLOT_SEQUENCE.indexOf(state.timeSlot as TimeSlot)
    const nextIndex = (currentIndex + 1) % SLOT_SEQUENCE.length
    const nextSlot = SLOT_SEQUENCE[nextIndex]!

    if (nextSlot === 'morning') {
      const snapshot = current(state) as GameState
      return runEndOfDay(snapshot)
    }

    state.timeSlot = nextSlot
    state.activityLog.unshift({
      id: `log-${state.day}-${nextSlot}-advance`,
      day: state.day,
      timeSlot: nextSlot,
      category: 'system',
      message: `${nextSlot.charAt(0).toUpperCase() + nextSlot.slice(1)} settles over Valdenmoor.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
  },

  wait(state: GameState) {
    const snapshot = current(state) as GameState
    return advanceTimeSlotInState(snapshot)
  },

  sleepBrief(state: GameState) {
    const snapshot = current(state) as GameState
    return sleepBrief(snapshot)
  },

  sleepToMorning(state: GameState) {
    const snapshot = current(state) as GameState
    return sleepToMorning(snapshot)
  },
}
