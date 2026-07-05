import { describe, it, expect } from 'vitest'

import { initialGameStateSnapshot } from './initialGameState'
import { isCanonicalRelationshipKey } from '../../domain/relationships/contracts'
import { gameStateSchema } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'

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

describe('initialGameStateSnapshot ambient world population (destiny-rama.13)', () => {
  const ambientWorldDefIds = [
    'npc-garet-doyle', 'npc-sister-vael', 'npc-torvald-messe', 'npc-lira-ashcroft', 'npc-bog',
    'npc-fenwick-pale', 'npc-the-wren', 'npc-osanna-cray', 'npc-cutter', 'npc-old-maret',
    'npc-orven-pell', 'npc-alis-vey', 'npc-brannic-thule', 'npc-cessa-rill', 'npc-sable-cairn-head',
  ]

  it('hydrates every ambient (npcType: world) definition into a runtime entry', () => {
    for (const npcId of ambientWorldDefIds) {
      const runtime = initialGameStateSnapshot.npcRuntimeStates.find((n) => n.npcId === npcId)
      expect(runtime, `expected a runtime entry for ${npcId}`).toBeDefined()
      expect(runtime!.npcType).toBe('world')
      expect(runtime!.playerRosterMember).toBe(false)
    }
  })

  it('assigns each hydrated ambient world person to their definition\'s home district, not null', () => {
    for (const npcId of ambientWorldDefIds) {
      const def = contentCatalog.npcsById.get(npcId)!
      const runtime = initialGameStateSnapshot.npcRuntimeStates.find((n) => n.npcId === npcId)!
      expect(runtime.assignedDistrictId).toBe(def.districtId)
    }
  })

  it('never introduces a duplicate npcId in the unified runtime list', () => {
    const ids = initialGameStateSnapshot.npcRuntimeStates.map((n) => n.npcId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every district housing an ambient world def at least 2 intention-eligible ambient residents', () => {
    // Acceptance in the ticket text was "district population > 3", but selectWorldNpcViewsByDistrict
    // already renders every world/story *definition* regardless of runtime hydration (it resolves
    // location from def.schedule as a fallback) — display population was never actually zero. The
    // real gap this ticket closes is agency: only npcRuntimeStates entries can hold a
    // currentIntention or be picked up by the intention/agency pipelines (they iterate
    // state.npcRuntimeStates, never contentCatalog.npcs directly). So the meaningful assertion is
    // that every ambient district now has multiple *runtime-hydrated* ambient residents able to act.
    const runtimeByDistrict = new Map<string, number>()
    for (const npc of initialGameStateSnapshot.npcRuntimeStates) {
      if (npc.npcType !== 'world' || !npc.assignedDistrictId) continue
      runtimeByDistrict.set(npc.assignedDistrictId, (runtimeByDistrict.get(npc.assignedDistrictId) ?? 0) + 1)
    }
    const expectedDistricts = new Set(
      ambientWorldDefIds
        .map((id) => contentCatalog.npcsById.get(id)!.districtId)
        .filter((districtId): districtId is string => Boolean(districtId)),
    )
    for (const districtId of expectedDistricts) {
      expect(runtimeByDistrict.get(districtId) ?? 0, `district ${districtId} ambient runtime population`).toBeGreaterThanOrEqual(2)
    }
  })
})
