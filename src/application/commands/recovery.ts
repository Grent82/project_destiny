import type { GameState, NpcRuntimeState } from '../../domain'
import { ROOM_IDS, TITLE_IDS } from '../content/ids'
import { MIN_DEPLOYABLE_HEALTH } from './combatConsts'

export const READY_INJURY_THRESHOLD = 15
export const SERIOUS_INJURY_THRESHOLD = 30

export type RecoverySupportTier = 'none' | 'lodging' | 'treatment' | 'treatment-plus-medic'

const RESIDENTIAL_ROOM_IDS = new Set<string>([
  ROOM_IDS.QUARTERS,
  ROOM_IDS.MASTER_CHAMBER,
  ROOM_IDS.SERVANT_QUARTERS,
  ROOM_IDS.BARRACKS,
  ROOM_IDS.EAST_WING,
])

function hasIntactRoom(state: GameState, roomFunction: string): boolean {
  return state.house.rooms.some((room) => room.state === 'intact' && room.roomFunction === roomFunction)
}

function hasAnyIntactResidentialRoom(state: GameState): boolean {
  return state.house.rooms.some((room) => room.state === 'intact' && RESIDENTIAL_ROOM_IDS.has(room.roomId))
}

export function hasResidentQuarters(state: GameState, roomId: string | null): boolean {
  if (!roomId || !RESIDENTIAL_ROOM_IDS.has(roomId)) return false
  return state.house.rooms.some((room) => room.roomId === roomId && room.state === 'intact')
}

export function hasMedicSupport(state: GameState): boolean {
  return state.roster.some((npc) => npc.activeTitle === TITLE_IDS.MEDIC && npc.assignment !== 'deployed')
}

export function hasInfirmarySupport(state: GameState): boolean {
  return hasIntactRoom(state, 'infirmary')
}

export function isSeriousInjury(injury: number): boolean {
  return injury >= SERIOUS_INJURY_THRESHOLD
}

export function isReadyForDuty(health: number, injury: number): boolean {
  return health >= MIN_DEPLOYABLE_HEALTH && injury < READY_INJURY_THRESHOLD
}

export function getNpcRecoverySupport(state: GameState, npc: NpcRuntimeState): RecoverySupportTier {
  const hasMedic = hasMedicSupport(state)
  const hasInfirmary = hasInfirmarySupport(state)
  const hasLodging = hasResidentQuarters(state, npc.roomAssignment)

  if (hasMedic && hasInfirmary) return 'treatment-plus-medic'
  if (hasMedic || hasInfirmary) return 'treatment'
  if (hasLodging) return 'lodging'
  return 'none'
}

export function getPlayerRecoverySupport(state: GameState, injury: number): RecoverySupportTier {
  const hasMedic = hasMedicSupport(state)
  const hasInfirmary = hasInfirmarySupport(state)
  const hasLodging = hasAnyIntactResidentialRoom(state)

  if (isSeriousInjury(injury) && hasMedic && hasInfirmary) return 'treatment-plus-medic'
  if (isSeriousInjury(injury) && (hasMedic || hasInfirmary)) return 'treatment'
  if (hasLodging) return 'lodging'
  return 'none'
}

export function getRecoveringHealthGain(tier: RecoverySupportTier): number {
  switch (tier) {
    case 'lodging':
      return 17
    case 'treatment':
      return 18
    case 'treatment-plus-medic':
      return 28
    default:
      return 15
  }
}

export function getRecoveringInjuryRelief(tier: RecoverySupportTier): number {
  switch (tier) {
    case 'lodging':
      return 2
    case 'treatment':
      return 3
    case 'treatment-plus-medic':
      return 5
    default:
      return 1
  }
}

export function getPlayerOvernightHealthGain(tier: RecoverySupportTier): number {
  switch (tier) {
    case 'lodging':
      return 5
    case 'treatment':
      return 7
    case 'treatment-plus-medic':
      return 10
    default:
      return 3
  }
}
