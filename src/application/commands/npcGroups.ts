import type { GameState } from '../../domain/game/contracts'
import type { NpcGroup, NpcGroupPurpose, NpcRuntimeState } from '../../domain/npc/contracts'
import { appendActivityLogEntry } from './activityLog'
import { buildRelationshipKey } from '../../domain/relationships/contracts'

/**
 * NPC group/squad runtime concept (destiny-nid0).
 *
 * Shared home for lead-group, form-squad, support-group, and recruit-member — all four read and
 * write the same GameState.npcGroups list and share the same co-located-candidate discovery, so
 * they live in one module instead of being split across the per-category files
 * (npcIntellectActions.ts/npcSpecialActions.ts/inline in intentions.ts) that would otherwise
 * triplicate that logic. See the npcGroupSchema doc comment (domain/npc/contracts.ts) for the
 * data-model invariants this module enforces.
 */

const MAX_ADDITIONAL_MEMBERS = 3
const AFFINITY_BOOST = 4

function defaultAxes() {
  return { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
}

function boostAffinity(state: GameState, aId: string, bId: string, amount: number): GameState {
  const key = buildRelationshipKey(aId, bId)
  const reverseKey = buildRelationshipKey(bId, aId)
  const rel = state.relationships[key] ?? defaultAxes()
  const reverseRel = state.relationships[reverseKey] ?? defaultAxes()
  return {
    ...state,
    relationships: {
      ...state.relationships,
      [key]: { ...rel, affinity: Math.max(-100, Math.min(100, rel.affinity + amount)) },
      [reverseKey]: { ...reverseRel, affinity: Math.max(-100, Math.min(100, reverseRel.affinity + amount)) },
    },
  }
}

/** The group this person currently leads or belongs to, or null if ungrouped. */
function npcGroupOf(state: GameState, npcId: string): NpcGroup | null {
  return state.npcGroups.find((g) => g.leaderId === npcId || g.memberIds.includes(npcId)) ?? null
}

function isGroupCandidate(state: GameState, actor: NpcRuntimeState, candidate: NpcRuntimeState): boolean {
  if (candidate.npcId === actor.npcId) return false
  if (!candidate.playerRosterMember) return false
  if (candidate.assignment !== 'idle') return false
  if (!actor.assignedDistrictId || candidate.assignedDistrictId !== actor.assignedDistrictId) return false
  if (npcGroupOf(state, candidate.npcId)) return false
  return true
}

/** Co-located, idle, ungrouped roster candidates, affinity-sorted descending (mirrors npcHostGathering). */
function findGroupCandidates(state: GameState, actor: NpcRuntimeState, limit: number): NpcRuntimeState[] {
  return state.npcRuntimeStates
    .filter((c) => isGroupCandidate(state, actor, c))
    .sort((a, b) => {
      const relA = state.relationships[buildRelationshipKey(actor.npcId, a.npcId)]?.affinity ?? 0
      const relB = state.relationships[buildRelationshipKey(actor.npcId, b.npcId)]?.affinity ?? 0
      return relB - relA
    })
    .slice(0, limit)
}

/** Whether this NPC can currently form a new group (not already grouped, at least one candidate nearby). */
export function npcCanFormGroup(state: GameState, npc: NpcRuntimeState): boolean {
  if (npcGroupOf(state, npc.npcId)) return false
  return findGroupCandidates(state, npc, 1).length > 0
}

function formGroup(state: GameState, npcId: string, purpose: NpcGroupPurpose): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state
  if (npcGroupOf(state, npcId)) return state

  const members = findGroupCandidates(state, npc, MAX_ADDITIONAL_MEMBERS)
  if (members.length === 0) return state

  const group: NpcGroup = {
    groupId: `group-${npcId}-${state.day}`,
    leaderId: npcId,
    memberIds: members.map((m) => m.npcId),
    purpose,
    districtId: npc.assignedDistrictId,
    formedOnDay: state.day,
  }

  let next: GameState = { ...state, npcGroups: [...state.npcGroups, group] }
  for (const member of members) {
    next = boostAffinity(next, npcId, member.npcId, AFFINITY_BOOST)
  }

  const memberNames = members.map((m) => m.name).join(', ')
  const label = purpose === 'squad' ? 'forms a squad' : 'gathers a following'
  return appendActivityLogEntry(next, 'system', `${npc.name} ${label} with ${memberNames}.`)
}

/** NPC gathers a social/political following from nearby idle roster operatives. */
export function npcLeadGroup(state: GameState, npcId: string): GameState {
  return formGroup(state, npcId, 'circle')
}

/** NPC forms a tactical squad from nearby idle roster operatives — same mechanics as lead-group, different flavor. */
export function npcFormSquad(state: GameState, npcId: string): GameState {
  return formGroup(state, npcId, 'squad')
}

function findJoinableGroup(state: GameState, npc: NpcRuntimeState): NpcGroup | null {
  return (
    state.npcGroups.find(
      (g) =>
        g.leaderId !== npc.npcId &&
        g.districtId === npc.assignedDistrictId &&
        g.memberIds.length < MAX_ADDITIONAL_MEMBERS &&
        !g.memberIds.includes(npc.npcId),
    ) ?? null
  )
}

/** Whether this NPC can currently join an existing co-located group as a supporting member. */
export function npcCanSupportGroup(state: GameState, npc: NpcRuntimeState): boolean {
  if (npcGroupOf(state, npc.npcId)) return false
  return findJoinableGroup(state, npc) !== null
}

/** NPC joins a co-located group led by someone else, lending their support. */
export function npcSupportGroup(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state
  if (npcGroupOf(state, npcId)) return state

  const group = findJoinableGroup(state, npc)
  if (!group) return state

  const updatedGroup: NpcGroup = { ...group, memberIds: [...group.memberIds, npcId] }
  let next: GameState = {
    ...state,
    npcGroups: state.npcGroups.map((g) => (g.groupId === group.groupId ? updatedGroup : g)),
  }
  next = boostAffinity(next, npcId, group.leaderId, AFFINITY_BOOST)

  const leaderName = state.npcRuntimeStates.find((n) => n.npcId === group.leaderId)?.name ?? group.leaderId
  return appendActivityLogEntry(next, 'system', `${npc.name} lends support to ${leaderName}'s group.`)
}

function findLedGroup(state: GameState, npcId: string): NpcGroup | null {
  return state.npcGroups.find((g) => g.leaderId === npcId) ?? null
}

/** Whether this NPC leads a group with room to recruit, and a candidate is available to recruit. */
export function npcCanRecruitMember(state: GameState, npc: NpcRuntimeState): boolean {
  const group = findLedGroup(state, npc.npcId)
  if (!group || group.memberIds.length >= MAX_ADDITIONAL_MEMBERS) return false
  return findGroupCandidates(state, npc, 1).length > 0
}

/** NPC (a group leader) recruits one co-located, ungrouped roster operative into their group. */
export function npcRecruitMember(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const group = findLedGroup(state, npcId)
  if (!group || group.memberIds.length >= MAX_ADDITIONAL_MEMBERS) return state

  const target = findGroupCandidates(state, npc, 1)[0]
  if (!target) return state

  const updatedGroup: NpcGroup = { ...group, memberIds: [...group.memberIds, target.npcId] }
  let next: GameState = {
    ...state,
    npcGroups: state.npcGroups.map((g) => (g.groupId === group.groupId ? updatedGroup : g)),
  }
  next = boostAffinity(next, npcId, target.npcId, AFFINITY_BOOST)

  return appendActivityLogEntry(next, 'system', `${npc.name} recruits ${target.name} into their group.`)
}
