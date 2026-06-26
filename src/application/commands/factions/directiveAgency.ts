import type { FactionDirective, FactionDirectiveType, GameState } from '../../../domain'
import { directiveSkillRequirements } from '../../../domain/factions/contracts'
import { type NpcRuntimeState } from '../../../domain/npc/contracts'
import { createRng } from '../seededRng'
import { appendActivityLogEntry } from '../activityLog'
import { contentCatalog } from '../../content/contentCatalog'

/**
 * Generates a unique ID for a faction directive.
 */
function generateDirectiveId(day: number, factionId: string, rng: ReturnType<typeof createRng>['rng']): string {
  const seedPart = Math.floor(rng() * 10000)
  return `directive-${factionId}-${day}-${seedPart}`
}

/**
 * Checks if an NPC meets the skill requirements for a directive type.
 */
function meetsSkillRequirements(npc: NpcRuntimeState, directiveType: FactionDirectiveType): boolean {
  const requirements = directiveSkillRequirements[directiveType]
  if (!requirements) return true

  for (const [skillOrTrait, threshold] of Object.entries(requirements)) {
    const value = npc.attributes[skillOrTrait as keyof typeof npc.attributes] ??
                  npc.skills[skillOrTrait as keyof typeof npc.skills] ??
                  npc.traits[skillOrTrait as keyof typeof npc.traits] ?? 0
    if (value < threshold) return false
  }

  return true
}

/**
 * Calculates a score for how suitable an NPC is for a directive.
 * Higher score = better match.
 */
function calculateDirectiveSuitability(npc: NpcRuntimeState, directiveType: FactionDirectiveType, factionStanding: number): number {
  let score = 0

  // Base score from faction standing (higher standing = more trusted with important tasks)
  score += Math.floor(factionStanding / 10)

  // Skill match bonus
  const requirements = directiveSkillRequirements[directiveType]
  if (requirements) {
    for (const [skillOrTrait, threshold] of Object.entries(requirements)) {
      const value = npc.attributes[skillOrTrait as keyof typeof npc.attributes] ??
                    npc.skills[skillOrTrait as keyof typeof npc.skills] ??
                    npc.traits[skillOrTrait as keyof typeof npc.traits] ?? 0
      if (value >= threshold) {
        score += Math.floor((value - threshold) / 5)
      }
    }
  }

  // Availability bonus
  if (npc.assignment === 'idle') score += 20
  else if (npc.assignment === 'working') score += 10

  return score
}

/**
 * Finds eligible NPCs for a directive type.
 * Filters by: assignment capacity, skill requirements, faction standing.
 */
function findEligibleNPCs(
  state: GameState,
  factionId: string,
  directiveType: FactionDirectiveType,
): { npc: NpcRuntimeState; score: number }[] {
  const factionStanding = state.factionStandings[factionId] ?? 0
  const eligible: { npc: NpcRuntimeState; score: number }[] = []

  for (const npc of state.roster) {
    // Skip NPCs who are already on a directive
    if (npc.currentDirectiveId) continue

    // Skip NPCs who are deployed or otherwise unavailable
    if (npc.assignment === 'deployed') continue
    if (npc.assignment === 'defense') continue

    // Check skill requirements
    if (!meetsSkillRequirements(npc, directiveType)) continue

    // Check minimum faction standing (need at least -20 to receive directives)
    const npcFactionStanding = npc.factionRelationships?.find((fr) => fr.factionId === factionId)?.standing ?? 0
    if (npcFactionStanding < -20) continue

    const score = calculateDirectiveSuitability(npc, directiveType, factionStanding + npcFactionStanding)
    eligible.push({ npc, score })
  }

  return eligible.sort((a, b) => b.score - a.score)
}

/**
 * Determines which directive types a faction should prioritize based on their agenda.
 */
function getPriorityDirectiveTypes(factionId: string): FactionDirectiveType[] {
  // Map faction agendas to preferred directive types
  const factionPreferences: Record<string, FactionDirectiveType[]> = {
    'faction-civic-compact': ['scout', 'protect', 'intercept'],
    'faction-gilded-court': ['negotiate', 'retrieve', 'escort'],
    'faction-foundry-league': ['protect', 'retrieve', 'scout'],
    'faction-tallow-ring': ['sabotage', 'retrieve', 'investigate'],
    'faction-restored': ['investigate', 'negotiate', 'scout'],
    'faction-house-merrow': ['negotiate', 'protect', 'investigate'],
  }

  return factionPreferences[factionId] ?? ['scout', 'protect', 'investigate']
}

/**
 * Generates a directive description based on type and target.
 */
