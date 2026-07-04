import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

/**
 * NPC population accessors (destiny-rama.4) — the bridge layer for unifying NPC runtime into one
 * general list (docs/analysis/unified-npc-runtime-contract-2026-07-04.md §9).
 *
 * Commands must go through these helpers instead of reaching into `state.roster` directly, so that
 * when the storage flips (C1 renames `roster` → `npcRuntimeStates`; C2/C3 fold world + captive
 * persons in) only the internals here change — every call site stays put.
 *
 * BRIDGE STATE (today): the only NpcRuntimeState persons live in `state.roster`, and they are all
 * player-roster members. World NPCs still live in the separate `state.worldNpcStates` array in the
 * thin WorldNpcRuntimeState shape (NOT NpcRuntimeState yet — that lands in C2), so `findNpc` /
 * `selectAllNpcs` deliberately return roster persons only for now. After C2/C3 their internals will
 * scan the unified `state.npcRuntimeStates` list.
 */

/**
 * Finds a single runtime NPC by id. Returns undefined when absent.
 *
 * NOTE (bridge): only returns NpcRuntimeState persons (currently `state.roster`). It does NOT return
 * world NPCs yet, because those are not NpcRuntimeState-shaped until C2 — returning one would require
 * an unsafe cast over missing fields. Once C2 lands, this scans the unified list and covers all
 * persons.
 */
export function findNpc(state: GameState, npcId: string): NpcRuntimeState | undefined {
  return state.roster.find((n) => n.npcId === npcId)
}

/**
 * Immutably updates a single runtime NPC by id via `updater`, returning a new GameState. If no NPC
 * matches, the state is returned structurally unchanged (the array is still rebuilt by map, matching
 * the existing immutable-command convention). Never mutates the input.
 */
export function updateNpc(
  state: GameState,
  npcId: string,
  updater: (npc: NpcRuntimeState) => NpcRuntimeState,
): GameState {
  return {
    ...state,
    roster: state.roster.map((n) => (n.npcId === npcId ? updater(n) : n)),
  }
}

/**
 * The full list of runtime persons — the accessor the intention generation/execution loops and
 * state-decay/agency will iterate once every NPC type shares one list. Bridge: returns
 * `state.roster`; after C2/C3 returns the unified `state.npcRuntimeStates`.
 */
export function selectAllNpcs(state: GameState): NpcRuntimeState[] {
  return state.roster
}

/**
 * The player's recruited operatives — keyed on `playerRosterMember`, NOT on `npcType` (owner
 * directive: a person's kind must never be conflated with whether they work for the player; see
 * contract doc §2.1). Bridge: `state.roster` already contains only player members, so the filter is
 * an identity today, but it stays correct once world/captive persons (playerRosterMember=false) join
 * the same list in C2/C3.
 */
export function selectRosterNpcs(state: GameState): NpcRuntimeState[] {
  return state.roster.filter((n) => n.playerRosterMember)
}
