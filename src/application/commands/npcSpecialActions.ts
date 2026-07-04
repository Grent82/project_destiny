import type { GameState } from '../../domain/game/contracts'
import type { Rng } from './seededRng'
import { appendActivityLogEntry } from './activityLog'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { calculateMercenaryContractWage } from './wageRates'
import { createEmployment } from './employment/createEmployment'

/**
 * NPC Special Actions (destiny-ddqf)
 *
 * Real implementations for resource-gather, scavenge, seek-employment, and host-gathering.
 * shop-for-goods stays a placeholder — blocked pending destiny-su15.3/su15.4 (canonical
 * inventory transfer core + persistent shop stock), per the bead's own notes. recruit-member
 * stays a placeholder — no NPC group/squad runtime concept exists to add a member to (see
 * destiny-l2ex's lead-group/support-group for the same gap).
 */

/** NPC gathers raw materials for the house, feeding the (currently unpopulated) materialStock. */
export function npcResourceGather(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const gain = Math.max(
    1,
    Math.round(2 + (npc.skills.survival - 50) / 15 + (npc.attributes.endurance - 50) / 20 + (npc.traits.prudence - 50) / 25),
  )

  const next: GameState = {
    ...state,
    cityResources: {
      ...state.cityResources,
      materialStock: Math.min(100, state.cityResources.materialStock + gain),
    },
  }
  return appendActivityLogEntry(next, 'system', `${npc.name} gathers useful materials for the house.`)
}

/** NPC scavenges for scrap materials — a smaller, endurance-focused counterpart to resource-gather. */
export function npcScavenge(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const gain = Math.max(1, Math.round(1 + (npc.skills.survival - 50) / 20 + (npc.attributes.endurance - 50) / 20))

  const next: GameState = {
    ...state,
    cityResources: {
      ...state.cityResources,
      materialStock: Math.min(100, state.cityResources.materialStock + gain),
    },
  }
  return appendActivityLogEntry(next, 'system', `${npc.name} scavenges scrap from the district.`)
}

/**
 * NPC seeks day labor, creating a real employment contract via the existing (previously
 * unfed-by-idle-NPCs) createEmployment command. No-ops if the NPC already has an active
 * employment contract.
 */
export function npcSeekEmployment(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state
  if (npc.currentEmployment && npc.currentEmployment.status !== 'completed' && npc.currentEmployment.status !== 'failed' && npc.currentEmployment.status !== 'cancelled') {
    return state
  }

  const wagePerDay = calculateMercenaryContractWage(npc.skills)
  const districtLabel = npc.assignedDistrictId ?? 'the district'

  return createEmployment(state, {
    employerId: 'day-labor',
    employerType: 'faction',
    employeeId: npc.npcId,
    taskType: 'work',
    deadlineDay: state.day + 5,
    wagePerDay,
    description: `Day labor found in ${districtLabel}`,
  })
}

/**
 * NPC hosts a small gathering among other idle roster NPCs — an autonomous, NPC-to-NPC
 * counterpart to hostGathering.ts (which is player-initiated only). Requires an intact
 * reception/quarters/study room, matching hostGathering.ts's room requirement.
 */
export function npcHostGathering(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const room = state.house.rooms.find(
    (r) => r.state === 'intact' && (r.roomFunction === 'reception' || r.roomFunction === 'quarters' || r.roomFunction === 'study'),
  )
  if (!room) return state

  const guests = state.npcRuntimeStates
    .filter((r) => r.npcId !== npcId && r.assignment === 'idle')
    .sort((a, b) => {
      const relA = state.relationships[buildRelationshipKey(npcId, a.npcId)]?.affinity ?? 0
      const relB = state.relationships[buildRelationshipKey(npcId, b.npcId)]?.affinity ?? 0
      return relB - relA
    })
    .slice(0, 3)
  if (guests.length === 0) return state

  const successChance = Math.max(
    0.2,
    Math.min(0.9, 0.4 + (npc.skills.performance - 50) / 150 + (npc.attributes.presence - 50) / 150),
  )
  const success = rng() < successChance
  const gain = success ? 3 : 1

  let next = state
  for (const guest of guests) {
    const key = buildRelationshipKey(npcId, guest.npcId)
    const reverseKey = buildRelationshipKey(guest.npcId, npcId)
    const rel = state.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
    const reverseRel = state.relationships[reverseKey] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
    next = {
      ...next,
      relationships: {
        ...next.relationships,
        [key]: { ...rel, affinity: Math.max(-100, Math.min(100, rel.affinity + gain)) },
        [reverseKey]: { ...reverseRel, affinity: Math.max(-100, Math.min(100, reverseRel.affinity + gain)) },
      },
    }
  }

  const guestNames = guests.map((g) => g.name).join(', ')
  const message = success
    ? `${npc.name} hosts a gathering in ${room.name} with ${guestNames}. A good evening.`
    : `${npc.name} hosts a gathering in ${room.name} with ${guestNames}, though it's a quiet, awkward affair.`
  return appendActivityLogEntry(next, 'system', message)
}
