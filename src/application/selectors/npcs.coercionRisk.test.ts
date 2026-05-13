/**
 * Tests for NPC coercion-risk / vulnerability protection system (destiny-w4nr).
 */

import { describe, it, expect } from 'vitest'
import { selectNpcCoercionRisk, selectNpcResilienceLabel } from './npcs'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import type { GameState } from '../../domain/game/contracts'

/** Build a minimal NPC override for coercionRisk tests */
function makeNpc(
  overrides: { resolve?: number; fear?: number; dominance?: number; loyalty?: number } = {}
): NpcRuntimeState {
  const base = initialGameStateSnapshot.roster[0]!
  return {
    ...base,
    attributes: { ...base.attributes, resolve: overrides.resolve ?? 50 },
    states: { ...base.states, fear: overrides.fear ?? 0 },
    traits: { ...base.traits, dominance: overrides.dominance ?? 50, loyalty: overrides.loyalty ?? 50 },
  }
}

const SQUAD_NPC = 'npc-marion-vale'

describe('selectNpcCoercionRisk', () => {
  it('returns 0.5 for an average NPC (all 50s)', () => {
    const npc = makeNpc({ resolve: 50, fear: 50, dominance: 50, loyalty: 50 })
    // ((50)*0.4 + 50*0.3 + (50)*0.2 + 50*0.1) / 100 = (20+15+10+5)/100 = 50/100 = 0.5
    expect(selectNpcCoercionRisk(npc)).toBeCloseTo(0.5, 5)
  })

  it('returns near 1.0 for maximally vulnerable NPC', () => {
    const npc = makeNpc({ resolve: 0, fear: 100, dominance: 0, loyalty: 100 })
    // ((100)*0.4 + 100*0.3 + (100)*0.2 + 100*0.1) / 100 = (40+30+20+10)/100 = 1.0
    expect(selectNpcCoercionRisk(npc)).toBeCloseTo(1.0, 5)
  })

  it('returns 0.0 for maximally resilient NPC', () => {
    const npc = makeNpc({ resolve: 100, fear: 0, dominance: 100, loyalty: 0 })
    // ((0)*0.4 + 0*0.3 + (0)*0.2 + 0*0.1) / 100 = 0
    expect(selectNpcCoercionRisk(npc)).toBeCloseTo(0.0, 5)
  })

  it('high resolve NPC has lower risk than low resolve NPC', () => {
    const resilient = makeNpc({ resolve: 90, fear: 10, dominance: 70, loyalty: 20 })
    const vulnerable = makeNpc({ resolve: 10, fear: 80, dominance: 20, loyalty: 80 })
    expect(selectNpcCoercionRisk(resilient)).toBeLessThan(selectNpcCoercionRisk(vulnerable))
  })

  it('high fear increases risk', () => {
    const low = makeNpc({ fear: 10 })
    const high = makeNpc({ fear: 90 })
    expect(selectNpcCoercionRisk(high)).toBeGreaterThan(selectNpcCoercionRisk(low))
  })
})

describe('selectNpcResilienceLabel', () => {
  it('labels resilient NPC correctly', () => {
    const npc = makeNpc({ resolve: 100, fear: 0, dominance: 100, loyalty: 0 })
    expect(selectNpcResilienceLabel(npc)).toBe('resilient')
  })

  it('labels average NPC as at risk', () => {
    const npc = makeNpc({ resolve: 50, fear: 50, dominance: 50, loyalty: 50 })
    expect(selectNpcResilienceLabel(npc)).toBe('at risk')
  })

  it('labels maximally vulnerable NPC correctly', () => {
    const npc = makeNpc({ resolve: 0, fear: 100, dominance: 0, loyalty: 100 })
    expect(selectNpcResilienceLabel(npc)).toBe('vulnerable')
  })
})

describe('captivity degradation uses coercionRisk', () => {
  function makeCaptiveState(resolve: number, fear: number): GameState {
    return {
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((n) =>
        n.npcId === SQUAD_NPC
          ? {
              ...n,
              attributes: { ...n.attributes, resolve },
              states: { ...n.states, fear },
              captivityState: {
                status: 'captive' as const,
                holderId: null,
                timeHeldDays: 0,
                condition: 'healthy' as const,
                compliance: 'resistant' as const,
                bondType: 'none' as const,
                questTag: null,
              },
            }
          : n,
      ) as NpcRuntimeState[],
    }
  }

  it('resilient NPC (high resolve) does not degrade in 4 days', () => {
    const state = makeCaptiveState(100, 0)
    const store = createGameStore(state)
    // Full threshold is 7 days — 4 days should not trigger
    for (let i = 0; i < 4; i++) store.dispatch(gameActions.endDay())
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!
    expect(npc.captivityState?.condition).toBe('healthy')
  })

  it('vulnerable NPC (low resolve, high fear) degrades faster', () => {
    // Halved threshold = ~3-4 days for vulnerable NPC
    const state = makeCaptiveState(0, 100)
    const store = createGameStore(state)
    // 4 days should trigger degradation at halved threshold (3)
    for (let i = 0; i < 4; i++) store.dispatch(gameActions.endDay())
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!
    expect(npc.captivityState?.condition).not.toBe('healthy')
  })
})

describe('rescueNpc uses coercionRisk', () => {
  it('vulnerable NPC suffers heavier recovery penalty', () => {
    const makeRescuable = (resolve: number): GameState => ({
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((n) =>
        n.npcId === SQUAD_NPC
          ? {
              ...n,
              attributes: { ...n.attributes, resolve },
              states: { ...n.states, health: 80, stress: 20, morale: 80 },
              captivityState: {
                status: 'captive' as const,
                holderId: null,
                timeHeldDays: 14,
                condition: 'broken' as const,
                compliance: 'resistant' as const,
                bondType: 'fear' as const,
                questTag: null,
              },
            }
          : n,
      ) as NpcRuntimeState[],
    })

    const resilientStore = createGameStore(makeRescuable(100))
    const vulnerableStore = createGameStore(makeRescuable(0))

    resilientStore.dispatch(gameActions.rescueNpc({ npcId: SQUAD_NPC }))
    vulnerableStore.dispatch(gameActions.rescueNpc({ npcId: SQUAD_NPC }))

    const resilientHealth = resilientStore.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!.states.health
    const vulnerableHealth = vulnerableStore.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!.states.health

    // Vulnerable NPC should have lower health after rescue (heavier penalty)
    expect(vulnerableHealth).toBeLessThanOrEqual(resilientHealth)
  })

  it('rescued NPC is assigned to recovering', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((n) =>
        n.npcId === SQUAD_NPC
          ? {
              ...n,
              captivityState: {
                status: 'captive' as const,
                holderId: null,
                timeHeldDays: 3,
                condition: 'healthy' as const,
                compliance: 'resistant' as const,
                bondType: 'none' as const,
                questTag: null,
              },
            }
          : n,
      ) as NpcRuntimeState[],
    }
    const store = createGameStore(state)
    store.dispatch(gameActions.rescueNpc({ npcId: SQUAD_NPC }))
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!
    expect(npc.assignment).toBe('recovering')
    expect(npc.captivityState?.status).toBe('rescued')
  })
})
