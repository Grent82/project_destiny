import { describe, it, expect } from 'vitest'

import { initialStateWithIda, idaRhysRosterEntry } from './testFixtures'
import type { WorldNpcRuntimeState } from '../../domain/npc/contracts'
import { getNpcRecoverySupport } from './recovery'

const worldNpcFixture: WorldNpcRuntimeState = {
  npcId: 'npc-scaffolding-test-world-npc',
  lastContactDay: null,
  disposition: 'neutral',
  locationOverride: null,
  flags: [],
  intimacyStage: 'none',
  pregnancyState: null,
  health: 100,
  injury: 0,
  recovering: false,
}

function withRoom(roomId: string, roomFunction: 'quarters' | 'infirmary') {
  return {
    ...initialStateWithIda,
    house: {
      ...initialStateWithIda.house,
      rooms: initialStateWithIda.house.rooms.map((r) =>
        r.roomId === roomId ? { ...r, state: 'intact' as const, roomFunction } : r,
      ),
    },
  }
}

describe('getNpcRecoverySupport for World NPCs (destiny-629x)', () => {
  it('returns none with no house support', () => {
    expect(getNpcRecoverySupport(initialStateWithIda, worldNpcFixture)).toBe('none')
  })

  it('never returns lodging, even when the house has intact residential rooms (World NPCs are not residents)', () => {
    const state = withRoom('room-quarters', 'quarters')
    expect(getNpcRecoverySupport(state, worldNpcFixture)).toBe('none')
  })

  it('returns treatment when the house has an infirmary', () => {
    const state = withRoom('room-bureau', 'infirmary')
    expect(getNpcRecoverySupport(state, worldNpcFixture)).toBe('treatment')
  })
})

describe('getNpcRecoverySupport for roster NPCs (unchanged behavior)', () => {
  it('still returns lodging for a roster NPC assigned to an intact residential room', () => {
    const state = withRoom('room-quarters', 'quarters')
    const npc = { ...idaRhysRosterEntry, roomAssignment: 'room-quarters' }
    expect(getNpcRecoverySupport(state, npc)).toBe('lodging')
  })
})
