import type { GameState } from '../../domain'
import type { CoalitionMember, CoalitionRole } from '../../../domain/expedition/contracts'
import { publishEvent } from '../events/publishEvent'

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
 * Find NPCs eligible for corridor coalition from world NPCs and roster.
 */
function findEligibleNPCs(state: GameState): EligibleNPC[] {
  const eligible: EligibleNPC[] = []

  // Check roster NPCs
  for (const npc of state.roster) {
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

  // Check world NPCs
  for (const npc of state.worldNpcStates) {
    const melee = npc.skills?.melee ?? 0
    const security = npc.skills?.security ?? 0
    const discipline = npc.traits?.discipline ?? 0

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
function assignRoles(members: EligibleNPC[]): CoalitionMember[] {
  const sorted = [...members].sort((a, b) => {
    const aPower = a.melee + a.security + a.discipline
    const bPower = b.melee + b.security + b.discipline
    return bPower - aPower
  })

  const roles: CoalitionRole[] = ['leader', 'vanguard', 'support', 'scout']

  return sorted.slice(0, 5).map((npc, index) => ({
    npcId: npc.npcId,
    role: roles[index] ?? 'support',
    contribution: 0,
    status: 'committed',
  }))
}

/**
 * formCorridorCoalition: Creates a new corridor coalition when the corridor is blocked.
 *
 * This is the core Living World feature - NPCs self-organizing to solve world problems.
 *
 * @param state - Current game state
 * @param rng - Seeded RNG function
 * @returns Updated game state with new coalition
 */
export function formCorridorCoalition(
  state: GameState,
  rng: () => number
): GameState {
  // Only form coalition if corridor is blocked or disrupted
  if (state.cityResources.corridorStatus === 'open') {
    return state
  }

  // Only form one coalition at a time
  if (state.cityResources.activeCoalitions.length > 0) {
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

  // Add coalition to activeCoalitions
  const next = {
    ...state,
    cityResources: {
      ...state.cityResources,
      activeCoalitions: [...state.cityResources.activeCoalitions, newCoalition],
    },
  }

  // Publish coalition-formed event
  const nextWithEvent = publishEvent(
    next,
    'coalition-formed',
    {
      coalitionId: newCoalition.id,
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
