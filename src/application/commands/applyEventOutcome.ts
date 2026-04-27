import type { GameState } from '../../domain'
import type { EventOutcome } from '../../domain/events/contracts'
import { appendActivityLogEntry } from './activityLog'

export function applyOutcomes(state: GameState, outcomes: EventOutcome[]): GameState {
  let next = state
  for (const outcome of outcomes) {
    switch (outcome.type) {
      case 'adjustFactionStanding':
        if (outcome.target && outcome.delta !== undefined) {
          const current = next.factionStandings[outcome.target] ?? 0
          next = {
            ...next,
            factionStandings: {
              ...next.factionStandings,
              [outcome.target]: Math.max(-100, Math.min(100, current + outcome.delta)),
            },
          }
        }
        break
      case 'adjustCityDial':
        if (outcome.target && outcome.delta !== undefined) {
          const dial = outcome.target as keyof typeof next.cityDials
          next = {
            ...next,
            cityDials: {
              ...next.cityDials,
              [dial]: Math.max(0, Math.min(100, next.cityDials[dial] + outcome.delta)),
            },
          }
        }
        break
      case 'adjustCityResource':
        if (outcome.target && outcome.delta !== undefined) {
          const resource = outcome.target as 'foodSecurity' | 'waterAccess' | 'materialStock'
          next = {
            ...next,
            cityResources: {
              ...next.cityResources,
              [resource]: Math.max(0, Math.min(100, next.cityResources[resource] + outcome.delta)),
            },
          }
        }
        break
      case 'addCredits':
        if (outcome.delta !== undefined) {
          next = { ...next, money: Math.max(0, next.money + outcome.delta) }
        }
        break
      case 'setCorridorStatus':
        if (outcome.value) {
          next = {
            ...next,
            cityResources: {
              ...next.cityResources,
              corridorStatus: outcome.value as 'open' | 'disrupted' | 'blocked',
            },
          }
        }
        break
      case 'addActivityLogEntry':
        if (outcome.message) {
          next = appendActivityLogEntry(next, 'system', outcome.message)
        }
        break
    }
  }
  return next
}
