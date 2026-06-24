import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { applyCoalitionLifecycle } from './applyCoalitionLifecycle'

describe('applyCoalitionLifecycle', () => {
  const makeRng = (seed: number) => {
    let state = seed
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff
      return state / 0x7fffffff
    }
  }

  it('does nothing when no active coalitions', () => {
    const state = initialGameStateSnapshot
    const rng = makeRng(42)
    const result = applyCoalitionLifecycle(state, rng)

    expect(result.cityResources.activeCoalitions).toHaveLength(0)
  })

  it('transitions forming coalition to departed after 2 days', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 5,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        activeCoalitions: [
          {
            id: 'test-coalition',
            status: 'forming' as const,
            members: [
              { npcId: 'npc-1', role: 'leader' as const, contribution: 0, status: 'committed' as const },
            ],
            formedDay: 3,
            targetSegment: 'main-corridor',
            difficulty: 5,
            progress: 0,
            estimatedReturnDay: 8,
          },
        ],
      },
    }
    const rng = makeRng(42)
    const result = applyCoalitionLifecycle(state, rng)

    const coalition = result.cityResources.activeCoalitions[0]!
    expect(coalition.status).toBe('departed')
  })

  it('advances progress for departed coalitions', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 5,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        activeCoalitions: [
          {
            id: 'test-coalition',
            status: 'departed' as const,
            members: [
              { npcId: 'npc-1', role: 'leader' as const, contribution: 0, status: 'committed' as const },
            ],
            formedDay: 3,
            targetSegment: 'main-corridor',
            difficulty: 10, // High difficulty for minimal progress
            progress: 30,
            estimatedReturnDay: 8,
          },
        ],
      },
    }
    const rng = () => 0.5 // Medium progress
    const result = applyCoalitionLifecycle(state, rng)

    const coalition = result.cityResources.activeCoalitions[0]!
    // Progress should advance but not reach 100
    expect(coalition.progress).toBeGreaterThan(30)
    expect(coalition.progress).toBeLessThan(100)
  })

  it('moves completed coalition to history', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 5,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        activeCoalitions: [
          {
            id: 'test-coalition',
            status: 'returning' as const,
            members: [
              { npcId: 'npc-1', role: 'leader' as const, contribution: 0, status: 'committed' as const },
            ],
            formedDay: 3,
            targetSegment: 'main-corridor',
            difficulty: 5,
            progress: 100,
            estimatedReturnDay: 8,
          },
        ],
      },
    }
    const rng = makeRng(42)
    const result = applyCoalitionLifecycle(state, rng)

    expect(result.cityResources.activeCoalitions).toHaveLength(0)
    expect(result.cityResources.coalitionHistory).toHaveLength(1)
  })

  it('updates corridor status when coalition succeeds', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 5,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked' as const,
        activeCoalitions: [
          {
            id: 'test-coalition',
            status: 'returning' as const,
            members: [
              { npcId: 'npc-1', role: 'leader' as const, contribution: 0, status: 'committed' as const },
            ],
            formedDay: 3,
            targetSegment: 'main-corridor',
            difficulty: 5,
            progress: 100,
            estimatedReturnDay: 8,
          },
        ],
      },
    }
    const rng = makeRng(42)
    const result = applyCoalitionLifecycle(state, rng)

    expect(result.cityResources.corridorStatus).toBe('disrupted')
  })

  it('publishes expedition events during lifecycle', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 5,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        activeCoalitions: [
          {
            id: 'test-coalition',
            status: 'forming' as const,
            members: [
              { npcId: 'npc-1', role: 'leader' as const, contribution: 0, status: 'committed' as const },
            ],
            formedDay: 3,
            targetSegment: 'main-corridor',
            difficulty: 5,
            progress: 0,
            estimatedReturnDay: 8,
          },
        ],
      },
    }
    const rng = makeRng(42)
    const result = applyCoalitionLifecycle(state, rng)

    const expeditionEvents = result.worldEvents.filter(
      (e: { type: string }) => e.type === 'expedition-started' || e.type === 'expedition-complete'
    )
    // Should have at least expedition-started event
    expect(expeditionEvents.length).toBeGreaterThanOrEqual(1)
  })

  it('removes concluded coalitions from active', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 5,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        activeCoalitions: [
          {
            id: 'test-coalition',
            status: 'concluded' as const,
            members: [
              { npcId: 'npc-1', role: 'leader' as const, contribution: 0, status: 'dead' as const },
            ],
            formedDay: 1,
            targetSegment: 'main-corridor',
            difficulty: 10,
            progress: 50,
            estimatedReturnDay: 8,
          },
        ],
      },
    }
    const rng = makeRng(42)
    const result = applyCoalitionLifecycle(state, rng)

    expect(result.cityResources.activeCoalitions).toHaveLength(0)
    expect(result.cityResources.coalitionHistory).toHaveLength(1)
  })
})
