/**
 * NPC Captivity Selectors
 *
 * Provides read-only views into captivity and pregnancy state for roster NPCs.
 * These selectors surface what the player can observe: missing status, condition
 * on rescue, and (if set via world events) pregnancy state.
 *
 * pregnancyState, if present, is discovered through authored events —
 * never surfaced directly as a UI flag.
 */

import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import type { CaptivityState, PregnancyState } from '../../domain/npc/contracts'

export const selectRoster = (state: RootState) => state.game.roster

/** All roster NPCs who are currently missing or captive. */
export const selectCaptiveNpcs = createSelector(selectRoster, (roster) =>
  roster.filter(
    (npc) =>
      npc.captivityState?.status === 'missing' || npc.captivityState?.status === 'captive',
  ),
)

/** The captivity state for a specific NPC, or undefined if not captive. */
export function selectNpcCaptivityState(
  state: RootState,
  npcId: string,
): CaptivityState | undefined {
  return state.game.roster.find((n) => n.npcId === npcId)?.captivityState
}

/** The pregnancy state for a specific NPC, or undefined if not set. */
export function selectNpcPregnancyState(
  state: RootState,
  npcId: string,
): PregnancyState | undefined {
  return state.game.roster.find((n) => n.npcId === npcId)?.pregnancyState
}

/** All NPCs who have been rescued (status === 'rescued') and may carry recovery debuffs. */
export const selectRescuedNpcs = createSelector(selectRoster, (roster) =>
  roster.filter((npc) => npc.captivityState?.status === 'rescued'),
)
