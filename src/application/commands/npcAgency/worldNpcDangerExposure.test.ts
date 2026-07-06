import { describe, expect, it } from 'vitest'
import {
  applyWorldNpcDistrictDangerExposure,
  applyWorldNpcFeudViolence,
  applyWorldNpcDangerExposure,
} from './worldNpcDangerExposure'
import { initialStateWithIda, worldNpcRuntimeEntry } from '../testFixtures'
import { SERIOUS_INJURY_THRESHOLD } from '../recovery'
import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'

function withInjury(npcId: string, injury: number, overrides: Parameters<typeof worldNpcRuntimeEntry>[1] = {}) {
  return worldNpcRuntimeEntry(npcId, {
    states: { ...worldNpcRuntimeEntry(npcId).states, injury },
    ...overrides,
  })
}

const alwaysHit: Rng = () => 0
const alwaysMiss: Rng = () => 0.999

describe('applyWorldNpcDistrictDangerExposure (destiny-s97u/destiny-m916.1)', () => {
  it('never fires when district tension is at or below the threshold (40)', () => {
    const npc = withInjury('npc-danger-safe', 0, { assignedDistrictId: 'district-the-pale' })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [npc],
      districtTension: { 'district-the-pale': 40 },
    }
    const result = applyWorldNpcDistrictDangerExposure(state, alwaysHit)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-safe')!.states.injury).toBe(0)
  })

  it('can fire when district tension is above the threshold, with a forced hit', () => {
    const npc = withInjury('npc-danger-hit', 0, { assignedDistrictId: 'district-the-pale' })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [npc],
      districtTension: { 'district-the-pale': 100 },
    }
    const result = applyWorldNpcDistrictDangerExposure(state, alwaysHit)
    const actor = result.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-hit')!
    expect(actor.states.injury).toBeGreaterThan(0)
    expect(actor.states.injury).toBeLessThanOrEqual(10)
  })

  it('caps the chance at exactly 15% at maximum tension (100) -- a roll just at or above 0.15 must not fire', () => {
    const npc = withInjury('npc-danger-boundary', 0, { assignedDistrictId: 'district-the-pale' })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [npc],
      districtTension: { 'district-the-pale': 100 },
    }
    const justAtCeiling: Rng = () => 0.15
    const result = applyWorldNpcDistrictDangerExposure(state, justAtCeiling)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-boundary')!.states.injury).toBe(0)
  })

  it('a single hit never alone crosses SERIOUS_INJURY_THRESHOLD from a clean baseline', () => {
    const npc = withInjury('npc-danger-single', 0, { assignedDistrictId: 'district-the-pale' })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [npc],
      districtTension: { 'district-the-pale': 100 },
    }
    const result = applyWorldNpcDistrictDangerExposure(state, alwaysHit)
    const actor = result.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-single')!
    expect(actor.states.injury).toBeLessThan(SERIOUS_INJURY_THRESHOLD)
    expect(actor.assignment).toBe('idle')
  })

  it('never fires when the roll misses, even at maximum tension', () => {
    const npc = withInjury('npc-danger-miss', 0, { assignedDistrictId: 'district-the-pale' })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [npc],
      districtTension: { 'district-the-pale': 100 },
    }
    const result = applyWorldNpcDistrictDangerExposure(state, alwaysMiss)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-miss')!.states.injury).toBe(0)
  })

  it('accumulates across repeated exposure into assignment:recovering once injury crosses the serious threshold, and logs the transition', () => {
    const npc = withInjury('npc-danger-accumulate', 27, { assignedDistrictId: 'district-the-pale' })
    let state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [npc],
      districtTension: { 'district-the-pale': 100 },
    }

    state = applyWorldNpcDistrictDangerExposure(state, alwaysHit)

    const actor = state.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-accumulate')!
    expect(actor.states.injury).toBeGreaterThanOrEqual(SERIOUS_INJURY_THRESHOLD)
    expect(actor.assignment).toBe('recovering')
    expect(state.activityLog[0]?.message).toContain('needs to recover')
  })

  it('does not log routine sub-threshold hits (BACKGROUND visibility)', () => {
    const npc = withInjury('npc-danger-quiet', 0, { assignedDistrictId: 'district-the-pale' })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [npc],
      districtTension: { 'district-the-pale': 100 },
      activityLog: [],
    }
    const result = applyWorldNpcDistrictDangerExposure(state, alwaysHit)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-quiet')!.assignment).toBe('idle')
    expect(result.activityLog).toHaveLength(0)
  })

  it('excludes npcType:enemy', () => {
    const enemy = withInjury('npc-danger-enemy', 0, { npcType: 'enemy', assignedDistrictId: 'district-the-pale' })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [enemy],
      districtTension: { 'district-the-pale': 100 },
    }
    const result = applyWorldNpcDistrictDangerExposure(state, alwaysHit)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-enemy')!.states.injury).toBe(0)
  })

  it('excludes NPCs whose assignment is not idle', () => {
    const npc = withInjury('npc-danger-working', 0, { assignment: 'working', assignedDistrictId: 'district-the-pale' })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [npc],
      districtTension: { 'district-the-pale': 100 },
    }
    const result = applyWorldNpcDistrictDangerExposure(state, alwaysHit)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-working')!.states.injury).toBe(0)
  })

  it('excludes captives even if their assignment would otherwise read as idle (defense-in-depth)', () => {
    const captive = withInjury('npc-danger-captive', 0, {
      assignedDistrictId: 'district-the-pale',
      captivityState: {
        status: 'captive', holderId: null, siteId: null, roomId: null, regime: 'unknown',
        condition: 'healthy', compliance: 'resistant', bondType: 'none', timeHeldDays: 1,
        lastTransferDay: null, questTag: null, confiscatedItems: [], confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [captive],
      districtTension: { 'district-the-pale': 100 },
    }
    const result = applyWorldNpcDistrictDangerExposure(state, alwaysHit)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-captive')!.states.injury).toBe(0)
  })

  it('does not fire for an NPC with no assignedDistrictId', () => {
    const npc = withInjury('npc-danger-nodistrict', 0, { assignedDistrictId: null })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [npc],
      districtTension: { 'district-the-pale': 100 },
    }
    const result = applyWorldNpcDistrictDangerExposure(state, alwaysHit)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-danger-nodistrict')!.states.injury).toBe(0)
  })
})

