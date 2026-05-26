import type { PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import {
  concludeCombatEncounter,
  performCombatAction,
  startCombatEncounter,
} from '../../commands/combat'

export const combatReducers = {
  startCombatEncounter(state: GameState, action: PayloadAction<{ questId?: string } | undefined>) {
    return startCombatEncounter(state, action.payload?.questId)
  },
  performCombatAction(
    state: GameState,
    action: PayloadAction<'attack' | 'advance' | 'retreat' | 'guard'>,
  ) {
    return performCombatAction(state, action.payload)
  },
  concludeCombatEncounter(state: GameState) {
    return concludeCombatEncounter(state)
  },
}
