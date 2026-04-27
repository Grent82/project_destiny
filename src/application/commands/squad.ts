import type { GameState } from '../../domain'
import { getLoyaltyDeployStatus } from '../../domain/npcStateModifiers'

const MAX_SQUAD_SIZE = 6

export function addNpcToSelectedSquad(
  state: GameState,
  npcId: string,
): GameState {
  const npc = state.roster.find((entry) => entry.npcId === npcId)

  if (!npc) {
    return state
  }

  if (state.selectedSquadNpcIds.includes(npcId)) {
    return state
  }

  if (state.selectedSquadNpcIds.length >= MAX_SQUAD_SIZE) {
    return state
  }

  // Hard block on loyalty
  const loyaltyStatus = getLoyaltyDeployStatus({ loyalty: npc.traits.loyalty })
  if (loyaltyStatus === 'blocked') {
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
