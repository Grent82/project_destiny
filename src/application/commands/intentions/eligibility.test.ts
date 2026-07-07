import { describe, it, expect } from 'vitest'
import {
  intentionTypesForNpc,
  ALL_INTENTION_TYPES,
  WORLD_ELIGIBLE_INTENTION_TYPES,
} from './eligibility'
import { idaRhysRosterEntry } from '../testFixtures'
import { npcIntentionTypeSchema } from '../../../domain/shared/contracts'
import type { NpcRuntimeState } from '../../../domain/npc/contracts'

function npc(overrides: Partial<NpcRuntimeState>): NpcRuntimeState {
  return { ...idaRhysRosterEntry, ...overrides }
}

describe('intentionTypesForNpc', () => {
  it('roster NPCs are eligible for every intention type', () => {
    const result = intentionTypesForNpc(npc({ npcType: 'roster' }))
    expect(result).toBe(ALL_INTENTION_TYPES)
    // sanity: it really is the full enum
    expect(result.size).toBe(npcIntentionTypeSchema.options.length)
    // incl. the player-house-only actions that world NPCs must NOT get
    expect(result.has('protect-house')).toBe(true)
    expect(result.has('care-for-injured')).toBe(true)
  })

  it('world NPCs get the living-world subset', () => {
    const result = intentionTypesForNpc(npc({ npcType: 'world' }))
    expect(result).toBe(WORLD_ELIGIBLE_INTENTION_TYPES)
    // they LIVE: self-care, ambient social, NPC-NPC romance, district/faction life
    for (const t of ['eat-meal', 'sleep', 'socialize', 'gossip', 'flirt-with', 'confront-rival', 'consolidate-power'] as const) {
      expect(result.has(t)).toBe(true)
    }
  })

  it('world NPCs are eligible for travel-district at the npcType level (destiny-q80n.10.1)', () => {
    // The further per-individual poi.npcId-link exclusion happens in
    // processAllowlistedNpcIntentions, not here -- this set is purely npcType-based.
    const result = intentionTypesForNpc(npc({ npcType: 'world' }))
    expect(result.has('travel-district')).toBe(true)
  })

  it('story NPCs share the world subset', () => {
    expect(intentionTypesForNpc(npc({ npcType: 'story' }))).toBe(WORLD_ELIGIBLE_INTENTION_TYPES)
  })

  it('excludes player-house-only actions for world NPCs', () => {
    const result = intentionTypesForNpc(npc({ npcType: 'world' }))
    for (const t of ['protect-house', 'fortify-position', 'care-for-injured'] as const) {
      expect(result.has(t)).toBe(false)
    }
  })

  it('excludes player-economy / hiring actions for world NPCs', () => {
    const result = intentionTypesForNpc(npc({ npcType: 'world' }))
    for (const t of ['seek-employment', 'seek-tips', 'beg-for-coin', 'black-market-trade', 'scavenge-for-sell', 'resource-gather', 'scavenge', 'shop-for-goods'] as const) {
      expect(result.has(t)).toBe(false)
    }
  })

  it('excludes roster-coupled intrigue/dominance, groups, and host-gathering for world NPCs', () => {
    const result = intentionTypesForNpc(npc({ npcType: 'world' }))
    for (const t of ['spy-on', 'gather-leverage', 'assert-dominance', 'lead-group', 'support-group', 'form-squad', 'recruit-member', 'host-gathering'] as const) {
      expect(result.has(t)).toBe(false)
    }
  })

  it('enemy runtime NPCs get no intentions', () => {
    expect(intentionTypesForNpc(npc({ npcType: 'enemy' })).size).toBe(0)
  })

  it('captives are eligible for exactly escape-attempt, regardless of npcType (destiny-ap3s carve-out)', () => {
    const captiveRoster = npc({
      npcType: 'roster',
      captivityState: { ...(idaRhysRosterEntry.captivityState ?? ({} as NonNullable<NpcRuntimeState['captivityState']>)), status: 'captive' } as NpcRuntimeState['captivityState'],
    })
    const result = intentionTypesForNpc(captiveRoster)
    expect(result.size).toBe(1)
    expect(result.has('escape-attempt')).toBe(true)
  })
})
