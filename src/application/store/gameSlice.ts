import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../domain'
import { initialGameStateSnapshot } from './initialGameState'
import { MAX_ACTIVITY_ENTRIES } from '../commands/activityLog'

import { combatReducers } from './slices/combatReducers'
import { dialogueReducers } from './slices/dialogueReducers'
import { expeditionReducers } from './slices/expeditionReducers'
import { houseReducers } from './slices/houseReducers'
import { itemsReducers } from './slices/itemsReducers'
import { questReducers } from './slices/questReducers'
import { resourcesReducers } from './slices/resourcesReducers'
import { rosterReducers } from './slices/rosterReducers'
import { timeReducers } from './slices/timeReducers'
import { worldReducers } from './slices/worldReducers'

const gameSlice = createSlice({
  name: 'game',
  initialState: initialGameStateSnapshot,
  reducers: {
    ...combatReducers,
    ...dialogueReducers,
    ...expeditionReducers,
    ...houseReducers,
    ...itemsReducers,
    ...questReducers,
    ...resourcesReducers,
    ...rosterReducers,
    ...timeReducers,
    ...worldReducers,

    payDebt(state: GameState, action: PayloadAction<{ amount: number }>) {
      const payment = Math.max(0, action.payload.amount)
      const actualPayment = Math.min(payment, state.money)
      state.money = Math.max(0, state.money - actualPayment)
      state.debtAmount = Math.max(0, state.debtAmount - actualPayment)
      if (state.debtAmount === 0) {
        state.debtPaid = true
      }
    },

    setProtagonistName(state: GameState, action: PayloadAction<string>) {
      state.protagonistName = action.payload
    },

    setHasSeenOpening(state: GameState, action: PayloadAction<boolean>) {
      state.hasSeenOpening = action.payload
    },

    replaceGameState(_state: GameState, action: PayloadAction<GameState>) {
      return action.payload
    },

    recordMainQuestHint(state: GameState, action: PayloadAction<{ hint: string }>) {
      const { hint } = action.payload
      state.mainQuest.lastClue = hint
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-mqhint`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `◆ ${hint}`,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    },

    appendSystemLog(state: GameState, action: PayloadAction<{ message: string }>) {
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-sys-${state.activityLog.length}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: action.payload.message,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    },
  },
})

export const gameActions = gameSlice.actions
export const gameSliceReducer = gameSlice.reducer
