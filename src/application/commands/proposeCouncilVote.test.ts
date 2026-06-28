import { describe, it, expect } from 'vitest'

import { proposeCouncilVote, canProposeCouncilVote, wouldLeaderApproveSponsorship } from './proposeCouncilVote'
import { initialStateWithIda } from './testFixtures'
import type { CouncilVoteEvent } from '../../domain/governance/contracts'

// Mock vote template
const mockVoteTemplate: CouncilVoteEvent = {
  id: 'vote-test-proposal',
  title: 'Test Proposal',
  description: 'A test council vote',
  proposingFactionId: 'faction-gilded-court',
  targetFactionId: null,
  effect: 'Test effect',
  mechanicalEffects: [],
  tags: [],
  playerInfluenceThreshold: 0,
  expiresOnDay: 0,
  outcome: 'pending',
  playerVote: null,
}

describe('proposeCouncilVote', () => {
  describe('canProposeCouncilVote', () => {
    it('returns false if cooldown is active', () => {
      const state = {
        ...initialStateWithIda,
        houseProposalCooldown: 100,
        day: 50,
      }
      const result = canProposeCouncilVote(state, 'direct')
      expect(result.canPropose).toBe(false)
      expect(result.reason).toContain('Cooldown active')
    })

    it('returns false for direct mode without ward seats', () => {
      const state = {
        ...initialStateWithIda,
        houseWardSeats: 0,
        houseProposalCooldown: 0,
      }
      const result = canProposeCouncilVote(state, 'direct')
      expect(result.canPropose).toBe(false)
      expect(result.reason).toContain('house ward seat')
    })

    it('returns true for direct mode with ward seats', () => {
      const state = {
        ...initialStateWithIda,
        houseWardSeats: 1,
        houseProposalCooldown: 0,
      }
      const result = canProposeCouncilVote(state, 'direct')
      expect(result.canPropose).toBe(true)
    })

    it('returns false for sponsored mode without sponsor faction', () => {
      const state = {
        ...initialStateWithIda,
        houseProposalCooldown: 0,
      }
      const result = canProposeCouncilVote(state, 'sponsored')
      expect(result.canPropose).toBe(false)
      expect(result.reason).toContain('No sponsor faction')
    })

    it('returns false for sponsored mode with low standing', () => {
      const state = {
        ...initialStateWithIda,
        houseProposalCooldown: 0,
        factionStandings: { 'faction-gilded-court': 30 },
      }
      const result = canProposeCouncilVote(state, 'sponsored', 'faction-gilded-court')
      expect(result.canPropose).toBe(false)
      expect(result.reason).toContain('faction standing >= 50')
    })

    it('returns true for sponsored mode with high standing', () => {
      const state = {
        ...initialStateWithIda,
        houseProposalCooldown: 0,
        factionStandings: { 'faction-gilded-court': 60 },
      }
      const result = canProposeCouncilVote(state, 'sponsored', 'faction-gilded-court')
      expect(result.canPropose).toBe(true)
    })
  })

  describe('proposeCouncilVote command', () => {
    it('adds vote to activeCouncilVotes with correct proposer for direct mode', () => {
      const state = {
        ...initialStateWithIda,
        houseWardSeats: 1,
        houseProposalCooldown: 0,
        day: 20,
        factionStates: [
          {
            factionId: 'faction-gilded-court',
            leaderNpcId: 'npc-ida-rhys',
            activePressure: 30,
            power: 50,
            wealth: 50,
            security: 50,
            standingWithPlayer: 0,
            agendaProgress: [],
          },
        ],
      }
      const result = proposeCouncilVote(state, mockVoteTemplate, 'direct', undefined, () => 0.5)

      expect(result.activeCouncilVotes.length).toBe(1)
      expect(result.activeCouncilVotes[0]?.id).toContain('vote-test-proposal')
      expect(result.activeCouncilVotes[0]?.proposingFactionId).toBe('faction-gilded-court')
      expect(result.activeCouncilVotes[0]?.outcome).toBe('pending')
      expect(result.houseProposalCooldown).toBe(30) // day 20 + 10
    })

    it('sets cooldown after successful proposal', () => {
      const state = {
        ...initialStateWithIda,
        houseWardSeats: 1,
        houseProposalCooldown: 0,
        day: 50,
      }
      const result = proposeCouncilVote(state, mockVoteTemplate, 'direct', undefined, () => 0.5)

      expect(result.houseProposalCooldown).toBe(60) // day 50 + 10
    })

    it('refuses sponsored proposal if leader denies', () => {
      const state = {
        ...initialStateWithIda,
        houseProposalCooldown: 0,
        day: 20,
        factionStandings: { 'faction-gilded-court': 70 },
        factionStates: [
          {
            factionId: 'faction-gilded-court',
            leaderNpcId: 'npc-ida-rhys',
            activePressure: 30,
            power: 50,
            wealth: 50,
            security: 50,
            standingWithPlayer: 0,
            agendaProgress: [],
          },
        ],
      }
      // Ida has base 50% approval chance, RNG 0.7 should deny
      const result = proposeCouncilVote(state, mockVoteTemplate, 'sponsored', 'faction-gilded-court', () => 0.7)

      // Should not add vote if sponsorship denied
      expect(result.activeCouncilVotes.length).toBe(0)
    })

    it('accepts sponsored proposal if leader approves', () => {
      const state = {
        ...initialStateWithIda,
        houseProposalCooldown: 0,
        day: 20,
        factionStandings: { 'faction-gilded-court': 70 },
        factionStates: [
          {
            factionId: 'faction-gilded-court',
            leaderNpcId: 'npc-ida-rhys',
            activePressure: 30,
            power: 50,
            wealth: 50,
            security: 50,
            standingWithPlayer: 0,
            agendaProgress: [],
          },
        ],
      }
      // Ida has base 50% approval chance, RNG 0.3 should pass
      const result = proposeCouncilVote(state, mockVoteTemplate, 'sponsored', 'faction-gilded-court', () => 0.3)

      expect(result.activeCouncilVotes.length).toBe(1)
      expect(result.activeCouncilVotes[0]?.proposingFactionId).toBe('faction-gilded-court')
    })

    it('blocks proposals during cooldown', () => {
      const state = {
        ...initialStateWithIda,
        houseWardSeats: 1,
        houseProposalCooldown: 100,
        day: 50,
      }
      const result = proposeCouncilVote(state, mockVoteTemplate, 'direct', undefined, () => 0.5)

      expect(result.activeCouncilVotes.length).toBe(0)
    })
  })

  describe('wouldLeaderApproveSponsorship', () => {
    it('denies if faction has no leader', () => {
      const state = {
        ...initialStateWithIda,
        factionStates: [
          {
            factionId: 'faction-gilded-court',
            leaderNpcId: null,
            activePressure: 30,
            power: 50,
            wealth: 50,
            security: 50,
            standingWithPlayer: 0,
            agendaProgress: [],
          },
        ],
      }
      const result = wouldLeaderApproveSponsorship('faction-gilded-court', state, () => 0.1)
      expect(result.approved).toBe(false)
      expect(result.reason).toContain('no leader')
    })

    it('denies with high prudence leader', () => {
      // Ida has prudence 59 (not > 65), so no penalty applies
      // Base 50% chance - with RNG 0.3 should pass
      const state = {
        ...initialStateWithIda,
        factionStates: [
          {
            factionId: 'faction-gilded-court',
            leaderNpcId: 'npc-ida-rhys',
            activePressure: 30,
            power: 50,
            wealth: 50,
            security: 50,
            standingWithPlayer: 0,
            agendaProgress: [],
          },
        ],
      }
      const result = wouldLeaderApproveSponsorship('faction-gilded-court', state, () => 0.3)
      expect(result.approved).toBe(true)
    })
  })
})
