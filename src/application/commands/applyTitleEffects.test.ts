import { describe, expect, it } from 'vitest'
import { applyTitleEffects } from './applyTitleEffects'
import { initialGameStateSnapshot } from '../store/initialGameState'

const deterministicRng = () => 0.5

describe('applyTitleEffects — faction affinity passive standing', () => {
  it('applies +1 standing with affiliated faction on even days when NPC has active title', () => {
    // Marion Vale is in the initial roster with factionAffinityId: faction-civic-compact
    const state = {
      ...initialGameStateSnapshot,
      day: 2, // even day → affinity triggers
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-steward' } : npc,
      ),
      factionStandings: { 'faction-civic-compact': 0 },
    }

    const result = applyTitleEffects(state, deterministicRng)

    expect(result.factionStandings['faction-civic-compact']).toBe(1)
  })

  it('does not apply affinity standing on odd days', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 3, // odd day → no affinity gain
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-steward' } : npc,
      ),
      factionStandings: { 'faction-civic-compact': 5 },
    }

    const result = applyTitleEffects(state, deterministicRng)

    expect(result.factionStandings['faction-civic-compact']).toBe(5)
  })

  it('does not apply affinity standing when NPC has no active title', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 2,
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: null } : npc,
      ),
      factionStandings: { 'faction-civic-compact': 0 },
    }

    const result = applyTitleEffects(state, deterministicRng)

    // Faction income grants (Step 4e) only fire at standing ≥ 50 so no change expected here
    expect(result.factionStandings['faction-civic-compact']).toBe(0)
  })

  it('caps affinity standing gain at 30 — does not increment when standing is already 30', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 2,
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-steward' } : npc,
      ),
      factionStandings: { 'faction-civic-compact': 30 },
    }

    const result = applyTitleEffects(state, deterministicRng)

    expect(result.factionStandings['faction-civic-compact']).toBe(30)
  })

  it('caps at 30 when standing would otherwise exceed it', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 2,
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-steward' } : npc,
      ),
      factionStandings: { 'faction-civic-compact': 29 },
    }

    const result = applyTitleEffects(state, deterministicRng)

    expect(result.factionStandings['faction-civic-compact']).toBe(30)
  })

  it('adds an activity log entry describing the affinity gain', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 2,
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-steward' } : npc,
      ),
      factionStandings: { 'faction-civic-compact': 0 },
    }

    const result = applyTitleEffects(state, deterministicRng)

    const affinityLog = result.activityLog.find(
      (e) => e.message.includes('standing') && e.message.includes('Marion Vale'),
    )
    expect(affinityLog).toBeDefined()
  })

  it('does not apply affinity standing when NPC has no faction affinity', () => {
    // Inject a fake NPC with no affinity into state
    const noAffinityNpc = {
      ...initialGameStateSnapshot.roster[0]!,
      npcId: 'npc-no-affinity-test',
      name: 'Generic NPC',
      activeTitle: 'title-trainer' as const,
    }
    const state = {
      ...initialGameStateSnapshot,
      day: 2,
      // Use the Marion Vale slot but override with no-affinity npc
      roster: [noAffinityNpc],
      factionStandings: {},
    }

    const result = applyTitleEffects(state, deterministicRng)
    // No faction standing should have been created
    expect(Object.keys(result.factionStandings).filter((k) => k.startsWith('faction-'))).toHaveLength(0)
  })
})
