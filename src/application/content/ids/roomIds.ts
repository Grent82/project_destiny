/** Canonical IDs for house rooms in data/definitions/houseRooms.json. */
export const ROOM_IDS = {
  BARRACKS: 'room-barracks',
  BUREAU: 'room-bureau',
  EAST_WING: 'room-east-wing',
  ENTRANCE_HALL: 'room-entrance-hall',
  GARRET: 'room-garret',
  HOLDING_FLOOR: 'room-holding-floor',
  INNER_RING: 'room-inner-ring',
  KITCHEN: 'room-kitchen',
  MASTER_CHAMBER: 'room-master-chamber',
  QUARTERS: 'room-quarters',
  SERVANT_QUARTERS: 'room-servant-quarters',
  STUDY: 'room-study',
  VAULT: 'room-vault',
} as const

export type RoomId = typeof ROOM_IDS[keyof typeof ROOM_IDS]
