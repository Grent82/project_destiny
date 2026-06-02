import type { GameState, RoomFunction } from '../../domain/game/contracts'

export const HOUSE_ROOM_FUNCTION_EFFECT_SUMMARIES: Record<RoomFunction, string> = {
  quarters: '+2 crew capacity. The house can billet more retainers in residence.',
  barracks: '+2 guard capacity. Idle defenders recover fatigue faster here.',
  kitchen: 'Resting and recovering NPCs accumulate less hunger each day.',
  study: 'Idle training recovers stress faster and improves daily study gains.',
  workshop: 'Focused engineering and crafting training improves faster each day.',
  archive: 'The house keeps one active rumor from cooling as quickly each day.',
  infirmary: 'Recovering NPCs regain additional health each day.',
  vault: 'Secured storage for the house. Reserved for sealed or high-risk holdings.',
  reception: 'District hire offers stay available longer and one extra candidate can appear.',
}

export function hasIntactHouseRoomFunction(state: GameState, roomFunction: RoomFunction): boolean {
  return state.house.rooms.some((room) => room.state === 'intact' && room.roomFunction === roomFunction)
}
