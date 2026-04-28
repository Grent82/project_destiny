import { describe, it, expect, vi, afterEach } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { concludeCombatEncounter, startCombatEncounter } from './combat'

describe('enemy flip recruitment', () => {
  afterEach(() => vi.restoreAllMocks())

  it('adds a recruitableOnDefeat enemy to availableForHire after combat victory', () => {
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

    // Force Math.random to deterministically pick the first eligible recruit
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const nextState = concludeCombatEncounter(resolvedState)

    const combatOffers = nextState.availableForHire.filter((o) => o.source === 'combat')
    expect(combatOffers).toHaveLength(1)
    expect(combatOffers[0]?.source).toBe('combat')
    expect(combatOffers[0]?.turnsAvailable).toBe(3)
  })

  it('does not add non-recruitable enemies when already defeated earlier', () => {
    const startedState = startCombatEncounter(initialGameStateSnapshot)
    const resolvedState = {
      ...startedState,
      activeCombat: startedState.activeCombat
        ? {
            ...startedState.activeCombat,
            outcome: 'defeat' as const,
            activeCombatantId: null,
          }
        : null,
    }

    const nextState = concludeCombatEncounter(resolvedState)

    // On defeat, no recruitable enemies are added
    const combatOffers = nextState.availableForHire.filter((o) => o.source === 'combat')
    expect(combatOffers).toHaveLength(0)
  })
})
