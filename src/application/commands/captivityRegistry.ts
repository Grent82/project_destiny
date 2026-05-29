import type { CaptivityState, GameState } from '../../domain'

export function getNpcCaptivityState(
  state: Pick<GameState, 'npcCaptivityStates' | 'roster'>,
  npcId: string,
): CaptivityState | undefined {
  return state.npcCaptivityStates[npcId] ?? state.roster.find((npc) => npc.npcId === npcId)?.captivityState
}

export function getAllNpcCaptivityStates(
  state: Pick<GameState, 'npcCaptivityStates' | 'roster'>,
): Record<string, CaptivityState> {
  const merged = { ...state.npcCaptivityStates }
  for (const npc of state.roster) {
    if (npc.captivityState && !merged[npc.npcId]) {
      merged[npc.npcId] = npc.captivityState
    }
  }
  return merged
}

export function setNpcCaptivityState(
  state: Pick<GameState, 'npcCaptivityStates' | 'roster'>,
  npcId: string,
  captivityState: CaptivityState | null,
): void {
  if (captivityState === null) {
    delete state.npcCaptivityStates[npcId]
  } else {
    state.npcCaptivityStates[npcId] = captivityState
  }

  const rosterNpc = state.roster.find((npc) => npc.npcId === npcId)
  if (!rosterNpc) return
  if (captivityState === null) {
    delete rosterNpc.captivityState
  } else {
    rosterNpc.captivityState = captivityState
  }
}
