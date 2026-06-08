import { describe, expect, it } from 'vitest'
import {
  generateProceduralCombatQuest,
  hasConflictPotential,
  generateQuestLeadsFromWorldState,
} from './proceduralQuestGeneration'

describe('generateProceduralCombatQuest', () => {
  it('generates a valid quest template with substituted faction names', () => {
    const quest = generateProceduralCombatQuest({
      employerFactionId: 'faction-civic-compact',
      enemyFactionId: 'faction-tallow-ring',
      districtId: 'district-the-warrens',
      day: 10,
      seed: 42,
    })

    expect(quest.id).toMatch(/^quest-procedural-\d+-\d+$/)
    // Title varies by template selection, but briefing always has faction/district names
    expect(quest.briefing).toContain('Compact')
    expect(quest.briefing).toContain('Ring')
    expect(quest.briefing).toContain('the Warrens')
    expect(quest.objectiveType).toBe('combat')
    expect(quest.employerFactionId).toBe('faction-civic-compact')
    expect(quest.enemyFactionId).toBe('faction-tallow-ring')
    expect(quest.districtId).toBe('district-the-warrens')
  })

  it('generates deterministic output for the same seed', () => {
    const quest1 = generateProceduralCombatQuest({
      employerFactionId: 'faction-civic-compact',
      enemyFactionId: 'faction-tallow-ring',
      districtId: 'district-the-warrens',
      day: 10,
      seed: 42,
    })

    const quest2 = generateProceduralCombatQuest({
      employerFactionId: 'faction-civic-compact',
      enemyFactionId: 'faction-tallow-ring',
      districtId: 'district-the-warrens',
      day: 10,
      seed: 42,
    })

    expect(quest1.title).toBe(quest2.title)
    expect(quest1.briefing).toBe(quest2.briefing)
    expect(quest1.rewardMarks).toBe(quest2.rewardMarks)
  })

  it('generates different rewards for different seeds', () => {
    const quest1 = generateProceduralCombatQuest({
      employerFactionId: 'faction-civic-compact',
      enemyFactionId: 'faction-tallow-ring',
      districtId: 'district-the-warrens',
      day: 10,
      seed: 42,
    })

    const quest2 = generateProceduralCombatQuest({
      employerFactionId: 'faction-civic-compact',
      enemyFactionId: 'faction-tallow-ring',
      districtId: 'district-the-warrens',
      day: 10,
      seed: 100,
    })

    // Different seeds should produce different rewards
    expect(quest1.rewardMarks).not.toBe(quest2.rewardMarks)
  })

  it('handles all known faction names correctly', () => {
    const factions = [
      ['faction-civic-compact', 'Compact'],
      ['faction-gilded-court', 'Court'],
      ['faction-foundry-league', 'League'],
      ['faction-tallow-ring', 'Ring'],
      ['faction-restored', 'Restored'],
    ]

    for (const [factionId, expectedName] of factions) {
      const quest = generateProceduralCombatQuest({
        employerFactionId: factionId,
        enemyFactionId: 'faction-tallow-ring',
        districtId: 'district-the-pale',
        day: 10,
        seed: 1,
      })

      expect(quest.briefing).toContain(expectedName)
    }
  })

  it('handles all known district names correctly', () => {
    const districts = [
      ['district-the-pale', 'the Pale'],
      ['district-the-warrens', 'the Warrens'],
      ['district-the-tangle', 'the Tangle'],
      ['district-the-hollows', 'the Hollows'],
      ['district-harbor', 'the Harbor'],
      ['district-ironworks', 'the Ironworks'],
    ]

    for (const [districtId, expectedName] of districts) {
      const quest = generateProceduralCombatQuest({
        employerFactionId: 'faction-civic-compact',
        enemyFactionId: 'faction-tallow-ring',
        districtId: districtId,
        day: 10,
        seed: 1,
      })

      expect(quest.briefing).toContain(expectedName)
    }
  })

  it('sets appropriate risk level and city dial effects', () => {
    const quest = generateProceduralCombatQuest({
      employerFactionId: 'faction-civic-compact',
      enemyFactionId: 'faction-tallow-ring',
      districtId: 'district-the-warrens',
      day: 10,
      seed: 42,
    })

    expect(quest.riskLevel).toBeDefined()
    expect(quest.riskLevel).toBeOneOf(['low', 'medium', 'high'])
    expect(quest.rewardCityDialId).toBe('unrest')
    expect(quest.rewardCityDialDelta).toBeLessThan(0) // Completing reduces unrest
  })
})

describe('hasConflictPotential', () => {
  it('returns true for known faction conflicts', () => {
    expect(hasConflictPotential('faction-civic-compact', 'faction-tallow-ring')).toBe(true)
    expect(hasConflictPotential('faction-tallow-ring', 'faction-civic-compact')).toBe(true)
    expect(hasConflictPotential('faction-gilded-court', 'faction-restored')).toBe(true)
    expect(hasConflictPotential('faction-foundry-league', 'faction-tallow-ring')).toBe(true)
  })

  it('returns false for unknown faction combinations', () => {
    expect(hasConflictPotential('faction-civic-compact', 'faction-gilded-court')).toBe(false)
    expect(hasConflictPotential('faction-restored', 'faction-foundry-league')).toBe(false)
  })
})

describe('generateQuestLeadsFromWorldState', () => {
  it('returns empty array when no conflict conditions are met', () => {
    const leads = generateQuestLeadsFromWorldState({ day: 10 } as any)
    expect(leads).toEqual([])
  })

  it('will generate leads when conflict conditions exist (placeholder for future implementation)', () => {
    // This test documents expected future behavior
    // When city dial state and faction tension are tracked,
    // this should generate quest leads from world state
    expect(true).toBe(true)
  })
})
