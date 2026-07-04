import type { GameState } from '../../../domain/game/contracts'
import { selectRosterNpcs } from '../npcPopulation'
import type { GroupMember, GroupRole } from '../../../domain/expedition/contracts'
import { publishEvent } from '../events/publishEvent'
import { appendActivityLogEntry } from '../activityLog'

/**
 * Eligible NPC criteria for corridor coalition membership.
 */
interface EligibleNPC {
  npcId: string
  name: string
  melee: number
  security: number
  discipline: number
}

/**
 * Checks if an NPC is blocked from participating in a coalition.
 * Priority order (highest to lowest):
 * 1. Player Assignment (deployed, working, defense, training)
 * 2. Faction Directive (active directive)
 */
function isNpcBlockedFromCoalition(npc: { assignment: string; currentDirectiveId: string | null }): boolean {
  // Player assignment takes priority - cannot join coalition
  if (npc.assignment !== 'idle') return true

  // Faction directive takes priority over coalition participation
  if (npc.currentDirectiveId !== null) return true

  return false
}

/**
 * Find NPCs eligible for corridor coalition from world NPCs and roster.
 * Excludes NPCs with Player Assignments or Faction Directives.
 */
function findEligibleNPCs(state: GameState): EligibleNPC[] {
  const eligible: EligibleNPC[] = []

  // Check roster NPCs
  for (const npc of selectRosterNpcs(state)) {
    // Skip NPCs who are blocked (assigned or on directive)
    if (isNpcBlockedFromCoalition(npc)) continue

    const melee = npc.skills.melee ?? 0
    const security = npc.skills.security ?? 0
    const discipline = npc.traits.discipline ?? 0

    // Require melee > 50 OR security > 50, and discipline > 40
    if ((melee > 50 || security > 50) && discipline > 40) {
      eligible.push({
        npcId: npc.npcId,
        name: npc.name,
        melee,
        security,
        discipline,
      })
    }
  }

  return eligible
}

/**
 * Assign roles to coalition members based on their stats.
 */
function assignRoles(members: EligibleNPC[]): GroupMember[] {
  const sorted = [...members].sort((a, b) => {
    const aPower = a.melee + a.security + a.discipline
    const bPower = b.melee + b.security + b.discipline
    return bPower - aPower
  })

  const roles: GroupRole[] = ['leader', 'vanguard', 'support', 'scout']

  return sorted.slice(0, 5).map((npc, index) => ({
    npcId: npc.npcId,
    role: roles[index] ?? 'support',
    contribution: 0,
    status: 'committed',
  }))
}

/**
 * formCorridorGroup: Creates a new corridor coalition when the corridor is blocked.
 *
 * This is the core Living World feature - NPCs self-organizing to solve world problems.
 *
 * @param state - Current game state
 * @param rng - Seeded RNG function
 * @returns Updated game state with new coalition
 */
export function formCorridorGroup(
  state: GameState,
  rng: () => number
): GameState {
  // Only form coalition if corridor is blocked or disrupted
  if (state.cityResources.corridorStatus === 'open') {
    return state
  }

  // Only form one coalition at a time
  if (state.cityResources.activeGroups.length > 0) {
    return state
  }

  const eligible = findEligibleNPCs(state)

  // Need at least 2 eligible NPCs to form a coalition
  if (eligible.length < 2) {
    return state
  }

  // Select 3-5 members based on RNG
  const memberCount = Math.min(5, Math.max(2, Math.floor(eligible.length * (0.5 + rng() * 0.5))))
  const shuffled = [...eligible].sort(() => rng() - 0.5)
  const selected = shuffled.slice(0, memberCount)

  // Assign roles
  const members = assignRoles(selected)

  // Calculate difficulty based on corridor status
  const difficulty = state.cityResources.corridorStatus === 'blocked' ? 8 : 5

  // Estimate return day (3-7 days based on difficulty)
  const estimatedReturnDay = state.day + 3 + Math.floor(difficulty / 2)

  const newCoalition = {
    id: crypto.randomUUID(),
    status: 'forming' as const,
    members,
    formedDay: state.day,
    targetSegment: 'main-corridor',
    difficulty,
    progress: 0,
    estimatedReturnDay,
  }

  // Add coalition to activeGroups
  const next = {
    ...state,
    cityResources: {
      ...state.cityResources,
      activeGroups: [...state.cityResources.activeGroups, newCoalition],
    },
  }

  // Publish coalition-formed event
  const nextWithEvent = publishEvent(
    next,
    'coalition-formed',
    {
      groupId: newCoalition.id,
      memberCount: members.length,
      difficulty,
      estimatedReturnDay,
    },
    'system',
    {
      relatedNpcIds: members.map((m) => m.npcId),
      activityLogMessage: `A coalition has formed to clear the Green Corridor. ${members.length} volunteers committed.`,
      activityLogCategory: 'system',
    }
  )

  return nextWithEvent
}

/**
 * Processes NPCs with lead-group intentions and gives them priority for coalition leadership.
 * This integrates the intention system with corridor coalition formation.
 */
export function processLeadCoalitionIntentions(state: GameState): GameState {
  // Only process if corridor is blocked or disrupted
  if (state.cityResources.corridorStatus === 'open') {
    return state
  }

  // Only process if no active coalition exists
  if (state.cityResources.activeGroups.length > 0) {
    return state
  }

  // Find NPCs with lead-group intentions
  const leadIntentions = state.npcRuntimeStates.filter(
    (npc) =>
      npc.currentIntention?.type === 'lead-group' &&
      npc.assignment === 'idle' &&
      npc.currentDirectiveId === null,
  )

  if (leadIntentions.length === 0) {
    return state
  }

  // Log the intention
  let next = state
  for (const npc of leadIntentions) {
    next = appendActivityLogEntry(
      next,
      'system',
      `${npc.name} begins preparing a coalition to clear the Green Corridor`,
    )
  }

  return next
}

/**
 * Processes NPCs with support-group intentions and adds them to existing coalitions.
 * This integrates the intention system with corridor coalition formation.
 */
export function processSupportCoalitionIntentions(state: GameState): GameState {
  // Only process if there are active coalitions
  if (state.cityResources.activeGroups.length === 0) {
    return state
  }

  // Find NPCs with support-group intentions
  const supportIntentions = state.npcRuntimeStates.filter(
    (npc) =>
      npc.currentIntention?.type === 'support-group' &&
      npc.assignment === 'idle' &&
      npc.currentDirectiveId === null,
  )

  if (supportIntentions.length === 0) {
    return state
  }

  // Log the intentions
  let next = state
  for (const npc of supportIntentions) {
    next = appendActivityLogEntry(
      next,
      'system',
      `${npc.name} offers support for the corridor clearance coalition`,
    )
  }

  return next
}
