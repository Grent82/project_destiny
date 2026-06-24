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
            status: 'forming',
            members: [
              { npcId: 'npc-1', role: 'leader', contribution: 0, status: 'committed' },
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
            status: 'departed',
            members: [
              { npcId: 'npc-1', role: 'leader', contribution: 0, status: 'committed' },
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
    expect(coalition.progress).toBeGreaterThan(30)
    expect(coalition.progress).toBeLessThan(100) // Should not reach 100
  })

  it('transitions to returning when progress reaches 100%', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 5,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        activeCoalitions: [
          {
            id: 'test-coalition',
            status: 'departed',
            members: [
              { npcId: 'npc-1', role: 'leader', contribution: 0, status: 'committed' },
            ],
            formedDay: 3,
            targetSegment: 'main-corridor',
            difficulty: 1, // Low difficulty to ensure progress reaches 100
            progress: 90,
            estimatedReturnDay: 8,
          },
        ],
      },
    }
    const rng = () => 1 // Max progress
    const result = applyCoalitionLifecycle(state, rng)

    // Coalition transitions to returning and moves to history in same call
    expect(result.cityResources.activeCoalitions).toHaveLength(0)
    expect(result.cityResources.coalitionHistory).toHaveLength(1)
    expect(result.cityResources.coalitionHistory[0]!.status).toBe('returning')
  })

  it('moves returning coalition to history', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 5,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        activeCoalitions: [
          {
            id: 'test-coalition',
            status: 'returning',
            members: [
              { npcId: 'npc-1', role: 'leader', contribution: 0, status: 'committed' },
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
        corridorStatus: 'blocked',
        activeCoalitions: [
          {
            id: 'test-coalition',
            status: 'returning',
            members: [
              { npcId: 'npc-1', role: 'leader', contribution: 0, status: 'committed' },
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
            status: 'forming',
            members: [
              { npcId: 'npc-1', role: 'leader', contribution: 0, status: 'committed' },
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
      (e) => e.type === 'expedition-started' || e.type === 'expedition-complete'
    )
    expect(expeditionEvents.length).toBeGreaterThan(0)
  })
})
