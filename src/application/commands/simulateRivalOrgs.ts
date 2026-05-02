import type { GameState } from '../../domain/game/contracts'
import { appendActivityLogEntry } from './activityLog'

export type RivalAction = {
  orgId: string
  actionType: 'expand' | 'recruit' | 'pressure' | 'bribe'
  targetFactionId?: string
  day: number
}

/**
 * Pure function: returns list of rival actions taken this day.
 * Called from endDay with injected random values for testability.
 */
export function simulateRivalOrgs(state: GameState, randoms: number[]): RivalAction[] {
  const actions: RivalAction[] = []
  const orgs = ['org-iron-covenant', 'org-pale-sisters']

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
      const factions = ['faction-tallow-ring', 'faction-civic-compact', 'faction-foundry-league']
      const target = factions[Math.floor((r * 100) % factions.length)]!
      actions.push({ orgId, actionType: 'bribe', targetFactionId: target, day: state.day })
    }
  })

  return actions
}

const ORG_NAMES: Record<string, string> = {
  'org-iron-covenant': 'The Iron Covenant',
  'org-pale-sisters': 'The Pale Sisters',
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
        `${orgName} moved against you. Standing with ${targetFaction.replace('faction-', '').replace(/-/g, ' ')} has fallen.`,
      )
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
