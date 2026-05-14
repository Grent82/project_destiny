import type { GameState } from '../../domain'
import type { EventRumorTemplate, Rumor } from '../../domain/rumors/contracts'
import { contentCatalog } from '../content/contentCatalog'

export type CombatEventParams = {
  eventType: 'combat-victory' | 'combat-defeat'
  districtId: string
  enemyFactionId?: string | null
}

export type QuestEventParams = {
  eventType: 'quest-complete'
  districtId?: string | null
  questOutcomeType: 'quest-resolved' | 'captive-freed' | 'evidence-secured'
}

export type FactionMilestoneParams = {
  eventType: 'faction-milestone'
  factionId: string
  milestone: number
}

export type EventRumorParams = CombatEventParams | QuestEventParams | FactionMilestoneParams

/**
 * Stable key used for deduplication of faction-milestone rumors.
 * Stored as eventSource on the rumor instance.
 */
function factionMilestoneKey(factionId: string, milestone: number): string {
  return `evt-faction-${factionId}-m${milestone}`
}

/**
 * Find the best matching template for the given event params.
 * For combat: prefers faction-specific over generic (null enemyFactionId).
 * For quest: matches on questOutcomeType.
 * For faction-milestone: matches on factionId + milestone.
 */
function findTemplate(
  templates: EventRumorTemplate[],
  params: EventRumorParams,
): EventRumorTemplate | undefined {
  if (params.eventType === 'combat-victory' || params.eventType === 'combat-defeat') {
    const factionSpecific = templates.find(
      (t) =>
        t.eventType === params.eventType &&
        t.enemyFactionId === (params.enemyFactionId ?? null),
    )
    return (
      factionSpecific ??
      templates.find((t) => t.eventType === params.eventType && t.enemyFactionId === null)
    )
  }

  if (params.eventType === 'quest-complete') {
    return templates.find(
      (t) => t.eventType === 'quest-complete' && t.questOutcomeType === params.questOutcomeType,
    )
  }

  if (params.eventType === 'faction-milestone') {
    const { factionId, milestone } = params
    return templates.find(
      (t) =>
        t.eventType === 'faction-milestone' &&
        t.factionId === factionId &&
        t.milestone === milestone,
    )
  }

  return undefined
}

/**
 * Construct a Rumor instance from a matched template.
 * Returns null if the template produces an invalid district.
 */
export function buildEventRumorEntry(
  templates: EventRumorTemplate[],
  params: EventRumorParams,
  fallbackDistrictId: string,
  day: number,
): Rumor | null {
  const template = findTemplate(templates, params)
  if (!template) return null

  let districtId: string
  let rumorId: string

  if (params.eventType === 'combat-victory' || params.eventType === 'combat-defeat') {
    districtId = params.districtId
    rumorId = `evt-${params.eventType}-d${day}-${template.id}`
  } else if (params.eventType === 'quest-complete') {
    districtId = params.districtId ?? template.districtId ?? fallbackDistrictId
    rumorId = `evt-quest-${params.questOutcomeType}-d${day}`
  } else if (params.eventType === 'faction-milestone') {
    const { factionId, milestone } = params
    districtId = template.districtId ?? fallbackDistrictId
    rumorId = factionMilestoneKey(factionId, milestone)
  } else {
    return null
  }

  return {
    id: rumorId,
    kind: template.kind,
    source: 'generated',
    districtId,
    originNpcId: null,
    templateId: template.id,
    text: template.text,
    subjectNpcIds: template.subjectNpcIds,
    truth: 'mixed',
    credibility: template.credibility,
    heat: template.startingHeat,
    createdDay: day,
    lastSpreadDay: day,
    eventSource: rumorId,
  }
}

/**
 * Pure function: spawns a world-reaction rumor from a player-caused event.
 * Returns state unchanged if no matching template exists.
 * Faction-milestone events are deduplicated: a milestone fires at most once per playthrough.
 */
export function spawnEventRumor(state: GameState, params: EventRumorParams): GameState {
  // Deduplication for faction milestones
  if (params.eventType === 'faction-milestone') {
    const key = factionMilestoneKey(params.factionId, params.milestone)
    if (state.rumors.some((r) => r.eventSource === key)) return state
  }

  const rumor = buildEventRumorEntry(
    contentCatalog.eventRumorTemplates,
    params,
    state.currentDistrictId ?? 'district-the-pale',
    state.day,
  )
  if (!rumor) return state

  return { ...state, rumors: [...state.rumors, rumor] }
}
