import { describe, it, expect } from 'vitest'
import { selectCharacterSignature } from './characterSignature'
import type { RootState } from '../store/gameStore'
import { initialStateWithIda } from '../commands/testFixtures'

function makeState(overrides: Partial<typeof initialStateWithIda['roster'][0]['states']> = {}): RootState {
  const baseRoster = initialStateWithIda.roster.map((r) =>
    r.npcId === 'npc-ida-rhys'
      ? { ...r, states: { ...r.states, ...overrides } }
      : r,
  )
  return { game: { ...initialStateWithIda, roster: baseRoster } } as unknown as RootState
}

describe('selectCharacterSignature', () => {
  it('returns a non-empty string for Ida Rhys who has quirks', () => {
    const sig = selectCharacterSignature(makeState(), 'npc-ida-rhys')
    expect(sig).toBeTruthy()
    expect(typeof sig).toBe('string')
  })

  it('reflects fear state in the signature', () => {
    const sig = selectCharacterSignature(makeState({ fear: 75 }), 'npc-ida-rhys')
    expect(sig.toLowerCase()).toContain('flinch')
  })

  it('reflects low health in the signature', () => {
    const sig = selectCharacterSignature(makeState({ health: 25 }), 'npc-ida-rhys')
    expect(sig.toLowerCase()).toContain('pain')
  })

  it('reflects high stress in the signature', () => {
    const sig = selectCharacterSignature(makeState({ stress: 80 }), 'npc-ida-rhys')
    expect(sig.toLowerCase()).toContain('strain')
  })

  it('returns empty string for unknown NPC', () => {
    const sig = selectCharacterSignature(makeState(), 'npc-does-not-exist')
    expect(sig).toBe('')
  })
})
