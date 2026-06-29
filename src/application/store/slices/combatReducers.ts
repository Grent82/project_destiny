import type { PayloadAction } from '@reduxjs/toolkit'
import { current } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import {
  concludeCombatEncounter,
  performCombatAction,
  startCombatEncounter,
} from '../../commands/combat'

export const combatReducers = {
  startCombatEncounter(state: GameState, action: PayloadAction<{ questId?: string } | undefined>) {
    // Use current() to get a plain object, then pass to command which returns new state
    const plainState = current(state) as GameState
    return startCombatEncounter(plainState, action.payload?.questId)
  },
  performCombatAction(
    state: GameState,
    action: PayloadAction<'attack' | 'advance' | 'retreat' | 'guard'>,
  ) {
    const plainState = current(state) as GameState
    return performCombatAction(plainState, action.payload)
  },
  concludeCombatEncounter(state: GameState) {
    const plainState = current(state) as GameState
    return concludeCombatEncounter(plainState)
  },
}
