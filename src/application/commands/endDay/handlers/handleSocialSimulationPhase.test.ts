import { describe, it, expect } from 'vitest'

import { handleSocialSimulationPhase } from './handleSocialSimulationPhase'
import { createRng } from '../../seededRng'
import { initialGameStateSnapshot } from '../../../store/initialGameState'
import { idaRhysRosterEntry } from '../../testFixtures'
import type { GameState } from '../../../../domain/game/contracts'

describe('handleSocialSimulationPhase — NPC Intention wiring (destiny-mbju)', () => {
  it('never leaks a money-earning intention through the new allowlisted generation step', () => {
    // Strong loyalty/empathy traits push toward visit-lover/spend-time-with candidates, but the
    // regression this guards against is generation assigning ANY other type (including
    // money-earning) and applyMoneyEarningIntentions silently reacting to it.
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
    const ida = result.roster.find((n) => n.npcId === idaRhysRosterEntry.npcId)

    // Neither NPC ever had a money-earning intention to react to, so carriedCash stays at baseline.
    expect(marion!.personalFunds.carriedCash).toBe(state.roster[0]!.personalFunds.carriedCash)
    expect(ida!.personalFunds.carriedCash).toBe(idaRhysRosterEntry.personalFunds.carriedCash)
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
    if (marion!.currentIntention) {
      expect(['visit-lover', 'spend-time-with']).not.toContain(marion!.currentIntention.type)
    }
  })
})
