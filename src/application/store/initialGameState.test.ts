import { describe, it, expect } from 'vitest'

import { initialGameStateSnapshot } from './initialGameState'
import { isCanonicalRelationshipKey } from '../../domain/relationships/contracts'
import { gameStateSchema } from '../../domain'

describe('initialGameStateSnapshot relationships', () => {
  it('exposes the authored starting bond between the player and Marion Vale under the canonical key', () => {
    const rel = initialGameStateSnapshot.relationships['player-to-npc-marion-vale']
    expect(rel).toBeDefined()
    expect(rel?.affinity).toBe(40)
    expect(rel?.trust).toBe(55)
  })

  it('exposes the authored roster backstory bonds under canonical keys', () => {
    expect(initialGameStateSnapshot.relationships['npc-marion-vale-to-npc-orren-wex']).toBeDefined()
    expect(initialGameStateSnapshot.relationships['npc-marion-vale-to-npc-tessaly-ash']).toBeDefined()
    expect(initialGameStateSnapshot.relationships['npc-marion-vale-to-npc-sanna-veld']).toBeDefined()
    expect(initialGameStateSnapshot.relationships['npc-brand-to-npc-marion-vale']).toBeDefined()
    expect(initialGameStateSnapshot.relationships['npc-dalen-morke-to-npc-marion-vale']).toBeDefined()
  })

  it('uses only canonical relationship key formats — no legacy dashed keys survive boot', () => {
    const keys = Object.keys(initialGameStateSnapshot.relationships)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(isCanonicalRelationshipKey(key)).toBe(true)
    }
  })

  it('fails schema validation if a legacy dashed relationship key reappears', () => {
    const withLegacyKey = {
      ...initialGameStateSnapshot,
      relationships: {
        ...initialGameStateSnapshot.relationships,
        'player-npc-marion-vale': { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 },
      },
    }
    expect(() => gameStateSchema.parse(withLegacyKey)).toThrow(/canonical/i)
  })
})
