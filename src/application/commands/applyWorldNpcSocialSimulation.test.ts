import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { applyWorldNpcSocialSimulation } from './applyWorldNpcSocialSimulation'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'

function makeState() {
  return {
    ...initialGameStateSnapshot,
    relationships: {},
    bondVisibility: {},
  }
}

describe('applyWorldNpcSocialSimulation', () => {
  it('forms soft bonds for same-district world NPCs and skips cross-district pairs', () => {
    const result = applyWorldNpcSocialSimulation(makeState(), () => 0)

    const paleKey = buildRelationshipKey('npc-garet-doyle', 'npc-sister-vael')
    const crossDistrictKey = buildRelationshipKey('npc-garet-doyle', 'npc-old-maret')

    expect(result.relationships[paleKey]?.softBond).toBeDefined()
    expect(result.relationships[paleKey]?.softBond?.strength).toBeGreaterThan(0)
    expect(result.relationships[crossDistrictKey]).toBeUndefined()
  })

  it('enforces the soft-bond cap by displacing the weakest edge', () => {
    const worldNpcIds = contentCatalog.npcs
      .filter((npc) => npc.npcType === 'world')
      .map((npc) => npc.id)
      .filter((npcId) => npcId !== 'npc-garet-doyle')
      .slice(0, 5)

    let state = makeState()
    state.relationships = worldNpcIds.reduce((relationships, npcId, index) => {
      const forward = buildRelationshipKey('npc-garet-doyle', npcId)
      const reverse = buildRelationshipKey(npcId, 'npc-garet-doyle')
      return {
        ...relationships,
        [forward]: {
          affinity: 10,
          respect: 0,
          fear: 0,
          trust: 10,
          loyalty: 0,
          bondType: 'friendship',
          softBond: { strength: 12 + index, since: 1 + index, visibility: 'hidden' as const },
        },
        [reverse]: {
          affinity: 10,
          respect: 0,
          fear: 0,
          trust: 10,
          loyalty: 0,
          bondType: 'friendship',
          softBond: { strength: 12 + index, since: 1 + index, visibility: 'hidden' as const },
        },
      }
    }, {})

    const result = applyWorldNpcSocialSimulation(state, () => 0)
    const outgoingKeys = Object.keys(result.relationships).filter(
      (key) => key.startsWith('npc-garet-doyle→') && result.relationships[key]?.softBond,
    )
    const survivingSeededTargets = worldNpcIds.filter(
      (npcId) => result.relationships[buildRelationshipKey('npc-garet-doyle', npcId)],
    )

    expect(outgoingKeys).toHaveLength(5)
    expect(survivingSeededTargets.length).toBeLessThan(worldNpcIds.length)
    expect(result.relationships[buildRelationshipKey('npc-garet-doyle', 'npc-sister-vael')]?.softBond)
      .toBeDefined()
  })

  it('does not promote romance while the soft-bond strength is below the threshold', () => {
    const key = buildRelationshipKey('npc-garet-doyle', 'npc-sister-vael')
    const reverse = buildRelationshipKey('npc-sister-vael', 'npc-garet-doyle')
    const state = makeState()
    state.relationships = {
      [key]: {
        affinity: 32,
        respect: 0,
        fear: 0,
        trust: 36,
        loyalty: 6,
        bondType: 'friendship',
        softBond: { strength: 44, since: 2, visibility: 'rumored' },
      },
      [reverse]: {
        affinity: 32,
        respect: 0,
        fear: 0,
        trust: 36,
        loyalty: 6,
        bondType: 'friendship',
        softBond: { strength: 44, since: 2, visibility: 'rumored' },
      },
    }

    const result = applyWorldNpcSocialSimulation(state, () => 0.99)

    expect(result.relationships[key]?.bondType).toBe('friendship')
    expect(result.relationships[key]?.intimacyStage ?? 'none').toBe('none')
  })
})
