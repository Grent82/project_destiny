/**
 * Procedural Quest Generation
 *
 * Generates quest leads from world state rather than only authored templates.
 * Supports the "living world" principle: quests emerge from faction conflicts,
 * district tension, and available NPCs.
 */

import type { GameState } from '../../domain/game/contracts'
import type { QuestTemplate, QuestDiscoverySource } from '../../domain/quests/contracts'

/**
 * Parameters for generating a procedural combat quest.
 * The generator fills in templated text based on these inputs.
 */
export type ProceduralCombatQuestParams = {
  employerFactionId: string
  enemyFactionId: string
  districtId: string
  day: number
  seed: number // For deterministic text variation
}

/**
 * Template bank for procedural combat quest briefings.
 * Each template uses {employer}, {enemy}, {district} placeholders.
 */
const COMBAT_QUEST_TEMPLATES: Array<{
  titlePattern: string
  briefingPattern: string
  riskLevel: 'low' | 'medium' | 'high'
}> = [
  {
    titlePattern: '{employer} Retaliation: {district} Ward',
    briefingPattern:
      'The {employer} lost ground in {district} this week. {enemy} forces are holding a position they should not control. Break their hold and send a message. Four people minimum, professionals only.',
    riskLevel: 'medium',
  },
  {
    titlePattern: '{enemy} Disruption Operation',
    briefingPattern:
      '{enemy} cells have been active in {district}. Operations are interfering with {employer} interests. Locate and neutralize the crew before they escalate. No witnesses, no Register entry.',
    riskLevel: 'high',
  },
  {
    titlePattern: 'Clean-up in {district}',
    briefingPattern:
      'A {enemy} operation in {district} went to ground. {employer} wants the crew broken before they can reorganize. This is a cleanup job. Make it clean.',
    riskLevel: 'low',
  },
  {
    titlePattern: '{employer} Territory Recovery',
    briefingPattern:
      '{district} was {employer} ground until {enemy} moved in last month. The {employer} want it back without a public incident. Resolve the occupation quietly.',
    riskLevel: 'medium',
  },
]

/**
 * Faction name lookup for templated text.
 * In production, this would come from a faction definition catalog.
 */
const FACTION_NAME_LOOKUP: Record<string, string> = {
  'faction-civic-compact': 'Compact',
  'faction-gilded-court': 'Court',
  'faction-foundry-league': 'League',
  'faction-tallow-ring': 'Ring',
  'faction-restored': 'Restored',
}

/**
 * District name lookup for templated text.
 */
const DISTRICT_NAME_LOOKUP: Record<string, string> = {
  'district-the-pale': 'the Pale',
  'district-the-warrens': 'the Warrens',
  'district-the-tangle': 'the Tangle',
  'district-the-hollows': 'the Hollows',
  'district-harbor': 'the Harbor',
  'district-ironworks': 'the Ironworks',
}

function getFactionName(factionId: string): string {
  return FACTION_NAME_LOOKUP[factionId] ?? factionId
}

function getDistrictName(districtId: string): string {
  return DISTRICT_NAME_LOOKUP[districtId] ?? districtId
}

function substituteTemplate(template: string, params: ProceduralCombatQuestParams): string {
  const employer = getFactionName(params.employerFactionId)
  const enemy = getFactionName(params.enemyFactionId)
  const district = getDistrictName(params.districtId)

  return template
    .replace(/{employer}/g, employer)
    .replace(/{enemy}/g, enemy)
    .replace(/{district}/g, district)
}

function selectTemplate(seed: number): typeof COMBAT_QUEST_TEMPLATES[0] {
  // Use seed to select a template deterministically
  const index = seed % COMBAT_QUEST_TEMPLATES.length
  return COMBAT_QUEST_TEMPLATES[index]!
}

function calculateRewardMarks(params: ProceduralCombatQuestParams, template: typeof COMBAT_QUEST_TEMPLATES[0]): number {
  const baseRewards = { low: 120, medium: 200, high: 320 }
  const base = baseRewards[template.riskLevel]

  // Slight variation based on seed for variety
  const variation = (params.seed % 20) - 10
  return base + variation
}

/**
 * Generate a procedural combat quest from world state parameters.
 *
 * This creates a QuestTemplate that can be presented to the player
 * as a contract board listing. The quest is not authored - it is
 * synthesized from faction conflict and district context.
 *
 * @param params - The world state parameters for quest generation
 * @returns A QuestTemplate ready for presentation
 */
function generateProceduralQuestId(day: number, seed: number): string {
  return `quest-procedural-${day}-${seed % 1000}`
}

export function generateProceduralCombatQuest(
  params: ProceduralCombatQuestParams
): QuestTemplate {
  const template = selectTemplate(params.seed)

  return {
    id: generateProceduralQuestId(params.day, params.seed),
    title: substituteTemplate(template.titlePattern, params),
    questType: 'contract',
    employerFactionId: params.employerFactionId,
    enemyFactionId: params.enemyFactionId,
    districtId: params.districtId,
    briefing: substituteTemplate(template.briefingPattern, params),
    openingText: null,
    aftermathText: null,
    prerequisiteQuestId: null,
    objectiveType: 'combat',
    rewardMarks: calculateRewardMarks(params, template),
    rewardStandingFactionId: params.employerFactionId,
    rewardStandingDelta: 6 + (params.seed % 4),
    penaltyStandingDelta: -4,
    timeLimitDays: 4 + (params.seed % 3),
    executionDurationDays: null,
    executionDurationWatches: null,
    linkedMissionId: null,
    enemyNpcId: undefined,
    requiredFactionStanding: null,
    discoverySource: null,
    discoveryDistrictId: null,
    sourceNpcId: null,
    riskLevel: template.riskLevel,
    flavorNote: null,
    rewardCityDialId: 'unrest',
    rewardCityDialDelta: -3,
    rewardDebtReduction: 0,
    unlocksNpcId: null,
    successorQuestId: null,
    successorOnFailQuestId: null,
    midQuestBeats: [],
    rewardItemIds: [],
    rewardRelationshipDeltas: [],
    successorRumorIds: [],
    complicationRisk: 0,
    retryBehavior: 'fail',
  }
}

/**
 * Check if a faction conflict exists that could generate a quest.
 * Returns true if both factions are in the game and have opposing interests.
 */
export function hasConflictPotential(
  employerFactionId: string,
  enemyFactionId: string
): boolean {
  // Define known faction conflicts
  const KNOWN_CONFLICTS: Array<[string, string]> = [
    ['faction-civic-compact', 'faction-tallow-ring'],
    ['faction-gilded-court', 'faction-restored'],
    ['faction-foundry-league', 'faction-tallow-ring'],
    ['faction-civic-compact', 'faction-restored'],
  ]

  const normalizedEmployer = employerFactionId
  const normalizedEnemy = enemyFactionId

  return KNOWN_CONFLICTS.some(
    ([a, b]) =>
      (a === normalizedEmployer && b === normalizedEnemy) ||
      (a === normalizedEnemy && b === normalizedEmployer)
  )
}

/**
 * Generate quest leads for the contract board based on current world state.
 * This is called during endDay or when the contract board is refreshed.
 *
 * @param state - Current game state
 * @returns Array of quest leads ready for presentation
 */
export function generateQuestLeadsFromWorldState(
  _state: GameState
): Array<{ template: QuestTemplate; discoverySource: QuestDiscoverySource; discoveryDistrictId: string }> {
  // Placeholder: returns empty until faction tension/district state is tracked
  return []
}
