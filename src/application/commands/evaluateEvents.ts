import type { GameState } from '../../domain'
import type { EventTemplate } from '../../domain/events/contracts'
import { contentCatalog } from '../content/contentCatalog'

function checkConditions(template: EventTemplate, state: GameState): boolean {
  const cond = template.triggerConditions

  if (cond.minUnrest !== undefined && state.cityDials.unrest < cond.minUnrest) return false
  if (cond.maxUnrest !== undefined && state.cityDials.unrest > cond.maxUnrest) return false
  if (cond.minFoodSecurity !== undefined && state.cityResources.foodSecurity < cond.minFoodSecurity) return false
  if (cond.maxFoodSecurity !== undefined && state.cityResources.foodSecurity > cond.maxFoodSecurity) return false
  if (cond.corridorStatus !== undefined && state.cityResources.corridorStatus !== cond.corridorStatus) return false
  if (cond.dayMin !== undefined && state.day < cond.dayMin) return false
  if (cond.currentDistrict !== undefined && state.currentDistrictId !== cond.currentDistrict) return false
  if (cond.activeQuestId !== undefined && !state.activeQuests.some((q) => q.questId === cond.activeQuestId)) return false

  if (cond.factionStandingBelow) {
    const standing = state.factionStandings[cond.factionStandingBelow.factionId] ?? 0
    if (standing >= cond.factionStandingBelow.threshold) return false
  }
  if (cond.factionStandingAbove) {
    const standing = state.factionStandings[cond.factionStandingAbove.factionId] ?? 0
    if (standing < cond.factionStandingAbove.threshold) return false
  }

  if (Math.random() > (cond.probability ?? 1)) return false

  return true
}

function isOnCooldown(template: EventTemplate, state: GameState): boolean {
  const lastDay = state.lastFiredDay[template.id]
  if (lastDay === undefined) return false
  if (!template.repeatable) return true
  return state.day - lastDay < template.cooldownDays
}

export function evaluateEvents(state: GameState): GameState {
  const alreadyPending = new Set(state.pendingEvents.map((e) => e.eventId))
  const newPending: typeof state.pendingEvents = []
  const newLastFiredDay: Record<string, number> = {}

  for (const template of contentCatalog.events) {
    if (alreadyPending.has(template.id)) continue
    if (isOnCooldown(template, state)) continue
    if (checkConditions(template, state)) {
      newPending.push({ eventId: template.id, firedOnDay: state.day })
      newLastFiredDay[template.id] = state.day
    }
  }

  if (newPending.length === 0) return state

  return {
    ...state,
    pendingEvents: [...state.pendingEvents, ...newPending],
    lastFiredDay: { ...state.lastFiredDay, ...newLastFiredDay },
  }
}
