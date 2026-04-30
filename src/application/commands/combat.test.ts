import { describe, expect, it, vi } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { initialStateWithIda } from './testFixtures'
import {
  concludeCombatEncounter,
  performCombatAction,
  startCombatEncounter,
} from './combat'

describe('combat commands', () => {
  it('starts a seeded combat encounter from the selected squad', () => {
    // Use initialStateWithIda so we have 2 NPC allies + player → 3 allies + 2 enemies = 5 combatants
    const state = { ...initialStateWithIda, selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'] }
    const nextState = startCombatEncounter(state)

    expect(nextState.activeCombat).not.toBeNull()
    expect(nextState.activeCombat?.combatants).toHaveLength(5)
    expect(nextState.activeCombat?.range).toBe('distant')
    expect(nextState.activeCombat?.outcome).toBe('ongoing')
    expect(nextState.activityLog[0]?.message).toMatch(/moves out.*hostile patrol|hostile patrol stands in the way/i)
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
    // Mock Math.random to guarantee a hit (low value = below accuracy threshold)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)

    const nextState = performCombatAction(startedState, 'attack')

    vi.restoreAllMocks()

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
