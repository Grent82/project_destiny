import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { runCorridorExpedition } from './runCorridorExpedition'

describe('runCorridorExpedition', () => {
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
      activeCoalitions: [
        {
          id: 'coalition-test',
          status: 'departed' as const,
          members: [
            { npcId: 'npc-1', role: 'leader' as const, contribution: 0, status: 'committed' as const },
            { npcId: 'npc-2', role: 'vanguard' as const, contribution: 0, status: 'committed' as const },
            { npcId: 'npc-3', role: 'support' as const, contribution: 0, status: 'committed' as const },
          ],
          formedDay: 1,
          targetSegment: 'main-corridor',
          difficulty: 5,
          progress: 0,
          estimatedReturnDay: 6,
        },
      ],
    },
  })

  it('returns state unchanged if coalition not found', () => {
    const state = makeStateWithCoalition()
    const rng = makeRng(42)
    const result = runCorridorExpedition(state, 'non-existent-coalition', rng)

    expect(result).toBe(state)
  })

  it('advances coalition progress on successful expedition', () => {
    const state = makeStateWithCoalition()
    const rng = makeRng(42)
    const result = runCorridorExpedition(state, 'coalition-test', rng)

    const coalition = result.cityResources.activeCoalitions[0]
    expect(coalition).toBeDefined()
    expect(coalition!.progress).toBeGreaterThan(0)
  })

  it('caps progress at 100', () => {
    const state = {
      ...makeStateWithCoalition(),
      cityResources: {
        ...makeStateWithCoalition().cityResources,
        activeCoalitions: [
          {
            ...makeStateWithCoalition().cityResources.activeCoalitions[0]!,
            progress: 90,
          },
        ],
      },
    }
    const rng = makeRng(42)
    const result = runCorridorExpedition(state, 'coalition-test', rng)

    const coalition = result.cityResources.activeCoalitions[0]
    expect(coalition!.progress).toBeLessThanOrEqual(100)
  })

  it('handles different difficulty levels', () => {
    const state = {
      ...makeStateWithCoalition(),
      cityResources: {
        ...makeStateWithCoalition().cityResources,
        activeCoalitions: [
          {
            ...makeStateWithCoalition().cityResources.activeCoalitions[0]!,
            difficulty: 10,
          },
        ],
      },
    }
    const rng = makeRng(42)
    const result = runCorridorExpedition(state, 'coalition-test', rng)

    const coalition = result.cityResources.activeCoalitions[0]
    expect(coalition).toBeDefined()
  })

  it('is deterministic with same RNG seed', () => {
    const state = makeStateWithCoalition()
    const rng1 = makeRng(123)
    const rng2 = makeRng(123)
    const result1 = runCorridorExpedition(state, 'coalition-test', rng1)
    const result2 = runCorridorExpedition(state, 'coalition-test', rng2)

    expect(result1.cityResources.activeCoalitions[0]!.progress).toBe(
      result2.cityResources.activeCoalitions[0]!.progress
    )
  })
})
