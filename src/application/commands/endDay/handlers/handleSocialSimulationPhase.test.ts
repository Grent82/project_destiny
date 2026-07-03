import { describe, it, expect } from 'vitest'

import { handleSocialSimulationPhase } from './handleSocialSimulationPhase'
import { WIRED_INTENTION_TYPES } from '../../intentions'
import { createRng } from '../../seededRng'
import { initialGameStateSnapshot } from '../../../store/initialGameState'
import { idaRhysRosterEntry } from '../../testFixtures'
import type { GameState } from '../../../../domain/game/contracts'

describe('handleSocialSimulationPhase — NPC Intention wiring (destiny-mbju and follow-ups)', () => {
  it('never assigns or leaves a currentIntention outside the wired allowlist after a full phase run', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          assignment: 'idle',
          currentDirectiveId: null,
          currentIntention: null,
          factionRelationships: [],
          traits: {
            ...initialGameStateSnapshot.roster[0]!.traits,
            empathy: 70,
            loyalty: 70,
          },
        },
        { ...idaRhysRosterEntry, assignment: 'idle', currentDirectiveId: null, currentIntention: null },
      ],
    }

    const result = handleSocialSimulationPhase(state, createRng(12345).rng)

    const marion = result.roster.find((n) => n.npcId === state.roster[0]!.npcId)
    if (marion!.currentIntention) {
      expect(WIRED_INTENTION_TYPES.has(marion!.currentIntention.type)).toBe(true)
    }
  })

  it('runs generation and execution for the wired allowlist without throwing, and resolves any assigned intention within the same day', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          assignment: 'idle',
          currentDirectiveId: null,
          currentIntention: null,
          factionRelationships: [],
          traits: {
            ...initialGameStateSnapshot.roster[0]!.traits,
            empathy: 70,
            loyalty: 70,
          },
        },
        { ...idaRhysRosterEntry, assignment: 'idle', currentDirectiveId: null, currentIntention: null },
      ],
    }

    const result = handleSocialSimulationPhase(state, createRng(12345).rng)

    // Whatever (if anything) was generated for the wired allowlist was also executed and cleared
    // in the same phase run — no NPC should end the phase still holding a wired intention.
    const marion = result.roster.find((n) => n.npcId === state.roster[0]!.npcId)
    expect(marion!.currentIntention).toBeNull()
  })

  it('resolves a pre-existing money-earning intention within the phase (regression: this path used to be starved — nothing ever generated a money-earning currentIntention, so it was never exercised in a live day)', () => {
    // Rather than relying on the (deterministic, non-RNG) pipeline to naturally pick a
    // money-earning candidate — which this test shouldn't need to reverse-engineer — pre-set the
    // intention directly and confirm the phase resolves it end-to-end (either earning cash or at
    // minimum clearing the intention), proving applyMoneyEarningIntentions is reachable from a
    // real currentIntention within a full handleSocialSimulationPhase run.
    const state: GameState = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          assignment: 'idle',
          currentDirectiveId: null,
          assignedDistrictId: 'district-the-pale',
          skills: { ...initialGameStateSnapshot.roster[0]!.skills, intrigue: 90, security: 90 },
          currentIntention: {
            type: 'black-market-trade',
            targetId: 'district-the-pale',
            targetType: 'district',
            priority: 3,
            urgencyDays: 1,
            confidence: 50,
            createdAtDay: 1,
            expiresAtDay: 2,
            validTimeSlots: ['morning', 'afternoon', 'evening', 'night'],
          },
          factionRelationships: [],
        },
      ],
    }

    const result = handleSocialSimulationPhase(state, createRng(12345).rng)
    const npc = result.roster.find((n) => n.npcId === state.roster[0]!.npcId)

    expect(npc!.currentIntention).toBeNull()
  })
})
