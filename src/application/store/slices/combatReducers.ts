import { current, type PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import {
  concludeCombatEncounter,
  performCombatAction,
  startCombatEncounter,
} from '../../commands/combat'

export const combatReducers = {
  startCombatEncounter(state: GameState, action: PayloadAction<{ questId?: string } | undefined>) {
    const snapshot = current(state) as GameState
    return startCombatEncounter(snapshot, action.payload?.questId)
  },
  performCombatAction(
    state: GameState,
    action: PayloadAction<'attack' | 'advance' | 'retreat' | 'guard'>,
  ) {
    const snapshot = current(state) as GameState
    return performCombatAction(snapshot, action.payload)
  },
  concludeCombatEncounter(state: GameState) {
    const snapshot = current(state) as GameState
    return concludeCombatEncounter(snapshot)
  },
}
