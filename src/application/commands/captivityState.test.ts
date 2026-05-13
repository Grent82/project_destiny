/**
 * Tests for captivityState schema and mechanics (destiny-4n2j).
 *
 * Verifies: schema parsing, captivity degradation in endDay, rescueNpc action,
 * and that pregnancyState has the correct structure.
 */

import { describe, it, expect } from 'vitest'
import { captivityStateSchema, pregnancyStateSchema } from '../../domain/npc/contracts'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'

const SQUAD_NPC = 'npc-marion-vale'

function makeStateWithCaptive(captivityOverride?: object): GameState {
  return {
    ...initialGameStateSnapshot,
    roster: initialGameStateSnapshot.roster.map((npc) =>
      npc.npcId === SQUAD_NPC
        ? {
            ...npc,
            captivityState: {
              status: 'captive' as const,
              holderId: 'faction-syndicate',
              condition: 'healthy' as const,
              compliance: 'resistant' as const,
              bondType: 'none' as const,
              timeHeldDays: 0,
              questTag: null,
              ...captivityOverride,
            },
          }
        : npc,
    ),
  }
}

describe('captivityStateSchema', () => {
  it('parses a valid captivity state', () => {
    const result = captivityStateSchema.safeParse({
      status: 'captive',
      holderId: 'faction-syndicate',
      condition: 'healthy',
      compliance: 'resistant',
      bondType: 'none',
      timeHeldDays: 0,
      questTag: null,
    })
    expect(result.success).toBe(true)
  })

  it('applies defaults for omitted fields', () => {
    const result = captivityStateSchema.safeParse({ status: 'missing' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.condition).toBe('healthy')
      expect(result.data.compliance).toBe('resistant')
      expect(result.data.bondType).toBe('none')
      expect(result.data.timeHeldDays).toBe(0)
      expect(result.data.holderId).toBeNull()
      expect(result.data.questTag).toBeNull()
    }
  })

  it('rejects invalid status', () => {
    const result = captivityStateSchema.safeParse({ status: 'escaped' })
    expect(result.success).toBe(false)
  })

  it('all five statuses are valid', () => {
    const statuses = ['missing', 'captive', 'rescued', 'returned', 'dead'] as const
    for (const status of statuses) {
      expect(captivityStateSchema.safeParse({ status }).success).toBe(true)
    }
  })
})

describe('pregnancyStateSchema', () => {
  it('parses consensual pregnancy state', () => {
    const result = pregnancyStateSchema.safeParse({ context: 'consensual' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.daysElapsed).toBe(0)
      expect(result.data.questTag).toBeNull()
    }
  })

  it('parses unknown-context (captivity aftermath) pregnancy state', () => {
    const result = pregnancyStateSchema.safeParse({ context: 'unknown', daysElapsed: 14 })
    expect(result.success).toBe(true)
  })

  it('rejects missing context field', () => {
    const result = pregnancyStateSchema.safeParse({ daysElapsed: 0 })
    expect(result.success).toBe(false)
  })
})

describe('setCaptivityState action', () => {
  it('sets captivityState on a roster NPC', () => {
    const store = createGameStore()
    store.dispatch(
      gameActions.setCaptivityState({
        npcId: SQUAD_NPC,
        captivityState: {
          status: 'missing',
          holderId: null,
          condition: 'healthy',
          compliance: 'resistant',
          bondType: 'none',
          timeHeldDays: 0,
          questTag: null,
        },
      }),
    )
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)
    expect(npc?.captivityState?.status).toBe('missing')
  })

  it('clears captivityState when null is passed', () => {
    const store = createGameStore(makeStateWithCaptive())
    store.dispatch(gameActions.setCaptivityState({ npcId: SQUAD_NPC, captivityState: null }))
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)
    expect(npc?.captivityState).toBeUndefined()
  })
})

describe('rescueNpc action', () => {
  it('sets captivityState status to rescued', () => {
    const store = createGameStore(makeStateWithCaptive())
    store.dispatch(gameActions.rescueNpc({ npcId: SQUAD_NPC }))
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)
    expect(npc?.captivityState?.status).toBe('rescued')
  })

  it('changes assignment to recovering', () => {
    const store = createGameStore(makeStateWithCaptive())
    store.dispatch(gameActions.rescueNpc({ npcId: SQUAD_NPC }))
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)
    expect(npc?.assignment).toBe('recovering')
  })

  it('applies health/stress penalties for broken condition at rescue', () => {
    const store = createGameStore(makeStateWithCaptive({ condition: 'broken' }))
    const before = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!
    store.dispatch(gameActions.rescueNpc({ npcId: SQUAD_NPC }))
    const after = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!
    expect(after.states.health).toBeLessThan(before.states.health)
    expect(after.states.stress).toBeGreaterThan(before.states.stress)
  })

  it('no health penalty for healthy condition', () => {
    const store = createGameStore(makeStateWithCaptive({ condition: 'healthy' }))
    const healthBefore = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!.states.health
    store.dispatch(gameActions.rescueNpc({ npcId: SQUAD_NPC }))
    const healthAfter = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!.states.health
    expect(healthAfter).toBe(healthBefore)
  })

  it('logs rescue event in activity log', () => {
    const store = createGameStore(makeStateWithCaptive())
    store.dispatch(gameActions.rescueNpc({ npcId: SQUAD_NPC }))
    const log = store.getState().game.activityLog
    expect(log.some((e) => e.message.includes('rescued'))).toBe(true)
  })

  it('does nothing if NPC has no captivityState', () => {
    const store = createGameStore()
    const logBefore = store.getState().game.activityLog.length
    store.dispatch(gameActions.rescueNpc({ npcId: SQUAD_NPC }))
    expect(store.getState().game.activityLog.length).toBe(logBefore)
  })
})

describe('captivity degradation in endDay', () => {
  it('increments timeHeldDays by 1 each endDay call', () => {
    const store = createGameStore(makeStateWithCaptive({ timeHeldDays: 3 }))
    store.dispatch(gameActions.endDay())
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)
    expect(npc?.captivityState?.timeHeldDays).toBe(4)
  })

  it('degrades condition from healthy→hurt at 7 days', () => {
    const store = createGameStore(makeStateWithCaptive({ timeHeldDays: 6, condition: 'healthy' }))
    store.dispatch(gameActions.endDay())
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)
    expect(npc?.captivityState?.condition).toBe('hurt')
  })

  it('does not degrade further from altered (max tier)', () => {
    const store = createGameStore(makeStateWithCaptive({ timeHeldDays: 13, condition: 'altered' }))
    store.dispatch(gameActions.endDay())
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)
    expect(npc?.captivityState?.condition).toBe('altered')
  })

  it('does not affect NPCs without captivityState', () => {
    const store = createGameStore()
    const dayBefore = store.getState().game.day
    store.dispatch(gameActions.endDay())
    expect(store.getState().game.day).toBe(dayBefore + 1)
    const npc = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)
    expect(npc?.captivityState).toBeUndefined()
  })
})
