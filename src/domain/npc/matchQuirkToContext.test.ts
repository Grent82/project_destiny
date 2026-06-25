import { describe, it, expect } from 'vitest'
import { matchQuirkToContext } from './matchQuirkToContext'
import type { NpcDefinition } from './contracts'

const baseNpc: NpcDefinition = {
  id: 'npc-test',
  name: 'Test NPC',
  npcType: 'roster',
  origin: 'test',
  background: 'test background',
  rarity: 'common',
  status: 'citizen',
  factionAffinityId: null,
  baseAttributes: { might: 10, agility: 10, endurance: 10, intellect: 10, perception: 10, presence: 10, resolve: 10 },
  startingSkills: {
    melee: 50, ranged: 50, medicine: 50, administration: 50, engineering: 50, negotiation: 50,
    survival: 50, security: 50, crafting: 50, performance: 50, academics: 50, intrigue: 50,
  },
  startingTraits: {
    loyalty: 50, discipline: 50, empathy: 50, ruthlessness: 50,
    ambition: 50, prudence: 50, vanity: 50, dominance: 50, curiosity: 50, zeal: 50,
  },
  allowedTitleIds: [],
  loyalties: [],
  schedule: {},
  consentPreferences: {
    requiredStage: 'committed',
    requiresExplicitConsent: false,
    opennessLevel: 'moderate',
    boundaries: [],
  },
  quirks: [
    {
      text: 'checks every beam before trusting a structure',
      tags: ['cautious'],
      triggerKeywords: ['hazard', 'structure', 'danger'],
    },
    {
      text: 'never discusses past debts',
      tags: ['secretive'],
      triggerKeywords: ['debt', 'obligation', 'ledger'],
    },
  ],
}

describe('matchQuirkToContext', () => {
  it('returns the first matching quirk when context overlaps with triggerKeywords', () => {
    const result = matchQuirkToContext(baseNpc, ['hazard', 'climbing'])
    expect(result).not.toBeNull()
    expect(result?.text).toBe('checks every beam before trusting a structure')
  })

  it('returns later quirk when only later keywords match', () => {
    const result = matchQuirkToContext(baseNpc, ['debt', 'repayment'])
    expect(result?.text).toBe('never discusses past debts')
  })

  it('returns null when no context tags match any quirk', () => {
    const result = matchQuirkToContext(baseNpc, ['weather', 'festival'])
    expect(result).toBeNull()
  })

  it('returns null when contextTags is empty', () => {
    const result = matchQuirkToContext(baseNpc, [])
    expect(result).toBeNull()
  })

  it('returns null when NPC has no quirks', () => {
    const npcNoQuirks = { ...baseNpc, quirks: [] }
    const result = matchQuirkToContext(npcNoQuirks, ['danger', 'hazard'])
    expect(result).toBeNull()
  })

  it('is case-insensitive for keyword matching', () => {
    const result = matchQuirkToContext(baseNpc, ['HAZARD'])
    expect(result).not.toBeNull()
  })
})
