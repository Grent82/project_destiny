import type { GameState } from '../../domain'
import type { EventOutcome } from '../../domain/events/contracts'
import { buildRelationshipKey, type RelationshipAxes } from '../../domain/relationships/contracts'
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
          const validDials = ['control', 'prosperity', 'unrest', 'corruption'] as const
          if (!validDials.includes(outcome.target as typeof validDials[number])) {
            console.warn(`applyEventOutcome: invalid dial target "${outcome.target}"`)
            break
          }
          const dial = outcome.target as typeof validDials[number]
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
      case 'adjustNpcRelationship':
        if (outcome.npcId && outcome.axis && outcome.delta !== undefined) {
          const key = buildRelationshipKey('player', outcome.npcId)
          const existing = next.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
          const axis = outcome.axis as keyof RelationshipAxes
          const newValue = Math.max(-100, Math.min(100, (existing[axis] ?? 0) + outcome.delta))
          next = {
            ...next,
            relationships: {
              ...next.relationships,
              [key]: { ...existing, [axis]: newValue },
            },
          }
        }
        break
    }
  }
  return next
}