function generateDirectiveDescription(directiveType: FactionDirectiveType, targetId: string, state: GameState): string {
  const targetName = getTargetName(targetId, state)

  switch (directiveType) {
    case 'scout':
      return `Gather intelligence on ${targetName} and report any threats or opportunities`
    case 'protect':
      return `Provide security detail for ${targetName}`
    case 'retrieve':
      return `Recover valuable items or documents from ${targetName}`
    case 'intercept':
      return `Intercept and neutralize threats near ${targetName}`
    case 'negotiate':
      return `Establish dialogue with representatives at ${targetName}`
    case 'sabotage':
      return `Disrupt operations at ${targetName}`
    case 'escort':
      return `Provide safe passage through ${targetName}`
    case 'investigate':
      return `Uncover information about activities at ${targetName}`
    default:
      return `Complete assigned task at ${targetName}`
  }
}

/**
 * Gets a human-readable name for a target.
 */
function getTargetName(targetId: string, state: GameState): string {
  // Check if it's an NPC
  const npc = state.roster.find((n) => n.npcId === targetId)
  if (npc) return npc.name

  // Check if it's a district
  const district = state.districts.find((d) => d.districtId === targetId)
  if (district) {
    // Get district name from content catalog
    const districtDef = contentCatalog.districts.find((d) => d.id === targetId)
    return districtDef?.name ?? targetId
  }

  // Check if it's a faction
  const faction = contentCatalog.factions.find((f) => f.id === targetId)
  if (faction) return faction.name

  // Fallback to ID
  return targetId
}

/**
 * Calculates reward based on directive priority and difficulty.
 */
function calculateRewards(directiveType: FactionDirectiveType, priority: number): { rewardMarks: number; rewardStanding: number } {
  const baseMarks = {
    scout: 50,
    protect: 75,
    retrieve: 100,
    intercept: 100,
    negotiate: 75,
    sabotage: 150,
    escort: 60,
    investigate: 80,
  }

  const baseStanding = {
    scout: 5,
    protect: 8,
    retrieve: 10,
    intercept: 10,
    negotiate: 8,
    sabotage: 12,
    escort: 6,
    investigate: 9,
  }

  const multiplier = priority / 3 // Priority 1-5, so multiplier is 0.33 to 1.67

  return {
    rewardMarks: Math.floor(baseMarks[directiveType] * multiplier),
    rewardStanding: Math.floor(baseStanding[directiveType] * multiplier),
  }
}

/**
 * Generates a single directive for an NPC if conditions are met.
 */
function tryGenerateDirective(
  state: GameState,
  factionId: string,
  directiveType: FactionDirectiveType,
  rng: ReturnType<typeof createRng>['rng'],
): { newState: GameState; directive: FactionDirective } | null {
  const eligibleNPCs = findEligibleNPCs(state, factionId, directiveType)

  if (eligibleNPCs.length === 0) return null

  // Select the best candidate
  const { npc } = eligibleNPCs[0]!

  // Determine target based on directive type and faction territory
  const faction = contentCatalog.factions.find((f) => f.id === factionId)
  const territory = faction?.territory ?? ['district-the-pale']
  const targetId = territory[Math.floor(rng() * territory.length)] ?? 'district-the-pale'

  // Calculate priority based on faction power and world state
  const factionRuntime = state.factionStates.find((f) => f.factionId === factionId)
  const basePriority = Math.floor((factionRuntime?.power ?? 50) / 25) + 1 // 1-5 based on power
  const priority = Math.min(5, Math.max(1, basePriority))

  // Calculate deadline (3-7 days based on priority)
  const deadlineDays = Math.max(1, 7 - priority)
  const deadlineDay = state.day + deadlineDays

  const { rewardMarks, rewardStanding } = calculateRewards(directiveType, priority)

  const directive: FactionDirective = {
    id: generateDirectiveId(state.day, factionId, rng),
    factionId,
    targetNpcId: npc.npcId,
    directiveType,
    targetId,
    targetType: 'district',
    priority,
    deadlineDay,
    status: 'pending',
    rewardMarks,
    rewardStanding,
    createdAtDay: state.day,
    completedAtDay: null,
    description: generateDirectiveDescription(directiveType, targetId, state),
  }

  const newState = {
    ...state,
    activeDirectives: [...state.activeDirectives, directive],
    roster: state.roster.map((rosterNpc) =>
      rosterNpc.npcId === npc.npcId
        ? {
            ...rosterNpc,
            currentDirectiveId: directive.id,
            directiveDeadlineDay: deadlineDay,
          }
        : rosterNpc,
    ),
  }

  // Add activity log entry
  const factionName = faction?.name ?? 'the faction'
  const directiveTypeName = directiveType.charAt(0).toUpperCase() + directiveType.slice(1)
  const message = `${npc.name} receives a ${directiveTypeName} directive from ${factionName}: ${directive.description}`

  return {
    newState: appendActivityLogEntry(newState, 'system', message),
    directive,
  }
}

