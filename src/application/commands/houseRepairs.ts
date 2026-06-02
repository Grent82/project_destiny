import { appendActivityLogEntry } from './activityLog'
import { computeExteriorTier } from './commitExteriorTier'
import type { GameState } from '../../domain'
import type { HouseRoom } from '../../domain/game/contracts'

const REPAIR_DAYS_BY_STATE: Partial<Record<HouseRoom['state'], number>> = {
  damaged: 3,
  stripped: 7,
  collapsed: 14,
  destroyed: 30,
}

const ROSTER_BONUS_BY_ROOM: Record<string, number> = {
  'room-servant-quarters': 1,
  'room-barracks': 1,
  'room-east-wing': 2,
}

const COMPLETION_MESSAGES: Record<string, string> = {
  'room-bureau': 'Bureau restored. The house has a place for its accounts again.',
  'room-kitchen': 'Kitchen repaired. The smell of proper cooking returns to the house.',
  'room-study': 'Study cleared and shelved. A quiet place for thought and learning.',
  'room-master-chamber': "Master's Chamber restored. The lord's chamber is fit to receive again.",
  'room-servant-quarters': 'Servant Quarters cleared and re-fitted. The house can shelter another soul in service.',
  'room-barracks': 'Barracks rebuilt. Bunks and gear racks are usable again.',
  'room-garret': 'Garret shored up. The top floor breathes again.',
  'room-east-wing': 'East Wing reclaimed at great cost. The house is whole again.',
}

export function getRoomRepairDays(room: HouseRoom): number {
  return REPAIR_DAYS_BY_STATE[room.state] ?? 0
}

function completeRoomRepair(state: GameState, roomId: string): GameState {
  const room = state.house.rooms.find((entry) => entry.roomId === roomId)
  if (!room) return state

  const bonus = ROSTER_BONUS_BY_ROOM[roomId] ?? 0
  const next: GameState = {
    ...state,
    house: {
      ...state.house,
      rosterBonus: bonus > 0 ? (state.house.rosterBonus ?? 0) + bonus : state.house.rosterBonus,
      rooms: state.house.rooms.map((entry) =>
        entry.roomId === roomId
          ? { ...entry, state: 'intact', repairCost: 0, repairDaysRemaining: 0 }
          : entry,
      ),
    },
  }
  next.house.exteriorState = computeExteriorTier(next)
  return appendActivityLogEntry(
    next,
    'economy',
    COMPLETION_MESSAGES[roomId] ?? `${room.name} repaired. The house reclaims another room.`,
  )
}

export function tickHouseRepairs(state: GameState): GameState {
  let next = state
  for (const room of state.house.rooms.filter((entry) => entry.repairDaysRemaining > 0)) {
    const daysRemaining = Math.max(0, room.repairDaysRemaining - 1)
    next = {
      ...next,
      house: {
        ...next.house,
        rooms: next.house.rooms.map((entry) =>
          entry.roomId === room.roomId
            ? { ...entry, repairDaysRemaining: daysRemaining }
            : entry,
        ),
      },
    }
    if (daysRemaining === 0) {
      next = completeRoomRepair(next, room.roomId)
    }
  }
  return next
}
