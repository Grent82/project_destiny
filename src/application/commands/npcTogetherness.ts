import type { GameState, NpcRuntimeState } from '../../domain'
import { ROOM_IDS } from '../content/ids'

const RESIDENTIAL_ROOM_IDS = new Set<string>([
  ROOM_IDS.QUARTERS,
  ROOM_IDS.MASTER_CHAMBER,
  ROOM_IDS.SERVANT_QUARTERS,
  ROOM_IDS.BARRACKS,
  ROOM_IDS.EAST_WING,
])

/**
 * Shared eligibility gate for household/pairing "togetherness" triggers (domestic bonding,
 * intimacy-stage progression). An NPC who is captive, missing, a ward, or physically away
 * from the house cannot plausibly be "together" with another roster NPC right now.
 *
 * See docs/analysis/roster-npc-spatial-contract-2026-07-03.md (presence precedence rule).
 */
export function isEligibleForHouseholdTogetherness(npc: NpcRuntimeState, houseDistrictId: string): boolean {
  if (npc.captivityState?.status === 'captive') return false
  if (npc.captivityState?.status === 'missing') return false
  if (npc.status === 'ward') return false
  if (npc.assignment === 'deployed') return false
  if (
    (npc.assignment === 'working' || npc.assignment === 'defense' || npc.assignment === 'transferred') &&
    npc.assignedDistrictId &&
    npc.assignedDistrictId !== houseDistrictId
  ) {
    return false
  }
  return true
}

/** Whether the given room is an intact residential (lodging/quarters) room. */
export function isResidentialRoom(state: GameState, roomId: string | null): boolean {
  if (!roomId || !RESIDENTIAL_ROOM_IDS.has(roomId)) return false
  return state.house.rooms.some((room) => room.roomId === roomId && room.state === 'intact')
}

/** Two NPCs are co-resident when they share the same intact residential room — a "shared quarters routine". */
export function shareResidentialRoom(state: GameState, npcA: NpcRuntimeState, npcB: NpcRuntimeState): boolean {
  if (!npcA.roomAssignment || npcA.roomAssignment !== npcB.roomAssignment) return false
  return isResidentialRoom(state, npcA.roomAssignment)
}

/** Whether the given room is an intact in-house duty post (distinct from residential rooms). */
export function isIntactDutyPost(state: GameState, roomId: string | null): boolean {
  if (!roomId) return false
  return state.house.rooms.some((room) => room.roomId === roomId && room.state === 'intact')
}

/** Two NPCs are co-workers when they share the same intact in-house duty post — a "shared duty routine". */
export function shareDutyPost(state: GameState, npcA: NpcRuntimeState, npcB: NpcRuntimeState): boolean {
  if (!npcA.dutyPostRoomId || npcA.dutyPostRoomId !== npcB.dutyPostRoomId) return false
  return isIntactDutyPost(state, npcA.dutyPostRoomId)
}
