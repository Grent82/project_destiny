import { describe, it, expect } from 'vitest'
import { recognizeHeir } from './recognizeHeir'
import { formalizeHeir } from './formalizeHeir'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { selectHeirLegitimacyWeight } from '../selectors/house'
import type { GameState, Heir } from '../../domain/game/contracts'

function makeHeir(overrides: Partial<Heir> = {}): Heir {
  return {
    id: 'heir-test',
    name: 'Valdric Child',
    originStory: 'Born in the house.',
    stage: 'child',
    arrivalDay: 1,
    origin: 'biological',
    parentRefs: [],
    legitimacyStatus: 'unknown',
    birthContext: null,
    ...overrides,
  }
}

function stateWithHeir(heir: Heir): GameState {
  return {
    ...initialGameStateSnapshot,
    house: {
      ...initialGameStateSnapshot.house,
      houseHeirs: [heir],
    },
    pendingEvents: [],
  }
}

describe('recognizeHeir', () => {
  it('does nothing if heir not found', () => {
    const state = stateWithHeir(makeHeir())
    const result = recognizeHeir(state, 'heir-not-exist')
    expect(result).toBe(state)
  })

  it('does nothing if heir is already recognized', () => {
    const state = stateWithHeir(makeHeir({ legitimacyStatus: 'recognized' }))
    const result = recognizeHeir(state, 'heir-test')
    expect(result).toBe(state)
  })

  it('sets legitimacyStatus to recognized', () => {
    const state = stateWithHeir(makeHeir())
    const result = recognizeHeir(state, 'heir-test')
    expect(result.house.houseHeirs[0]!.legitimacyStatus).toBe('recognized')
  })

  it('fires the heir announcement event', () => {
    const state = stateWithHeir(makeHeir())
    const result = recognizeHeir(state, 'heir-test')
    expect(result.pendingEvents.some((pe) => pe.eventId === 'event-heir-announcement')).toBe(true)
  })

  it('does not fire announcement event twice', () => {
    const state: GameState = {
      ...stateWithHeir(makeHeir()),
      pendingEvents: [{ eventId: 'event-heir-announcement', firedOnDay: 1 }],
    }
    const result = recognizeHeir(state, 'heir-test')
    const count = result.pendingEvents.filter((pe) => pe.eventId === 'event-heir-announcement').length
    expect(count).toBe(1)
  })

  it('adds activity log entry', () => {
    const state = stateWithHeir(makeHeir())
    const result = recognizeHeir(state, 'heir-test')
    expect(result.activityLog.some((e) => e.message.includes('Valdric heir'))).toBe(true)
  })
})

describe('selectHeirLegitimacyWeight', () => {
  it('returns 0 with no heirs', () => {
    const weight = selectHeirLegitimacyWeight({ game: initialGameStateSnapshot } as any)
    expect(weight).toBe(0)
  })

  it('returns 3 for a recognized heir', () => {
    const state = stateWithHeir(makeHeir({ legitimacyStatus: 'recognized' }))
    const weight = selectHeirLegitimacyWeight({ game: state } as any)
    expect(weight).toBe(3)
  })

  it('returns 1 for a contested heir', () => {
    const state = stateWithHeir(makeHeir({ legitimacyStatus: 'contested' }))
    const weight = selectHeirLegitimacyWeight({ game: state } as any)
    expect(weight).toBe(1)
  })

  it('returns 0 for hidden or unknown heir', () => {
    const hidden = stateWithHeir(makeHeir({ legitimacyStatus: 'hidden' }))
    expect(selectHeirLegitimacyWeight({ game: hidden } as any)).toBe(0)
    const unknown = stateWithHeir(makeHeir({ legitimacyStatus: 'unknown' }))
    expect(selectHeirLegitimacyWeight({ game: unknown } as any)).toBe(0)
  })
})

describe('formalizeHeir', () => {
  it('does nothing if heir not found', () => {
    const state = stateWithHeir(makeHeir({ stage: 'adult' }))
    const result = formalizeHeir(state, 'heir-unknown')
    expect(result).toBe(state)
  })

  it('does nothing if heir is not adult', () => {
    const state = stateWithHeir(makeHeir({ stage: 'child' }))
    const result = formalizeHeir(state, 'heir-test')
    expect(result).toBe(state)
  })

  it('removes heir from houseHeirs', () => {
    const state = stateWithHeir(makeHeir({ stage: 'adult' }))
    const result = formalizeHeir(state, 'heir-test')
    expect(result.house.houseHeirs).toHaveLength(0)
  })

  it('adds NPC to roster', () => {
    const state = stateWithHeir(makeHeir({ stage: 'adult' }))
    const result = formalizeHeir(state, 'heir-test')
    expect(result.roster.length).toBe(state.roster.length + 1)
  })

  it('promoted heir has valid trait values [0, 100]', () => {
    const state = stateWithHeir(makeHeir({ stage: 'adult' }))
    const result = formalizeHeir(state, 'heir-test')
    const npc = result.roster.find((n) => n.npcId === 'heir-test')!
    for (const val of Object.values(npc.traits)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  it('uses parent traits when parentRefs provided', () => {
    const heir = makeHeir({ stage: 'adult', parentRefs: ['npc-marion-vale'] })
    const state = stateWithHeir(heir)
    const result = formalizeHeir(state, 'heir-test')
    const npc = result.roster.find((n) => n.npcId === 'heir-test')
    expect(npc).toBeDefined()
  })

  it('adds activity log entry', () => {
    const state = stateWithHeir(makeHeir({ stage: 'adult' }))
    const result = formalizeHeir(state, 'heir-test')
    expect(result.activityLog.some((e) => e.message.includes('Valdric Child'))).toBe(true)
  })
})
