import type { CaptivityState, GameState, NpcRuntimeState } from '../../domain'
import { createRuntimeStateFromDefinition } from './createRuntimeStateFromDefinition'

/**
 * Captivity data lives solely on `npcRuntimeStates[].captivityState` since destiny-rama.9 — the
 * separate `npcCaptivityStates` record was folded in and deleted. These three functions remain the
 * canonical read/write surface for captivity so callers never touch `captivityState` directly.
 */

export function getNpcCaptivityState(
  state: Pick<GameState, 'npcRuntimeStates'>,
  npcId: string,
): CaptivityState | undefined {
  return state.npcRuntimeStates.find((npc) => npc.npcId === npcId)?.captivityState
}

export function getAllNpcCaptivityStates(
  state: Pick<GameState, 'npcRuntimeStates'>,
): Record<string, CaptivityState> {
  const merged: Record<string, CaptivityState> = {}
  for (const npc of state.npcRuntimeStates) {
    if (npc.captivityState) {
      merged[npc.npcId] = npc.captivityState
    }
  }
  return merged
}

/**
 * Sets (or clears, with `null`) a person's captivity state, mutating the passed-in `state`'s
 * `npcRuntimeStates` array in place — matching this module's existing "clone once at the top of the
 * command, then mutate freely" convention (callers must ensure the npc's own object in the array is
 * already a fresh, safely-mutable reference before calling this, e.g. via
 * `npcRuntimeStates: state.npcRuntimeStates.map(npc => ({ ...npc }))`).
 *
 * If the target npc has no runtime entry yet (e.g. a story captive who hasn't been hydrated into
 * the unified list before their first captivity update), one is hydrated via
 * createRuntimeStateFromDefinition and pushed — this is what previously silently no-opped when
 * `npcCaptivityStates` existed as a fallback for exactly this case.
 */
export function setNpcCaptivityState(
  state: Pick<GameState, 'npcRuntimeStates'>,
  npcId: string,
  captivityState: CaptivityState | null,
): void {
  const rosterNpc = state.npcRuntimeStates.find((npc) => npc.npcId === npcId)

  if (rosterNpc) {
    if (captivityState === null) {
      delete rosterNpc.captivityState
    } else {
      rosterNpc.captivityState = captivityState
    }
    return
  }

  if (captivityState === null) return // nothing to clear on a person with no runtime entry

  const hydrated: NpcRuntimeState = createRuntimeStateFromDefinition(npcId, {
    playerRosterMember: false,
    captivityState,
  })
  state.npcRuntimeStates.push(hydrated)
}
