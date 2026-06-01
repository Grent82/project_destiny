import { describe, expect, it, vi } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { generateDistrictHireOffers } from './generateHireOffers'
import type { GameState } from '../../domain/game/contracts'
import { calculateMercenaryContractWage } from './wageRates'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialGameStateSnapshot,
    roster: [],
    availableForHire: [],
    factionStandings: {
      'faction-civic-compact': 10,
      'faction-gilded-court': -20,
      'faction-foundry-league': 5,
      'faction-tallow-ring': 15,
      'faction-restored': 0,
    },
    ...overrides,
  }
}

describe('generateDistrictHireOffers', () => {
  describe('faction-aligned NPCs in district', () => {
    it('prices Ida Rhys from the same top-3 skill contract formula used by the market', () => {
      expect(
        calculateMercenaryContractWage({
          melee: 39,
          ranged: 33,
          medicine: 12,
          administration: 18,
          engineering: 73,
          negotiation: 16,
          survival: 28,
          security: 31,
          crafting: 69,
          performance: 6,
          academics: 22,
          intrigue: 11,
        }),
      ).toBe(12)
    })

    it('adds NPCs whose factionAffinityId matches the district controlling faction', () => {
      // district-harbor is controlled by faction-civic-compact
      // npc-marion-vale and npc-verek-holst have factionAffinityId: faction-civic-compact
      // Mock Math.random so non-matching NPCs never sneak in via randomAppearance (< 0.1)
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const state = makeState()
      generateDistrictHireOffers(state, 'district-harbor')
      vi.restoreAllMocks()
      const offeredIds = state.availableForHire.map((o) => o.npcId)
      expect(offeredIds).toContain('npc-marion-vale')
      expect(offeredIds).toContain('npc-verek-holst')
    })

    it('sets discoveredInDistrictId to the travel district', () => {
      const state = makeState()
      generateDistrictHireOffers(state, 'district-harbor')
      const marionOffer = state.availableForHire.find((o) => o.npcId === 'npc-marion-vale')
      expect(marionOffer?.discoveredInDistrictId).toBe('district-harbor')
    })

    it('calculates wagePerDay from top-3 skill average', () => {
      const state = makeState()
      generateDistrictHireOffers(state, 'district-harbor')
      const offer = state.availableForHire.find((o) => o.npcId === 'npc-marion-vale')
      expect(offer?.wagePerDay).toBeGreaterThanOrEqual(3)
      expect(offer?.wagePerDay).toBeLessThanOrEqual(20)
    })

    it('sets signingBonus to 3x wagePerDay', () => {
      const state = makeState()
      generateDistrictHireOffers(state, 'district-harbor')
      const offer = state.availableForHire.find((o) => o.npcId === 'npc-marion-vale')
      expect(offer?.signingBonus).toBe((offer?.wagePerDay ?? 0) * 3)
    })

    it('sets turnsAvailable to 4', () => {
      const state = makeState()
      generateDistrictHireOffers(state, 'district-harbor')
      const offer = state.availableForHire.find((o) => o.npcId === 'npc-marion-vale')
      expect(offer?.turnsAvailable).toBe(4)
    })
  })

  describe('independent NPCs', () => {
    it('adds independent NPCs (no factionAffinityId) in low-danger districts', () => {
      // npc-sable-wrent has factionAffinityId: null
      // district-harbor has dangerLevel: 2
      // Pass reputationScore=80 → poolSize=4, no loyalty filter
      const state = makeState()
      generateDistrictHireOffers(state, 'district-harbor', 80)
      const offeredIds = state.availableForHire.map((o) => o.npcId)
      expect(offeredIds).toContain('npc-sable-wrent')
    })
  })

  describe('skipping already-hired NPCs', () => {
    it('does not offer an NPC already on the roster', () => {
      const state = makeState({
        roster: [
          {
            ...initialGameStateSnapshot.roster[0] ?? {
              npcId: 'npc-marion-vale',
              name: 'Marion Vale',
              status: 'retainer' as const,
              assignment: 'idle' as const,
              activeTitle: null,
              wagesOwedDays: 0,
              attributes: { might: 38, agility: 47, endurance: 44, intellect: 63, perception: 58, presence: 66, resolve: 61 },
              skills: { melee: 22, ranged: 19, medicine: 14, administration: 61, engineering: 18, negotiation: 68, survival: 20, security: 25, crafting: 12, performance: 10, academics: 24, intrigue: 41 },
              traits: { discipline: 62, ambition: 71, empathy: 43, ruthlessness: 34, prudence: 67, curiosity: 48, dominance: 56, loyalty: 52, vanity: 31, zeal: 22 },
              states: { health: 100, fatigue: 0, stress: 0, morale: 80, fear: 0, anger: 0, hunger: 0, injury: 0, intoxication: 0, hygiene: 100 },
              loadout: { primaryWeaponId: null, sidearmId: null, armorId: null },
              relationships: {},
            },
            npcId: 'npc-marion-vale',
          },
        ],
      })
      generateDistrictHireOffers(state, 'district-harbor')
      const offeredIds = state.availableForHire.map((o) => o.npcId)
      expect(offeredIds).not.toContain('npc-marion-vale')
    })
  })

  describe('skipping already-offered NPCs', () => {
    it('does not duplicate an NPC already in availableForHire', () => {
      const state = makeState({
        availableForHire: [
          {
            npcId: 'npc-verek-holst',
            discoveredInDistrictId: 'district-harbor',
            wagePerDay: 18,
            signingBonus: 0,
            requiredFactionId: null,
            requiredFactionStanding: 0,
            turnsAvailable: 3,
          },
        ],
      })
      generateDistrictHireOffers(state, 'district-harbor')
      const verekOffers = state.availableForHire.filter((o) => o.npcId === 'npc-verek-holst')
      expect(verekOffers).toHaveLength(1)
    })
  })

  describe('hostile faction standing blocks NPC', () => {
    it('does not offer faction-affiliated NPCs when faction standing < -20', () => {
      // npc-maret-sunne has factionAffinityId: faction-civic-compact
      // Set compact standing to -30 (hostile)
      const state = makeState({
        factionStandings: {
          'faction-civic-compact': -30,
          'faction-gilded-court': 0,
          'faction-foundry-league': 0,
          'faction-tallow-ring': 0,
          'faction-restored': 0,
        },
      })
      generateDistrictHireOffers(state, 'district-harbor')
      const offeredIds = state.availableForHire.map((o) => o.npcId)
      expect(offeredIds).not.toContain('npc-maret-sunne')
      expect(offeredIds).not.toContain('npc-marion-vale')
      expect(offeredIds).not.toContain('npc-verek-holst')
    })

    it('offers faction-affiliated NPCs when standing is exactly -20 (boundary)', () => {
      const state = makeState({
        factionStandings: {
          'faction-civic-compact': -20,
          'faction-gilded-court': 0,
          'faction-foundry-league': 0,
          'faction-tallow-ring': 0,
          'faction-restored': 0,
        },
      })
      generateDistrictHireOffers(state, 'district-harbor')
      const offeredIds = state.availableForHire.map((o) => o.npcId)
      expect(offeredIds).toContain('npc-marion-vale')
    })
  })

  describe('random appearance', () => {
    it('does not add a non-matching faction NPC when random chance is below threshold', () => {
      // Mock Math.random to return 0.5 (above 0.1 threshold) → no random appearance
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const state = makeState()
      generateDistrictHireOffers(state, 'district-harbor')
      const offeredIds = state.availableForHire.map((o) => o.npcId)
      // npc-lirien-ashcroft is gilded-court, not civic-compact → should NOT appear
      expect(offeredIds).not.toContain('npc-lirien-ashcroft')
      spy.mockRestore()
    })
  })
})