describe('applyWorldNpcFeudViolence (destiny-s97u/destiny-m916.1)', () => {
  function feudingPair(districtA: string | null, districtB: string | null) {
    const a = withInjury('npc-feud-a', 0, { assignedDistrictId: districtA, flags: ['feud-with:npc-feud-b'] })
    const b = withInjury('npc-feud-b', 0, { assignedDistrictId: districtB, flags: ['feud-with:npc-feud-a'] })
    return [a, b]
  }

  it('does nothing when neither NPC has a feud flag', () => {
    const a = withInjury('npc-nofeud-a', 0, { assignedDistrictId: 'district-the-pale' })
    const b = withInjury('npc-nofeud-b', 0, { assignedDistrictId: 'district-the-pale' })
    const state: GameState = { ...initialStateWithIda, npcRuntimeStates: [a, b] }
    const result = applyWorldNpcFeudViolence(state, alwaysHit)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-nofeud-a')!.states.injury).toBe(0)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-nofeud-b')!.states.injury).toBe(0)
  })

  it('injures both feuding parties and raises their shared district tension when the roll hits', () => {
    const [a, b] = feudingPair('district-the-pale', 'district-the-pale')
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [a, b],
      districtTension: { 'district-the-pale': 20 },
    }
    const result = applyWorldNpcFeudViolence(state, alwaysHit)
    const resultA = result.npcRuntimeStates.find((n) => n.npcId === 'npc-feud-a')!
    const resultB = result.npcRuntimeStates.find((n) => n.npcId === 'npc-feud-b')!
    expect(resultA.states.injury).toBeGreaterThanOrEqual(10)
    expect(resultA.states.injury).toBeLessThanOrEqual(20)
    expect(resultB.states.injury).toBeGreaterThanOrEqual(10)
    expect(resultB.states.injury).toBeLessThanOrEqual(20)
    expect(result.districtTension['district-the-pale']).toBe(24)
  })

  it('always logs a feud-violence event when it fires (MOMENT visibility)', () => {
    const [a, b] = feudingPair('district-the-pale', 'district-the-pale')
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [a, b],
      districtTension: { 'district-the-pale': 20 },
      activityLog: [],
    }
    const result = applyWorldNpcFeudViolence(state, alwaysHit)
    expect(result.activityLog).toHaveLength(1)
    expect(result.activityLog[0]?.message).toContain('feud turned violent')
  })

  it('never fires when the roll misses', () => {
    const [a, b] = feudingPair('district-the-pale', 'district-the-pale')
    const state: GameState = { ...initialStateWithIda, npcRuntimeStates: [a, b] }
    const result = applyWorldNpcFeudViolence(state, alwaysMiss)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-feud-a')!.states.injury).toBe(0)
  })

  it('does not process the same feuding pair twice in one pass', () => {
    const [a, b] = feudingPair('district-the-pale', 'district-the-pale')
    const state: GameState = { ...initialStateWithIda, npcRuntimeStates: [a, b], activityLog: [] }
    const result = applyWorldNpcFeudViolence(state, alwaysHit)
    expect(result.activityLog).toHaveLength(1)
  })

  it('does not erupt into violence when the feuding pair has drifted into different districts (destiny-q80n.10 interaction)', () => {
    const [a, b] = feudingPair('district-the-pale', 'district-harbor')
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [a, b],
      districtTension: { 'district-the-pale': 20, 'district-harbor': 20 },
    }
    const result = applyWorldNpcFeudViolence(state, alwaysHit)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-feud-a')!.states.injury).toBe(0)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-feud-b')!.states.injury).toBe(0)
  })

  it('excludes a target who is not idle even if the initiator has a feud flag', () => {
    const a = withInjury('npc-feud-busy-a', 0, { assignedDistrictId: 'district-the-pale', flags: ['feud-with:npc-feud-busy-b'] })
    const b = withInjury('npc-feud-busy-b', 0, { assignedDistrictId: 'district-the-pale', assignment: 'recovering', flags: ['feud-with:npc-feud-busy-a'] })
    const state: GameState = { ...initialStateWithIda, npcRuntimeStates: [a, b] }
    const result = applyWorldNpcFeudViolence(state, alwaysHit)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-feud-busy-a')!.states.injury).toBe(0)
  })
})

describe('applyWorldNpcDangerExposure (composition)', () => {
  it('runs both paths in sequence', () => {
    const dangerNpc = withInjury('npc-combined-danger', 0, { assignedDistrictId: 'district-the-pale' })
    const a = withInjury('npc-combined-feud-a', 0, { assignedDistrictId: 'district-harbor', flags: ['feud-with:npc-combined-feud-b'] })
    const b = withInjury('npc-combined-feud-b', 0, { assignedDistrictId: 'district-harbor', flags: ['feud-with:npc-combined-feud-a'] })
    const state: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [dangerNpc, a, b],
      districtTension: { 'district-the-pale': 100, 'district-harbor': 20 },
    }
    const result = applyWorldNpcDangerExposure(state, alwaysHit)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-combined-danger')!.states.injury).toBeGreaterThan(0)
    expect(result.npcRuntimeStates.find((n) => n.npcId === 'npc-combined-feud-a')!.states.injury).toBeGreaterThan(0)
  })
})
