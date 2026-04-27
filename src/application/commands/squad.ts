import type { GameState } from '../../domain'

const MAX_SQUAD_SIZE = 6

export function addNpcToSelectedSquad(
  state: GameState,
  npcId: string,
): GameState {
  if (!state.roster.some((entry) => entry.npcId === npcId)) {
    return state
  }

  if (state.selectedSquadNpcIds.includes(npcId)) {
    return state
  }

  if (state.selectedSquadNpcIds.length >= MAX_SQUAD_SIZE) {
    return state
  }

  return {
    ...state,
    selectedSquadNpcIds: [...state.selectedSquadNpcIds, npcId],
  }
}

export function removeNpcFromSelectedSquad(
  state: GameState,
  npcId: string,
): GameState {
  if (!state.selectedSquadNpcIds.includes(npcId)) {
    return state
  }

  return {
    ...state,
    selectedSquadNpcIds: state.selectedSquadNpcIds.filter((id) => id !== npcId),
  }
}

export const squadRules = {
  addNpcToSelectedSquad,
  removeNpcFromSelectedSquad,
  maxSquadSize: MAX_SQUAD_SIZE,
}