/**
 * Processes pending directives that are due today.
 * Marks them as completed or failed based on RNG and NPC traits.
 */
function processDueDirectives(state: GameState, rng: ReturnType<typeof createRng>['rng']): GameState {
  const dueDirectives = state.activeDirectives.filter((d) => d.deadlineDay === state.day && d.status === 'pending')

  if (dueDirectives.length === 0) return state

  let newState = state

  for (const directive of dueDirectives) {
    const npc = newState.roster.find((n) => n.npcId === directive.targetNpcId)
    if (!npc) continue

    // Calculate success chance based on NPC skills and directive type
    const requirements = directiveSkillRequirements[directive.directiveType]
    let successChance = 0.5 // Base 50%

    if (requirements) {
      for (const [skillOrTrait, threshold] of Object.entries(requirements)) {
        const value = npc.attributes[skillOrTrait as keyof typeof npc.attributes] ??
                      npc.skills[skillOrTrait as keyof typeof npc.skills] ??
                      npc.traits[skillOrTrait as keyof typeof npc.traits] ?? 0
        if (value >= threshold) {
          successChance += 0.1 // Bonus for meeting requirements
        }
        if (value >= threshold * 1.5) {
          successChance += 0.1 // Extra bonus for exceeding requirements
        }
      }
    }

    // Faction standing bonus
    const factionStanding = newState.factionStandings[directive.factionId] ?? 0
    successChance += factionStanding / 200 // -50 to +50 standing = -25% to +25%

    const roll = rng()
    const succeeded = roll < successChance

    newState = {
      ...newState,
      activeDirectives: newState.activeDirectives.map((d) =>
        d.id === directive.id
          ? {
              ...d,
              status: succeeded ? 'completed' : 'failed',
              completedAtDay: state.day,
            }
          : d,
      ),
      roster: newState.roster.map((rosterNpc) =>
        rosterNpc.npcId === directive.targetNpcId
          ? {
              ...rosterNpc,
              currentDirectiveId: null,
              directiveDeadlineDay: null,
            }
          : rosterNpc,
      ),
    }

    // Add activity log entry
    const npcName = npc.name
    const faction = contentCatalog.factions.find((f) => f.id === directive.factionId)
    const factionName = faction?.name ?? 'the faction'
    const directiveTypeName = directive.directiveType.charAt(0).toUpperCase() + directive.directiveType.slice(1)

    if (succeeded) {
      const message = `${npcName} successfully completed their ${directiveTypeName} directive for ${factionName} at ${directive.targetId}`
      newState = appendActivityLogEntry(newState, 'system', message)

      // Apply rewards
      newState = {
        ...newState,
        factionStandings: {
          ...newState.factionStandings,
          [directive.factionId]: Math.min(100, (newState.factionStandings[directive.factionId] ?? 0) + directive.rewardStanding),
        },
      }
    } else {
      const message = `${npcName} failed their ${directiveTypeName} directive for ${factionName} at ${directive.targetId}`
      newState = appendActivityLogEntry(newState, 'system', message)

      // Apply penalty
      newState = {
        ...newState,
        factionStandings: {
          ...newState.factionStandings,
          [directive.factionId]: Math.max(-100, (newState.factionStandings[directive.factionId] ?? 0) - Math.abs(directive.rewardStanding) / 2),
        },
      }
    }
  }

  return newState
}

/**
 * Main function to generate faction directives for the day.
 * Called once per day during endDay processing.
 */
export function generateFactionDirectives(state: GameState): GameState {
  const { rng } = createRng(state.rngSeed)

  let newState = state

  // Process due directives first (complete/fail old ones)
  newState = processDueDirectives(newState, rng)

  // Generate new directives for each faction
  for (const faction of contentCatalog.factions) {
    // Get priority directive types for this faction
    const priorityTypes = getPriorityDirectiveTypes(faction.id)

    // Try to generate a directive for each priority type
    for (const directiveType of priorityTypes) {
      // 30% chance per faction per day to generate a directive
      if (rng() > 0.3) continue

      const result = tryGenerateDirective(newState, faction.id, directiveType, rng)
      if (result) {
        newState = result.newState
        // Break after first successful directive per faction per day
        break
      }
    }
  }

  // Advance RNG seed
  return {
    ...newState,
    rngSeed: Math.floor(rng() * 1000000),
  }
}

/**
 * Checks if an NPC is currently on a directive.
 */
export function isNpcOnDirective(state: GameState, npcId: string): boolean {
  const npc = state.roster.find((n) => n.npcId === npcId)
  return !!npc?.currentDirectiveId
}

/**
 * Gets the active directive for an NPC.
 */
export function getNpcDirective(state: GameState, npcId: string): FactionDirective | null {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc?.currentDirectiveId) return null

  return state.activeDirectives.find((d) => d.id === npc.currentDirectiveId) ?? null
}
