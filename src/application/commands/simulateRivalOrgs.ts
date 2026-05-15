import type { GameState } from '../../domain/game/contracts'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'

export type RivalAction = {
  orgId: string
  actionType: 'expand' | 'recruit' | 'pressure' | 'bribe'
  targetFactionId?: string
  day: number
}

const RIVAL_ORG_IDS = [
  'rival-org-gilded-hand',
  'rival-org-ashen-compact',
  'org-iron-covenant',
  'org-pale-sisters',
] as const

const RIVAL_COUNTER_QUEST_IDS: Record<string, string> = {
  'rival-org-gilded-hand': 'quest-rival-gilded-hand-counter',
  'rival-org-ashen-compact': 'quest-rival-ashen-compact-counter',
  'org-iron-covenant': 'quest-rival-iron-covenant-counter',
  'org-pale-sisters': 'quest-rival-pale-sisters-counter',
}

const RIVAL_COUNTER_EVENT_IDS: Record<string, string> = {
  'rival-org-gilded-hand': 'event-rival-gilded-hand-counter-lead',
  'rival-org-ashen-compact': 'event-rival-ashen-compact-counter-lead',
  'org-iron-covenant': 'event-rival-iron-covenant-counter-lead',
  'org-pale-sisters': 'event-rival-pale-sisters-counter-lead',
}

const RIVAL_BRIBE_EVENT_IDS: Record<string, string> = {
  'rival-org-gilded-hand': 'event-rival-gilded-hand-bribe-warning',
  'rival-org-ashen-compact': 'event-rival-ashen-compact-bribe-warning',
  'org-iron-covenant': 'event-rival-iron-covenant-bribe-warning',
  'org-pale-sisters': 'event-rival-pale-sisters-bribe-warning',
}

/**
 * Pure function: returns list of rival actions taken this day.
 * Called from endDay with injected random values for testability.
 * randoms[i] selects the action; randoms[i + orgs.length] selects the bribe target faction.
 */
export function simulateRivalOrgs(state: GameState, randoms: number[]): RivalAction[] {
  const actions: RivalAction[] = []
  const orgs = [...RIVAL_ORG_IDS]
  const factionIds = contentCatalog.factions.map((f) => f.id)

  orgs.forEach((orgId, i) => {
    const r = randoms[i] ?? 0.5
    const playerStanding = state.cityStability ?? 60

    if (r < 0.10) {
      actions.push({ orgId, actionType: 'expand', day: state.day })
    } else if (r < 0.22) {
      actions.push({ orgId, actionType: 'recruit', day: state.day })
    } else if (r < 0.40 && playerStanding < 40) {
      actions.push({ orgId, actionType: 'pressure', day: state.day })
    } else if (r < 0.48) {
      const bribeRng = randoms[orgs.length + i] ?? 0.5
      const target = factionIds[Math.floor(bribeRng * factionIds.length)] ?? factionIds[0]!
      actions.push({ orgId, actionType: 'bribe', targetFactionId: target, day: state.day })
    }
  })

  return actions
}

const ORG_NAMES: Record<string, string> = {
  'rival-org-gilded-hand': 'The Gilded Hand',
  'rival-org-ashen-compact': 'The Ashen Compact',
  'org-iron-covenant': 'The Iron Covenant',
  'org-pale-sisters': 'The Pale Sisters',
}

function formatFactionName(factionId: string) {
  return factionId
    .replace('faction-', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function resolveLeadDelayDays(action: RivalAction) {
  const signature = `${action.orgId}:${action.actionType}:${action.day}`
  const checksum = Array.from(signature).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return 1 + (checksum % 3)
}

function hasPendingEvent(state: GameState, eventId: string) {
  return state.pendingEvents.some((event) => event.eventId === eventId)
}

function hasLiveCounterLeadForOrg(state: GameState, orgId: string) {
  const questId = RIVAL_COUNTER_QUEST_IDS[orgId]
  if (!questId) return false

  return (
    state.availableQuestLeads.some((lead) => lead.questId === questId) ||
    state.activeQuests.some((quest) => quest.questId === questId && quest.status === 'active') ||
    hasPendingEvent(state, RIVAL_COUNTER_EVENT_IDS[orgId])
  )
}

function schedulePendingEvent(state: GameState, eventId: string, firedOnDay: number) {
  if (hasPendingEvent(state, eventId)) return state

  return {
    ...state,
    pendingEvents: [...state.pendingEvents, { eventId, firedOnDay }],
  }
}

function scheduleCounterLeadEvent(state: GameState, action: RivalAction) {
  const eventId = RIVAL_COUNTER_EVENT_IDS[action.orgId]
  if (!eventId || hasLiveCounterLeadForOrg(state, action.orgId)) return state

  return schedulePendingEvent(state, eventId, state.day + resolveLeadDelayDays(action))
}

/**
 * Apply rival actions to game state immutably.
 */
export function applyRivalActions(state: GameState, actions: RivalAction[]): GameState {
  let next = state

  for (const action of actions) {
    const newActions = [...next.rivalOrgActions, action]
    if (newActions.length > 20) {
      newActions.shift()
    }
    next = { ...next, rivalOrgActions: newActions }

    if (action.actionType === 'expand') {
      next = { ...next, cityStability: Math.max(0, (next.cityStability ?? 60) - 3) }
      next = appendActivityLogEntry(
        next,
        'system',
        `${ORG_NAMES[action.orgId] ?? action.orgId} have expanded their reach in the city.`,
      )
      next = scheduleCounterLeadEvent(next, action)
    } else if (action.actionType === 'pressure') {
      next = { ...next, cityStability: Math.max(0, (next.cityStability ?? 60) - 5) }
      next = appendActivityLogEntry(
        next,
        'system',
        'Pressure mounts in the streets. The city grows restless.',
      )
    } else if (action.actionType === 'recruit') {
      // Rival org poaches one available hire before you can get to them
      if (next.availableForHire.length > 0) {
        const poached = next.availableForHire[0]!
        next = {
          ...next,
          availableForHire: next.availableForHire.slice(1),
        }
        const orgName = ORG_NAMES[action.orgId] ?? action.orgId
        next = appendActivityLogEntry(
          next,
          'system',
          `${orgName} made their offer first. A potential hire has joined their ranks instead.`,
        )
        void poached // used implicitly
      }
      next = scheduleCounterLeadEvent(next, action)
    } else if (action.actionType === 'bribe') {
      // Rival org bribes a faction contact — standing with a faction drops
      const targetFaction = action.targetFactionId ?? 'faction-tallow-ring'
      const current = next.factionStandings[targetFaction] ?? 0
      next = {
        ...next,
        factionStandings: {
          ...next.factionStandings,
          [targetFaction]: Math.max(-100, current - 5),
        },
      }
      const orgName = ORG_NAMES[action.orgId] ?? action.orgId
      next = appendActivityLogEntry(
        next,
        'system',
        `${orgName} moved against you. Standing with ${formatFactionName(targetFaction)} has fallen.`,
      )
      const bribeEventId = RIVAL_BRIBE_EVENT_IDS[action.orgId]
      if (bribeEventId) {
        next = schedulePendingEvent(next, bribeEventId, state.day)
      }
    }
  }

  // City stability natural recovery: +1/day if no pressure or expand actions
  const hasPressure = actions.some(
    (a) => a.actionType === 'pressure' || a.actionType === 'expand',
  )
  if (!hasPressure) {
    next = { ...next, cityStability: Math.min(100, (next.cityStability ?? 60) + 1) }
  }

  return next
}
