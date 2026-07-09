/**
 * Player-facing recovery read-model for roster NPCs and the player character.
 *
 * Composes the runtime tier/threshold helpers in commands/recovery.ts into one legible status
 * (support tier + explanatory sentence) so screens can stop guessing at raw health/injury numbers
 * or showing generic "Recovering" copy that doesn't say why or what would help.
 */
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import {
  describeRecoveryStatus,
  getNpcRecoverySupport,
  getPlayerRecoverySupport,
  type RecoveryStatus,
} from '../commands/recovery'
import { PLAYER_MAX_HEALTH } from '../commands/combatants'

const recoveryStatusSelectorCache = new Map<string, (state: RootState) => RecoveryStatus>()

export const selectNpcRecoveryStatus = (npcId: string) => {
  let selector = recoveryStatusSelectorCache.get(npcId)
  if (!selector) {
    selector = createSelector(
      [
        (state: RootState) => state.game,
        (state: RootState) => state.game.npcRuntimeStates.find((r) => r.npcId === npcId),
      ],
      (game, npc): RecoveryStatus => {
        if (!npc) {
          return { ready: true, supportLabel: '', statusMessage: '' }
        }
        const tier = getNpcRecoverySupport(game, npc)
        return describeRecoveryStatus(npc.states.health, tier)
      },
    )
    recoveryStatusSelectorCache.set(npcId, selector)
  }
  return selector
}

export const selectPlayerRecoveryStatus = createSelector(
  [(state: RootState) => state.game],
  (game): RecoveryStatus => {
    const combatState = game.playerCharacter.combatState
    if (!combatState) {
      return { ready: true, supportLabel: '', statusMessage: '' }
    }
    const tier = getPlayerRecoverySupport(game, combatState.health)
    return describeRecoveryStatus(combatState.health, tier)
  },
)

export const selectPlayerIsWounded = createSelector(
  [(state: RootState) => state.game.playerCharacter.combatState],
  (combatState): boolean => {
    if (!combatState) return false
    return combatState.health < PLAYER_MAX_HEALTH
  },
)
