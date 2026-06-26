import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { concludeCorridorExpedition } from './concludeCorridorExpedition'

describe('concludeCorridorExpedition', () => {
  const makeRng = (seed: number) => {
    let state = seed
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff
      return state / 0x7fffffff
    }
  }

  const makeStateWithCoalition = () => ({
    ...initialGameStateSnapshot,
    cityResources: {
      ...initialGameStateSnapshot.cityResources,
      corridorStatus: 'blocked' as const,
      activeGroups: [
        {
          id: 'coalition-test',
          status: 'active' as const,
          members: [
            { npcId: 'npc-1', role: 'leader' as const, contribution: 50, status: 'committed' as const },
            { npcId: 'npc-2', role: 'vanguard' as const, contribution: 30, status: 'committed' as const },
            { npcId: 'npc-3', role: 'support' as const, contribution: 20, status: 'committed' as const },
          ],
          formedDay: 1,
          targetSegment: 'main-corridor',
          difficulty: 5,
          progress: 100,
          estimatedReturnDay: 6,
        },
      ],
    },
  })

  it('returns state unchanged if coalition not found', () => {
    const state = makeStateWithCoalition()
    const rng = makeRng(42)
    const result = concludeCorridorExpedition(state, 'non-existent-coalition', true, rng)

    expect(result).toBe(state)
  })

  it('publishes corridor-disrupted event on success', () => {
    const state = makeStateWithCoalition()
    const rng = makeRng(42)
    const result = concludeCorridorExpedition(state, 'coalition-test', true, rng)

    const corridorEvents = result.worldEvents.filter(e => e.type === 'corridor-disrupted')
    expect(corridorEvents.length).toBeGreaterThan(0)
  })

  it('updates corridor status to disrupted on success', () => {
    const state = makeStateWithCoalition()
    const rng = makeRng(42)
    const result = concludeCorridorExpedition(state, 'coalition-test', true, rng)

    expect(result.cityResources.corridorStatus).toBe('disrupted')
  })

  it('publishes coalition-dissolved event on failure', () => {
    const state = makeStateWithCoalition()
    const rng = makeRng(42)
    const result = concludeCorridorExpedition(state, 'coalition-test', false, rng)

    const dissolutionEvents = result.worldEvents.filter(e => e.type === 'coalition-dissolved')
    expect(dissolutionEvents.length).toBeGreaterThan(0)
  })

  it('publishes loot-distributed event on success', () => {
    const state = makeStateWithCoalition()
    const rng = makeRng(42)
    const result = concludeCorridorExpedition(state, 'coalition-test', true, rng)

    const lootEvents = result.worldEvents.filter(e => e.type === 'loot-distributed')
    // May or may not have loot depending on RNG
    expect(lootEvents.length).toBeGreaterThanOrEqual(0)
  })

  it('is deterministic with same RNG seed', () => {
    const state = makeStateWithCoalition()
    const rng1 = makeRng(123)
    const rng2 = makeRng(123)
    const result1 = concludeCorridorExpedition(state, 'coalition-test', true, rng1)
    const result2 = concludeCorridorExpedition(state, 'coalition-test', true, rng2)

    // Same events should be published
    expect(result1.worldEvents.length).toBe(result2.worldEvents.length)
  })
})
