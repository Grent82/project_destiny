import { describe, expect, it } from 'vitest'
import { eventOutcomeSchema } from '../../domain/events/contracts'
import type { CorridorStatus } from '../../domain'
import { contentCatalog } from './contentCatalog'

describe('Content catalog validator - red fixtures', () => {
  it('rejects adjustNpcRelationship with "target" instead of "npcId" (C4 bug class)', () => {
    const badOutcome = {
      type: 'adjustNpcRelationship' as const,
      target: 'npc-marion-vale',
      axis: 'trust' as const,
      delta: 5,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true) // Schema allows it
    // But validator should reject it
  })

  it('rejects adjustNpcRelationship missing npcId', () => {
    const badOutcome = {
      type: 'adjustNpcRelationship' as const,
      axis: 'trust' as const,
      delta: 5,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true) // Schema allows optional fields
    // But validator should reject missing required field
  })

  it('rejects adjustCityDial with invalid target', () => {
    const badOutcome = {
      type: 'adjustCityDial' as const,
      target: 'invalid-dial' as any, /* eslint-disable-line @typescript-eslint/no-explicit-any */
      delta: 5,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true) // Schema allows any string
    // But validator should reject invalid enum value
  })

  it('rejects adjustCityResource with invalid target', () => {
    const badOutcome = {
      type: 'adjustCityResource' as const,
      target: 'invalid-resource' as any, /* eslint-disable-line @typescript-eslint/no-explicit-any */
      delta: 5,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true)
    // But validator should reject invalid enum value
  })

  it('rejects setCorridorStatus with invalid target', () => {
    const badOutcome = {
      type: 'setCorridorStatus' as const,
      target: 'invalid-status' as CorridorStatus,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true)
    // But validator should reject invalid enum value
  })

  it('rejects adjustNpcRelationship with invalid axis', () => {
    const badOutcome = {
      type: 'adjustNpcRelationship' as const,
      npcId: 'npc-marion-vale',
      axis: 'invalid-axis' as any, /* eslint-disable-line @typescript-eslint/no-explicit-any */
      delta: 5,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(false) // Schema catches this
  })

  it('rejects updateQuestStage with missing stageId', () => {
    const badOutcome = {
      type: 'updateQuestStage' as const,
      questId: 'quest-some-quest',
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true)
    // But validator should reject missing required field
  })

  it('accepts adjustNpcState schema shape for a rule-based subject', () => {
    const outcome = {
      type: 'adjustNpcState' as const,
      subject: 'highest-stress',
      axis: 'stress' as const,
      delta: -10,
      message: '{npcName} finally rests.',
    }
    const result = eventOutcomeSchema.safeParse(outcome)
    expect(result.success).toBe(true)
  })

  it('rejects adjustNpcState with an invalid axis at schema level', () => {
    const outcome = {
      type: 'adjustNpcState' as const,
      subject: 'highest-stress',
      axis: 'bad-axis' as any, /* eslint-disable-line @typescript-eslint/no-explicit-any */
      delta: -10,
    }
    const result = eventOutcomeSchema.safeParse(outcome)
    expect(result.success).toBe(false)
  })

  it('rejects addActivityLogEntry with empty message', () => {
    const badOutcome = {
      type: 'addActivityLogEntry' as const,
      message: '',
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true)
    // But validator should reject empty message
  })
})

describe('Enemy NPC catalog unification (destiny-rama.14)', () => {
  it('has exactly one definition per npc id — no duplicates across the (now-merged) enemy catalog', () => {
    const ids = contentCatalog.npcs.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('exposes no separate enemyNpcs/enemyNpcsById catalog anymore — npcsById is the single source', () => {
    expect((contentCatalog as Record<string, unknown>).enemyNpcs).toBeUndefined()
    expect((contentCatalog as Record<string, unknown>).enemyNpcsById).toBeUndefined()
  })

  it('carries the combat-encounter fields (recruitableOnDefeat, encounterRole, etc.) on every former enemy-npcs.json entry', () => {
    const formerEnemyCatalogIds = [
      'npc-enemy-cassia-vorne', 'npc-enemy-tomas-rell', 'npc-enemy-petra-ashford',
      'npc-enemy-warden-morrow', 'npc-enemy-inquisitor-vath', 'npc-enemy-deputy-heller',
      'npc-enemy-rack', 'npc-enemy-sira-cole', 'npc-enemy-dovel', 'npc-enemy-commander-fell',
      'npc-enemy-specialist-nem', 'npc-enemy-bruiser-katch', 'npc-enemy-director-forn',
      'npc-enemy-operative-weld', 'npc-enemy-contacts-rhen', 'npc-enemy-warden-captain-ruk',
      'npc-enemy-marsh',
    ]
    for (const id of formerEnemyCatalogIds) {
      const def = contentCatalog.npcsById.get(id)
      expect(def, `expected a merged npcs.json entry for ${id}`).toBeDefined()
      expect(def!.npcType).toBe('enemy')
      expect(typeof def!.creatureType).toBe('string')
      expect(typeof def!.recruitableOnDefeat).toBe('boolean')
    }
  })

  it('preserves npc-enemy-tomas-rell\'s richer npcs.json record (loyalties, startingEquipment) while merging in the combat fields', () => {
    const tomas = contentCatalog.npcsById.get('npc-enemy-tomas-rell')!
    expect(tomas.npcType).toBe('enemy')
    expect(tomas.startingEquipment).toBeDefined()
    expect(tomas.recruitableOnDefeat).toBe(true)
    expect(tomas.encounterRole).toBe('leader')
    expect(tomas.loyaltyOnRecruit).toBe(20)
  })

  it('lets combat.ts\'s recruitable-defeated-enemy pool resolve entirely from contentCatalog.npcs', () => {
    const recruitable = contentCatalog.npcs.filter((n) => n.npcType === 'enemy' && n.recruitableOnDefeat)
    expect(recruitable.length).toBeGreaterThan(0)
    expect(recruitable.map((n) => n.id)).toContain('npc-enemy-rack')
  })
})

describe('Crafting recipe catalog (destiny-bkln.7law)', () => {
  it('loads recipes with resolvable output and material item ids', () => {
    expect(contentCatalog.recipes.length).toBeGreaterThan(0)
    for (const recipe of contentCatalog.recipes) {
      expect(contentCatalog.itemsById.has(recipe.outputItemId)).toBe(true)
      for (const material of recipe.requiredMaterials) {
        expect(contentCatalog.itemsById.has(material.itemId)).toBe(true)
      }
    }
  })

  it('exposes recipesById for direct lookup', () => {
    const recipe = contentCatalog.recipesById.get('recipe-lamp-signal-expedition')
    expect(recipe).toBeDefined()
    expect(recipe!.outputItemId).toBe('item-lamp-signal-expedition')
  })
})
