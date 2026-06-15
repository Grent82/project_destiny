import { buildRelationshipKey } from '../../domain/relationships/contracts'
import type { GameState } from '../../domain'
import type { EventTemplate } from '../../domain/events/contracts'
import { contentCatalog } from '../content/contentCatalog'
import type { Rng } from './seededRng'

function checkConditions(template: EventTemplate, state: GameState, rng: Rng): boolean {
  const cond = template.triggerConditions

  if (cond.minUnrest !== undefined && state.cityDials.unrest < cond.minUnrest) return false
  if (cond.maxUnrest !== undefined && state.cityDials.unrest > cond.maxUnrest) return false
  if (cond.minFoodSecurity !== undefined && state.cityResources.foodSecurity < cond.minFoodSecurity) return false
  if (cond.maxFoodSecurity !== undefined && state.cityResources.foodSecurity > cond.maxFoodSecurity) return false
  if (cond.corridorStatus !== undefined && state.cityResources.corridorStatus !== cond.corridorStatus) return false
  if (cond.dayMin !== undefined && state.day < cond.dayMin) return false
  if (cond.dayMax !== undefined && state.day > cond.dayMax) return false
  if (cond.currentDistrict !== undefined && state.currentDistrictId !== cond.currentDistrict) return false
  if (cond.activeQuestId !== undefined && !state.activeQuests.some((q) => q.questId === cond.activeQuestId)) return false
  if (cond.requiredRosterNpcId !== undefined && !state.roster.some((n) => n.npcId === cond.requiredRosterNpcId)) return false
  if (template.sourceNpcId != null && !state.roster.some((n) => n.npcId === template.sourceNpcId)) return false
  if (cond.maxCredits !== undefined && state.money > cond.maxCredits) return false
  if (cond.minRenown !== undefined && state.playerCharacter.renown < cond.minRenown) return false
  if (cond.debtPaid !== undefined && state.debtPaid !== cond.debtPaid) return false
  if (cond.minRosterSize !== undefined && state.roster.length < cond.minRosterSize) return false
  if (cond.completedQuestCountMin !== undefined && state.completedQuestIds.length < cond.completedQuestCountMin) return false
  if (cond.isFirstRun !== undefined && state.isFirstRun !== cond.isFirstRun) return false

  // Time slot check
  if (cond.timeSlot !== undefined && state.timeSlot !== cond.timeSlot) return false

  if (cond.npcRelationshipMin !== undefined) {
    const { npcId, axis, min } = cond.npcRelationshipMin
    const key = buildRelationshipKey('player', npcId)
    const rel = state.relationships[key]
    const value = rel ? rel[axis] : 0
    if (value < min) return false
  }

  // NPC state array check (multiple conditions on one or more NPCs)
  if (cond.npcState !== undefined) {
    for (const npcCond of cond.npcState) {
      const key = buildRelationshipKey('player', npcCond.npcId)
      const rel = state.relationships[key]
      const value = rel ? rel[npcCond.axis] : 0
      if (npcCond.min !== undefined && value < npcCond.min) return false
      if (npcCond.max !== undefined && value > npcCond.max) return false
    }
  }

  if (cond.factionStandingBelow) {
    const standing = state.factionStandings[cond.factionStandingBelow.factionId] ?? 0
    if (standing >= cond.factionStandingBelow.threshold) return false
  }
  if (cond.factionStandingAbove) {
    const standing = state.factionStandings[cond.factionStandingAbove.factionId] ?? 0
    if (standing < cond.factionStandingAbove.threshold) return false
  }

  if (rng() > (cond.probability ?? 1)) return false

  return true
}

function isOnCooldown(template: EventTemplate, state: GameState): boolean {
  const lastDay = state.lastFiredDay[template.id]
  if (lastDay === undefined) return false
  if (!(template.repeatable ?? false)) return true
  return state.day - lastDay < (template.cooldownDays ?? 7)
}

// Maximum regular (non-priority) events surfaced to the player per tick.
// Priority (isFirstRun tutorial) events are always included and do not count against this cap.
// Only events that actually become pending are recorded in lastFiredDay.
// Truncated events remain eligible and compete again next tick.
const MAX_REGULAR_EVENTS_PER_TICK = 5

export function evaluateEvents(state: GameState, rng: Rng = Math.random): GameState {
  const alreadyPending = new Set(state.pendingEvents.map((e) => e.eventId))
  const eligible: Array<{ eventId: string; isPriority: boolean }> = []

  for (const template of contentCatalog.events) {
    // Skip system-mode templates — they are pushed directly by their owning systems
    if (template.firingMode === 'system') continue
    if (alreadyPending.has(template.id)) continue
    if (isOnCooldown(template, state)) continue
    if (!checkConditions(template, state, rng)) continue
    const isPriority = template.triggerConditions.isFirstRun === true
    eligible.push({ eventId: template.id, isPriority })
  }

  if (eligible.length === 0) return state

  // Apply budget: all events consume RNG above; only a capped set becomes pending.
  const priorityEvents = eligible.filter((e) => e.isPriority)
  const regularEvents = eligible.filter((e) => !e.isPriority)
  const selectedRegular = regularEvents.slice(0, MAX_REGULAR_EVENTS_PER_TICK)
  const newPending: typeof state.pendingEvents = [
    ...priorityEvents.map((e) => ({ eventId: e.eventId, firedOnDay: state.day })),
    ...selectedRegular.map((e) => ({ eventId: e.eventId, firedOnDay: state.day })),
  ]

  // Only record lastFiredDay for events that actually became pending
  const newLastFiredDay: Record<string, number> = {}
  for (const e of [...priorityEvents, ...selectedRegular]) {
    newLastFiredDay[e.eventId] = state.day
  }

  return {
    ...state,
    pendingEvents: [...state.pendingEvents, ...newPending],
    lastFiredDay: { ...state.lastFiredDay, ...newLastFiredDay },
  }
}
