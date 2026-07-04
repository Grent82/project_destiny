import { describe, it, expect } from 'vitest'
import { createRuntimeStateFromDefinition, buildInitialArc } from './createRuntimeStateFromDefinition'
import { contentCatalog } from '../content/contentCatalog'
import { npcRuntimeStateSchema } from '../../domain/npc/contracts'

// A story-type def with no defaultArcId, and a roster-type def with one (verified against npcs.json).
const STORY_NO_ARC = 'npc-dalen-morke'
const ROSTER_WITH_ARC = 'npc-nessa-vain'

describe('createRuntimeStateFromDefinition', () => {
  it('produces a fully schema-valid NpcRuntimeState for a known definition', () => {
    const result = createRuntimeStateFromDefinition(STORY_NO_ARC)
    // The factory parses internally, but assert independently that the shape is valid and complete.
    expect(npcRuntimeStateSchema.safeParse(result).success).toBe(true)
    expect(result.npcId).toBe(STORY_NO_ARC)
    expect(result.name).toBe(contentCatalog.npcsById.get(STORY_NO_ARC)!.name)
  })

  it('takes npcType from the definition (content kind), not a hardcoded value', () => {
    const result = createRuntimeStateFromDefinition(STORY_NO_ARC)
    expect(result.npcType).toBe(contentCatalog.npcsById.get(STORY_NO_ARC)!.npcType)
    expect(result.npcType).toBe('story')
  })

  it('defaults playerRosterMember to false — a hydrated definition-person is not on the player roster', () => {
    const result = createRuntimeStateFromDefinition(STORY_NO_ARC)
    expect(result.playerRosterMember).toBe(false)
  })

  it('copies attributes/skills/traits from the definition', () => {
    const def = contentCatalog.npcsById.get(STORY_NO_ARC)!
    const result = createRuntimeStateFromDefinition(STORY_NO_ARC)
    expect(result.attributes).toEqual(def.baseAttributes)
    expect(result.skills).toEqual(def.startingSkills)
    expect(result.traits).toEqual(def.startingTraits)
  })

  it('fills the required no-default fields (states, loadout) with sane baselines', () => {
    const result = createRuntimeStateFromDefinition(STORY_NO_ARC)
    expect(result.states.health).toBe(100)
    expect(result.states.hygiene).toBe(70)
    expect(result.states.hunger).toBe(0)
    expect(result.loadout).toEqual({
      primaryWeaponId: null,
      secondaryWeaponId: null,
      armorId: null,
      accessoryIds: [],
      consumableIds: [],
    })
    expect(result.assignment).toBe('idle')
  })

  it('applies overrides last, winning over the defaults (incl. playerRosterMember)', () => {
    const result = createRuntimeStateFromDefinition(STORY_NO_ARC, {
      playerRosterMember: true,
      assignment: 'working',
      worldDisposition: 'friendly',
    })
    expect(result.playerRosterMember).toBe(true)
    expect(result.assignment).toBe('working')
    expect(result.worldDisposition).toBe('friendly')
  })

  it('builds npcArc from the definition defaultArcId, entering the first stage on the given day', () => {
    const def = contentCatalog.npcsById.get(ROSTER_WITH_ARC)!
    expect(def.defaultArcId).toBeTruthy()
    const result = createRuntimeStateFromDefinition(ROSTER_WITH_ARC, {}, 7)
    expect(result.npcArc).not.toBeNull()
    expect(result.npcArc!.arcId).toBe(def.defaultArcId)
    expect(result.npcArc!.stageEnteredDay).toBe(7)
  })

  it('leaves npcArc null when the definition has no defaultArcId', () => {
    const result = createRuntimeStateFromDefinition(STORY_NO_ARC)
    expect(result.npcArc).toBeNull()
  })

  it('throws on an unknown npcId — hydrating a person with no identity is a bug, not a default', () => {
    expect(() => createRuntimeStateFromDefinition('npc-does-not-exist')).toThrow(/no NPC definition/)
  })
})

describe('buildInitialArc', () => {
  it('returns null for a missing/undefined arc id', () => {
    expect(buildInitialArc(null, 0)).toBeNull()
    expect(buildInitialArc(undefined, 0)).toBeNull()
  })

  it('returns null for an unknown arc id', () => {
    expect(buildInitialArc('arc-does-not-exist', 0)).toBeNull()
  })

  it('enters the first stage of a known arc on the given day', () => {
    const def = contentCatalog.npcsById.get(ROSTER_WITH_ARC)!
    const arc = buildInitialArc(def.defaultArcId, 12)
    expect(arc).not.toBeNull()
    expect(arc!.arcId).toBe(def.defaultArcId)
    expect(arc!.stageEnteredDay).toBe(12)
    expect(arc!.stageFlags).toEqual({})
    expect(arc!.driftHistory).toEqual([])
  })
})
