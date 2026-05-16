import { describe, it, expect } from 'vitest'
import { applyWardAgeMilestones } from './applyWardAgeMilestones'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState, Ward } from '../../domain/game/contracts'

function makeWard(overrides: Partial<Ward>): Ward {
  return {
    wardId: 'ward-test',
    name: 'Test Ward',
    parentNpcId: null,
    parentNpcIds: [],
    origin: undefined,
    birthDay: 1,
    stage: 'infant',
    bondStatus: null,
    freedOnDay: null,
    promotedToNpcId: null,
    ...overrides,
  }
}

function stateWithWard(ward: Ward, dayOverride?: number): GameState {
  return {
    ...initialGameStateSnapshot,
    day: dayOverride ?? initialGameStateSnapshot.day,
    wards: [ward],
    lastFiredDay: {},
  }
}

const noopRng = () => 0.5  // ±20 offset = 0 when rng returns 0.5 → floor(0.5*41)-20 = 20-20 = 0

describe('applyWardAgeMilestones', () => {
  it('does nothing for ward with no birthDay', () => {
    const ward = makeWard({ birthDay: null, stage: 'infant' })
    const state = stateWithWard(ward, 300)
    const result = applyWardAgeMilestones(state, noopRng)
    expect(result.wards[0]!.stage).toBe('infant')
    expect(result.pendingEvents).toHaveLength(0)
  })

  it('does nothing when age is below infant-to-child threshold', () => {
    const ward = makeWard({ birthDay: 1, stage: 'infant' })
    const state = stateWithWard(ward, 150) // age = 149d < 201
    const result = applyWardAgeMilestones(state, noopRng)
    expect(result.wards[0]!.stage).toBe('infant')
  })

  it('transitions infant to child at age 201 and fires event', () => {
    const ward = makeWard({ birthDay: 1, stage: 'infant' })
    const state = stateWithWard(ward, 202) // age = 201d
    const result = applyWardAgeMilestones(state, noopRng)
    expect(result.wards[0]!.stage).toBe('child')
    expect(result.pendingEvents.some((pe) => pe.eventId === 'event-ward-stage-infant-to-child')).toBe(true)
  })

  it('transitions child to teenager at age 1101 and fires event', () => {
    const ward = makeWard({ birthDay: 1, stage: 'child' })
    const state = stateWithWard(ward, 1102) // age = 1101d
    const result = applyWardAgeMilestones(state, noopRng)
    expect(result.wards[0]!.stage).toBe('teenager')
    expect(result.pendingEvents.some((pe) => pe.eventId === 'event-ward-stage-child-to-teenager')).toBe(true)
  })

  it('transitions teenager to young_adult at age 1601 and fires event', () => {
    const ward = makeWard({ birthDay: 1, stage: 'teenager' })
    const state = stateWithWard(ward, 1602) // age = 1601d
    const result = applyWardAgeMilestones(state, noopRng)
    expect(result.wards[0]!.stage).toBe('young_adult')
    expect(result.pendingEvents.some((pe) => pe.eventId === 'event-ward-stage-teenager-to-young-adult')).toBe(true)
  })

  it('sets dedup key in lastFiredDay on transition', () => {
    const ward = makeWard({ birthDay: 1, stage: 'infant' })
    const state = stateWithWard(ward, 202)
    const result = applyWardAgeMilestones(state, noopRng)
    expect(result.lastFiredDay['ward-milestone-ward-test-child']).toBe(202)
  })

  it('does not fire event twice for same milestone', () => {
    const ward = makeWard({ birthDay: 1, stage: 'infant' })
    const state: GameState = {
      ...stateWithWard(ward, 202),
      lastFiredDay: { 'ward-milestone-ward-test-child': 202 },
    }
    const result = applyWardAgeMilestones(state, noopRng)
    // Stage already advanced by dedup key being present → ward still 'infant' since milestone was already logged
    expect(result.pendingEvents.some((pe) => pe.eventId === 'event-ward-stage-infant-to-child')).toBe(false)
  })

  it('initialises shapingTraits on teenager transition', () => {
    const ward = makeWard({ birthDay: 1, stage: 'child' })
    const state = stateWithWard(ward, 1102)
    const result = applyWardAgeMilestones(state, noopRng)
    expect(result.wards[0]!.shapingTraits).toBeDefined()
    const traits = result.wards[0]!.shapingTraits!
    for (const val of Object.values(traits)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  it('shapingTraits uses parent traits from roster when available', () => {
    const ward = makeWard({ birthDay: 1, stage: 'child', parentNpcIds: ['npc-marion-vale'] })
    const state = stateWithWard(ward, 1102)
    // Marion Vale is on the starter roster — she has defined trait values
    const result = applyWardAgeMilestones(state, noopRng)
    expect(result.wards[0]!.shapingTraits).toBeDefined()
  })

  it('advances multiple stages in one call when ward age spans multiple thresholds', () => {
    // Age 1602 → ward was infant, should reach teenager
    const ward = makeWard({ birthDay: 1, stage: 'infant' })
    const state = stateWithWard(ward, 1103) // age = 1102 → child→teenager
    const result = applyWardAgeMilestones(state, noopRng)
    expect(result.wards[0]!.stage).toBe('teenager')
    // Both milestone events should be queued
    expect(result.pendingEvents.some((pe) => pe.eventId === 'event-ward-stage-infant-to-child')).toBe(true)
    expect(result.pendingEvents.some((pe) => pe.eventId === 'event-ward-stage-child-to-teenager')).toBe(true)
  })

  it('sets promotedToNpcId on young_adult transition', () => {
    const ward = makeWard({ birthDay: 1, stage: 'teenager' })
    const state = stateWithWard(ward, 1602)
    const result = applyWardAgeMilestones(state, noopRng)
    expect(result.wards[0]!.promotedToNpcId).toBeTruthy()
  })
})
