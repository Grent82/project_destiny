import { describe, expect, it } from 'vitest'

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
    expect(nextState.activeCombat?.range).toBe('medium')
    expect(nextState.activeCombat?.outcome).toBe('ongoing')
    expect(nextState.activityLog[0]?.message).toMatch(/moves out.*hostile patrol|hostile patrol stands in the way/i)
  })

  it('does not heal wounded allies when combat starts', () => {
    const state = {
      ...initialStateWithIda,
      selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === 'npc-ida-rhys'
          ? { ...npc, states: { ...npc.states, health: 32 } }
          : npc,
      ),
    }

    const nextState = startCombatEncounter(state)
    const allyCombatant = nextState.activeCombat?.combatants.find(
      (combatant) => combatant.sourceNpcId === 'npc-ida-rhys',
    )
    const rosterEntry = nextState.roster.find((npc) => npc.npcId === 'npc-ida-rhys')

    expect(allyCombatant?.health).toBe(32)
    expect(allyCombatant?.maxHealth).toBe(32)
    expect(rosterEntry?.states.health).toBe(32)
  })

  it('uses stored player combat state when combat starts', () => {
    const state = {
      ...initialGameStateSnapshot,
      playerCharacter: {
        ...initialGameStateSnapshot.playerCharacter,
        combatState: {
          health: 57,
          morale: 66,
          injury: 18,
        },
      },
    }

    const nextState = startCombatEncounter(state)
    const playerCombatant = nextState.activeCombat?.combatants.find(
      (combatant) => combatant.combatantId === 'player',
    )

    expect(playerCombatant?.health).toBe(57)
    expect(playerCombatant?.morale).toBe(66)
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

  it('reproduces the same combat step from the same seed', () => {
    const startedState = startCombatEncounter(initialGameStateSnapshot)

    const firstRun = performCombatAction(startedState, 'attack')
    const secondRun = performCombatAction(startedState, 'attack')

    expect(firstRun.activeCombat).toEqual(secondRun.activeCombat)
    expect(firstRun.rngSeed).toBe(secondRun.rngSeed)
  })

  it('advances rngSeed after resolving a combat step', () => {
    const startedState = startCombatEncounter(initialGameStateSnapshot)
    const nextState = performCombatAction(startedState, 'attack')

    expect(nextState.rngSeed).not.toBe(startedState.rngSeed)
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
