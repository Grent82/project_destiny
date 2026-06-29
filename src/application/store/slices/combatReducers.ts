import type { PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import {
  concludeCombatEncounter,
  performCombatAction,
  startCombatEncounter,
} from '../../commands/combat'

export const combatReducers = {
  startCombatEncounter(state: GameState, action: PayloadAction<{ questId?: string } | undefined>) {
    // Command mutates the Immer draft directly - don't return value
    startCombatEncounter(state, action.payload?.questId)
  },
  performCombatAction(
    state: GameState,
    action: PayloadAction<'attack' | 'advance' | 'retreat' | 'guard'>,
  ) {
    // Command mutates the Immer draft directly - don't return value
    performCombatAction(state, action.payload)
  },
  concludeCombatEncounter(state: GameState) {
    // Command mutates the Immer draft directly - don't return value
    concludeCombatEncounter(state)
  },
}
