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
import type { CaptivityState, NpcRuntimeState, PregnancyState } from '../../domain/npc/contracts'
import { getAllNpcCaptivityStates, getNpcCaptivityState } from '../commands/captivityRegistry'

export const selectRoster = (state: RootState) => state.game.roster
export const selectNpcCaptivityRegistry = (state: RootState) => state.game.npcCaptivityStates

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
  return getNpcCaptivityState(state.game, npcId)
}

export const selectKnownCaptivityNpcIds = createSelector(
  [selectNpcCaptivityRegistry, selectRoster],
  (registry, roster) =>
    Object.entries(getAllNpcCaptivityStates({ npcCaptivityStates: registry, roster }))
      .filter(([, captivity]) => captivity.status === 'missing' || captivity.status === 'captive')
      .map(([npcId]) => npcId),
)

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

/**
 * Compute coercion risk score for an NPC (0.0 = resilient, 1.0 = highly vulnerable).
 *
 * Formula: ((100 - resolve) × 0.4 + fear × 0.3 + (100 - dominance) × 0.2 + loyalty × 0.1) / 100
 *
 * This is a protection signal — never exposed as a raw number in the UI.
 * The player sees only the resilience label (resilient / at risk / vulnerable).
 */
export function selectNpcCoercionRisk(npc: NpcRuntimeState): number {
  const resolve = npc.attributes.resolve
  const fear = npc.states.fear
  const dominance = npc.traits.dominance
  const loyalty = npc.traits.loyalty
  return ((100 - resolve) * 0.4 + fear * 0.3 + (100 - dominance) * 0.2 + loyalty * 0.1) / 100
}

/**
 * Derive a player-visible resilience label from coercionRisk.
 *
 * resilient  = risk < 0.35
 * at risk    = risk 0.35–0.60
 * vulnerable = risk > 0.60
 */
export function selectNpcResilienceLabel(npc: NpcRuntimeState): 'resilient' | 'at risk' | 'vulnerable' {
  const risk = selectNpcCoercionRisk(npc)
  if (risk < 0.35) return 'resilient'
  if (risk <= 0.60) return 'at risk'
  return 'vulnerable'
}
