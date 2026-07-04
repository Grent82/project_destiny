/**
 * Tests for grief and bereavement system (destiny-m0p1).
 */

import { describe, it, expect } from 'vitest'
import {
  deriveGriefState,
  deriveGriefMoraleModifier,
  writeLossMemories,
  GRIEF_INITIAL_INTENSITY,
  GRIEF_DECAY_PER_DAY,
} from './grief'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

const SQUAD_NPC = 'npc-marion-vale'

function npcWith(overrides: Partial<NpcRuntimeState>): NpcRuntimeState {
  return { ...initialGameStateSnapshot.npcRuntimeStates[0]!, ...overrides }
}

describe('deriveGriefState', () => {
  it('returns null when no loss memories', () => {
    const npc = npcWith({ npcMemory: [] })
    expect(deriveGriefState(npc, 10)).toBeNull()
  })

  it('returns active grief when loss memory is recent', () => {
    const npc = npcWith({
      npcMemory: [{ day: 5, event: 'loss', eventType: 'custom', visibility: 'open', sentiment: 'negative', participants: ['npc-other'] }],
    })
    const grief = deriveGriefState(npc, 7)
    expect(grief).not.toBeNull()
    expect(grief?.lostNpcId).toBe('npc-other')
    expect(grief?.intensity).toBeGreaterThan(0)
    expect(grief?.intensity).toBeLessThanOrEqual(GRIEF_INITIAL_INTENSITY)
  })

  it('decays grief intensity over time', () => {
    const npc = npcWith({
      npcMemory: [{ day: 0, event: 'loss', eventType: 'custom', visibility: 'open', sentiment: 'negative', participants: ['npc-other'] }],
    })
    const earlyGrief = deriveGriefState(npc, 1)
    const laterGrief = deriveGriefState(npc, 10)
    expect(earlyGrief!.intensity).toBeGreaterThan(laterGrief!.intensity)
  })

  it('returns null when grief fully decayed', () => {
    const npc = npcWith({
      npcMemory: [{ day: 0, event: 'loss', eventType: 'custom', visibility: 'open', sentiment: 'negative', participants: ['npc-other'] }],
    })
    const fadedDays = Math.ceil(GRIEF_INITIAL_INTENSITY / GRIEF_DECAY_PER_DAY) + 1
    expect(deriveGriefState(npc, fadedDays)).toBeNull()
  })

  it('ignores non-loss memory events', () => {
    const npc = npcWith({
      npcMemory: [{ day: 5, event: 'conversation', eventType: 'custom', visibility: 'open', sentiment: 'neutral', participants: ['npc-other'] }],
    })
    expect(deriveGriefState(npc, 7)).toBeNull()
  })
})

describe('deriveGriefMoraleModifier', () => {
  it('returns 0 for no grief', () => {
    expect(deriveGriefMoraleModifier(null)).toBe(0)
  })

  it('returns negative value for active grief', () => {
    const mod = deriveGriefMoraleModifier({
      lostNpcId: 'npc-x',
      lostOnDay: 1,
      intensity: GRIEF_INITIAL_INTENSITY,
    })
    expect(mod).toBeLessThan(0)
    expect(mod).toBeGreaterThanOrEqual(-25)
  })

  it('returns value proportional to intensity', () => {
    const fullMod = deriveGriefMoraleModifier({ lostNpcId: 'x', lostOnDay: 0, intensity: GRIEF_INITIAL_INTENSITY })
    const halfMod = deriveGriefMoraleModifier({ lostNpcId: 'x', lostOnDay: 0, intensity: GRIEF_INITIAL_INTENSITY / 2 })
    expect(Math.abs(fullMod)).toBeGreaterThan(Math.abs(halfMod))
  })
})

describe('writeLossMemories', () => {
  it('writes loss memory on NPC with high trust', () => {
    const relKey = `${SQUAD_NPC}-to-npc-lost`
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 10,
      relationships: { [relKey]: { affinity: 0, respect: 0, fear: 0, trust: 50, loyalty: 0 } },
    }
    const result = writeLossMemories(state, 'npc-lost', 10)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === SQUAD_NPC)!
    const lossMemory = npc.npcMemory.find((m) => m.event === 'loss')
    expect(lossMemory).toBeDefined()
    expect(lossMemory?.participants).toContain('npc-lost')
    expect(lossMemory?.day).toBe(10)
  })

  it('does NOT write loss memory on NPC with low trust', () => {
    const relKey = `${SQUAD_NPC}-to-npc-lost`
    const state: GameState = {
      ...initialGameStateSnapshot,
      relationships: { [relKey]: { affinity: 0, respect: 0, fear: 0, trust: 10, loyalty: 0 } },
    }
    const result = writeLossMemories(state, 'npc-lost', 5)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === SQUAD_NPC)!
    expect(npc.npcMemory.find((m) => m.event === 'loss')).toBeUndefined()
  })

  it('does not write loss memory on the lost NPC itself', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      relationships: {},
    }
    const result = writeLossMemories(state, SQUAD_NPC, 1)
    const lostNpc = result.npcRuntimeStates.find((n) => n.npcId === SQUAD_NPC)
    // The lost NPC would be removed by dismissNpc, but writeLossMemories skips it
    expect(lostNpc?.npcMemory.find((m) => m.event === 'loss')).toBeUndefined()
  })
})

describe('grief applies morale penalty in state decay', () => {
  it('grieving NPC loses more morale than non-grieving NPC', () => {
    const relKey = `${SQUAD_NPC}-to-npc-lost`
    const state: GameState = {
      ...initialGameStateSnapshot,
      relationships: { [relKey]: { affinity: 0, respect: 0, fear: 0, trust: 60, loyalty: 0 } },
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((n) =>
        n.npcId === SQUAD_NPC
          ? {
              ...n,
              states: { ...n.states, morale: 80, anger: 0, hygiene: 0 },
              npcMemory: [{ day: 1, event: 'loss', eventType: 'custom', visibility: 'open', sentiment: 'negative', participants: ['npc-lost'] }],
            }
          : n,
      ),
    }

    const noGriefState: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((n) =>
        n.npcId === SQUAD_NPC
          ? { ...n, states: { ...n.states, morale: 80, anger: 0, hygiene: 0 }, npcMemory: [] }
          : n,
      ),
    }

    const griefStore = createGameStore({ ...state, day: 3 })
    const noGriefStore = createGameStore({ ...noGriefState, day: 3 })

    griefStore.dispatch(gameActions.endDay())
    noGriefStore.dispatch(gameActions.endDay())

    const griefMorale = griefStore.getState().game.npcRuntimeStates.find((n) => n.npcId === SQUAD_NPC)!.states.morale
    const noGriefMorale = noGriefStore.getState().game.npcRuntimeStates.find((n) => n.npcId === SQUAD_NPC)!.states.morale

    expect(griefMorale).toBeLessThan(noGriefMorale)
  })
})
