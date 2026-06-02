import type { GameState } from '../../domain'
import { getLoyaltyDeployStatus } from '../../domain/npcStateModifiers'
import { MIN_DEPLOYABLE_HEALTH } from './combat'

const MAX_SQUAD_SIZE = 6

export function addNpcToSelectedSquad(
  state: GameState,
  npcId: string,
): GameState {
  const npc = state.roster.find((entry) => entry.npcId === npcId)

  if (!npc) {
    return state
  }

  // Cannot deploy recovering NPCs
  if (npc.assignment === 'recovering') {
    return state
  }

  // Working and training NPCs are on assignment and cannot be deployed
  if (npc.assignment === 'working' || npc.assignment === 'training') {
    return state
  }

  if (npc.states.health < MIN_DEPLOYABLE_HEALTH) {
    return state
  }

  // Title-holders are on duty and cannot be deployed
  if (npc.assignment === 'assigned_title') {
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

  const updatedRoster = state.roster.map((r) =>
    r.npcId === npcId && r.assignment === 'idle'
      ? { ...r, assignment: 'deployed' as const }
      : r,
  )

  return {
    ...state,
    roster: updatedRoster,
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
    roster: state.roster.map((npc) =>
      npc.npcId === npcId && npc.assignment === 'deployed'
        ? { ...npc, assignment: 'idle' }
        : npc,
    ),
    selectedSquadNpcIds: state.selectedSquadNpcIds.filter((id) => id !== npcId),
  }
}

export const squadRules = {
  addNpcToSelectedSquad,
  removeNpcFromSelectedSquad,
  maxSquadSize: MAX_SQUAD_SIZE,
}
