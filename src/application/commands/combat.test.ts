import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import {
  concludeCombatEncounter,
  performCombatAction,
  startCombatEncounter,
} from './combat'

describe('combat commands', () => {
  it('starts a seeded combat encounter from the selected squad', () => {
    const nextState = startCombatEncounter(initialGameStateSnapshot)

    expect(nextState.activeCombat).not.toBeNull()
    expect(nextState.activeCombat?.combatants).toHaveLength(4)
    expect(nextState.activeCombat?.range).toBe('distant')
    expect(nextState.activeCombat?.outcome).toBe('ongoing')
    expect(nextState.activityLog[0]?.message).toMatch(/deploys into a hostile patrol encounter/i)
  })

  it('does not start combat without a selected squad', () => {
    const state = {
      ...initialGameStateSnapshot,
      selectedSquadNpcIds: [],
    }

    const nextState = startCombatEncounter(state)

    expect(nextState).toEqual(state)
  })

  it('resolves a player action and advances the encounter state', () => {
    const startedState = startCombatEncounter(initialGameStateSnapshot)

    const nextState = performCombatAction(startedState, 'attack')

    expect(nextState.activeCombat).not.toBeNull()
    expect(nextState.activeCombat?.log.length).toBeGreaterThan(
      startedState.activeCombat?.log.length ?? 0,
    )
    expect(nextState.activeCombat?.combatants.some((combatant) => combatant.health < combatant.maxHealth)).toBe(true)
    expect(nextState.activityLog[0]?.category).toBe('combat')
  })

  it('leaves state unchanged when no active combat exists', () => {
    const nextState = performCombatAction(initialGameStateSnapshot, 'attack')

    expect(nextState).toEqual(initialGameStateSnapshot)
  })

  it('concludes a resolved encounter and clears the active combat state', () => {
    const startedState = startCombatEncounter(initialGameStateSnapshot)
    const resolvedState = {
      ...startedState,
      activeCombat: startedState.activeCombat
        ? {
            ...startedState.activeCombat,
            outcome: 'victory' as const,
            activeCombatantId: null,
          }
        : null,
    }

    const nextState = concludeCombatEncounter(resolvedState)

    expect(nextState.activeCombat).toBeNull()
    expect(nextState.activityLog[0]?.message).toMatch(/encounter is concluded/i)
  })
})
