import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { endDay } from './endDay'
import {
  checkFearRefuseAdvance,
  getFatigueAccuracyPenalty,
  getHungerCombatPenalty,
  getLoyaltyDeployStatus,
  getStressMoraleDecay,
} from '../../domain/npcStateModifiers'

describe('getFatigueAccuracyPenalty', () => {
  it('returns -10 when fatigue is above threshold', () => {
    expect(getFatigueAccuracyPenalty({ fatigue: 76 })).toBe(-10)
    expect(getFatigueAccuracyPenalty({ fatigue: 100 })).toBe(-10)
  })

  it('returns 0 when fatigue is at or below threshold', () => {
    expect(getFatigueAccuracyPenalty({ fatigue: 75 })).toBe(0)
    expect(getFatigueAccuracyPenalty({ fatigue: 50 })).toBe(0)
    expect(getFatigueAccuracyPenalty({})).toBe(0)
  })
})

describe('getHungerCombatPenalty', () => {
  it('returns -10 when hunger is above threshold', () => {
    expect(getHungerCombatPenalty({ hunger: 71 })).toBe(-10)
    expect(getHungerCombatPenalty({ hunger: 100 })).toBe(-10)
  })

  it('returns 0 when hunger is at or below threshold', () => {
    expect(getHungerCombatPenalty({ hunger: 70 })).toBe(0)
    expect(getHungerCombatPenalty({ hunger: 30 })).toBe(0)
    expect(getHungerCombatPenalty({})).toBe(0)
  })
})

describe('getLoyaltyDeployStatus', () => {
  it('returns blocked at or below refuse threshold', () => {
    expect(getLoyaltyDeployStatus({ loyalty: 10 })).toBe('blocked')
    expect(getLoyaltyDeployStatus({ loyalty: 0 })).toBe('blocked')
  })

  it('returns warning between refuse and warning threshold', () => {
    expect(getLoyaltyDeployStatus({ loyalty: 11 })).toBe('warning')
    expect(getLoyaltyDeployStatus({ loyalty: 30 })).toBe('warning')
  })

  it('returns ok above warning threshold', () => {
    expect(getLoyaltyDeployStatus({ loyalty: 31 })).toBe('ok')
    expect(getLoyaltyDeployStatus({ loyalty: 100 })).toBe('ok')
    expect(getLoyaltyDeployStatus({})).toBe('ok')
  })
})

describe('getStressMoraleDecay', () => {
  it('returns -5 when stress is above threshold', () => {
    expect(getStressMoraleDecay({ stress: 81 })).toBe(-5)
    expect(getStressMoraleDecay({ stress: 100 })).toBe(-5)
  })

  it('returns 0 when stress is at or below threshold', () => {
    expect(getStressMoraleDecay({ stress: 80 })).toBe(0)
    expect(getStressMoraleDecay({ stress: 40 })).toBe(0)
    expect(getStressMoraleDecay({})).toBe(0)
  })
})

describe('checkFearRefuseAdvance', () => {
  it('always returns false when fear is at or below threshold', () => {
    for (let i = 0; i < 20; i++) {
      expect(checkFearRefuseAdvance({ fear: 60 })).toBe(false)
      expect(checkFearRefuseAdvance({ fear: 0 })).toBe(false)
      expect(checkFearRefuseAdvance({})).toBe(false)
    }
  })

  it('can return true when fear exceeds threshold', () => {
    let trueCount = 0
    for (let i = 0; i < 200; i++) {
      if (checkFearRefuseAdvance({ fear: 100 })) trueCount++
    }
    // With 30% chance and 200 trials, probability of zero successes is negligible
    expect(trueCount).toBeGreaterThan(0)
  })

  it('accepts an injected rng for deterministic fear refusal checks', () => {
    expect(checkFearRefuseAdvance({ fear: 100 }, () => 0.1)).toBe(true)
    expect(checkFearRefuseAdvance({ fear: 100 }, () => 0.9)).toBe(false)
  })
})

describe('endDay threshold events', () => {
  it('logs hunger warning when NPC hunger exceeds threshold', () => {
    const hungryState = {
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((npc) => ({
        ...npc,
        states: { ...npc.states, hunger: 71 },
      })),
    }
    const next = endDay(hungryState)
    const hungerWarning = next.activityLog.find((e) =>
      e.message.includes('Fighting will cost more than it should'),
    )
    expect(hungerWarning).toBeDefined()
  })

  it('applies extra morale decay when NPC stress exceeds threshold', () => {
    // Stress decays by 3 in step 2 for resting NPCs, so set it high enough to exceed 80 after decay
    const stressedState = {
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((npc) => ({
        ...npc,
        roomAssignment: null,
        states: { ...npc.states, stress: 90, morale: 50 },
      })),
    }
    const next = endDay(stressedState)
    // stress 90 - 3 decay = 87 > 80 threshold → morale 50 - 5 = 45
    // Marion Vale also has ambition=71 (>65), no title, not deployed → ambition drain -2 → 43
    const stressedNpc = next.roster[0]!
    expect(stressedNpc.states.morale).toBe(43) // 50 - 5 (stress) - 2 (ambition)
    const stressWarning = next.activityLog.find((e) =>
      e.message.includes('carries the weight'),
    )
    expect(stressWarning).toBeDefined()
  })
})
