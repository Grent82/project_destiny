import type { GameState, RoomFunction } from '../../domain/game/contracts'

/**
 * Room function bonuses toward crew (roster) capacity.
 * All other functions provide non-capacity bonuses handled by selectors.
 */
export const ROOM_FUNCTION_CAPACITY_BONUS: Partial<Record<RoomFunction, number>> = {
  quarters: 2,
  barracks: 2,
}

/**
 * Assign a function to an intact house room.
 * Rejects if the room is not intact.
 * Replaces any existing function assignment.
 */
export function assignRoomFunction(
  state: GameState,
  roomId: string,
  roomFunction: RoomFunction,
): GameState {
  const room = state.house.rooms.find((r) => r.roomId === roomId)

  if (!room) {
    throw new Error(`Room not found: ${roomId}`)
  }
  if (room.state !== 'intact') {
    throw new Error(`Room "${roomId}" must be intact before assigning a function (current state: ${room.state})`)
  }

  return {
    ...state,
    house: {
      ...state.house,
      rooms: state.house.rooms.map((r) =>
        r.roomId === roomId ? { ...r, roomFunction } : r,
      ),
    },
  }
}
