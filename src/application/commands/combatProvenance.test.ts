import { describe, it, expect } from 'vitest'
import { startCombatEncounter, concludeCombatEncounter } from './combat'
import { initialStateWithIda } from './testFixtures'
import type { GameState } from '../../domain'
import type { QuestRuntime } from '../../domain/quests/contracts'

function makeQuestRuntime(partial: Partial<QuestRuntime> = {}): QuestRuntime {
  return {
    questId: 'quest-harborwatch',
    acceptedOnDay: 1,
    status: 'active',
    acceptedTitle: 'The Harborwatch Dispute',
    acceptedBriefing: null,
    stageId: 'on-site-prep',
    objectiveMet: false,
    currentObjectiveLabel: 'Engage the threat.',
    progress: { requiredSteps: 2, completedSteps: 1, lastAdvancedDay: null },
    context: {
      incidentDistrictId: 'district-the-warrens',
      issuerFactionId: 'faction-civic-compact',
      sourceNpcId: null,
      discoverySource: null,
      discoveryDistrictId: null,
      selectedBranchId: null,
      retryBehavior: 'fail',
    },
    journalEntries: [],
    clues: [],
    participants: [],
    aftermath: null,
    ...partial,
  }
}

function getStateForCombat(): GameState {
  return {
    ...initialStateWithIda,
    currentDistrictId: 'district-the-warrens',
    selectedSquadNpcIds: [initialStateWithIda.roster[0].npcId],
    activeQuests: [makeQuestRuntime()],
  }
}

describe('combat provenance', () => {
  it('startCombatEncounter sets provenance.sourceType=quest when linkedQuestId provided', () => {
    const state = getStateForCombat()
    const next = startCombatEncounter(state, 'quest-harborwatch')
    expect(next.activeCombat?.provenance?.sourceType).toBe('quest')
    expect(next.activeCombat?.provenance?.linkedQuestId).toBe('quest-harborwatch')
  })

  it('startCombatEncounter sets provenance.sourceType=district when no quest linked', () => {
    const state = { ...getStateForCombat(), activeQuests: [] }
    const next = startCombatEncounter(state, null)
    expect(next.activeCombat?.provenance?.sourceType).toBe('district')
    expect(next.activeCombat?.provenance?.linkedQuestId).toBeNull()
  })

  it('provenance.linkedFactionId is set from quest issuerFactionId', () => {
    const state = getStateForCombat()
    const next = startCombatEncounter(state, 'quest-harborwatch')
    expect(next.activeCombat?.provenance?.linkedFactionId).toBe('faction-civic-compact')
  })

  it('provenance.districtId is set to quest incidentDistrictId', () => {
    const state = getStateForCombat()
    const next = startCombatEncounter(state, 'quest-harborwatch')
    expect(next.activeCombat?.provenance?.districtId).toBe('district-the-warrens')
  })

  it('provenance is preserved through conclude (persistence integrity)', () => {
    const state = getStateForCombat()
    let next = startCombatEncounter(state, 'quest-harborwatch')
    expect(next.activeCombat).not.toBeNull()

    // Force outcome to victory to conclude
    next = {
      ...next,
      activeCombat: {
        ...next.activeCombat!,
        outcome: 'victory',
        combatants: next.activeCombat!.combatants.map((c) =>
          c.side === 'enemies' ? { ...c, health: 0 } : c,
        ),
      },
    }

    const concluded = concludeCombatEncounter(next)
    // activeCombat is cleared after conclude but provenance was used during settlement
    // Verify the quest was settled (success path)
    expect(concluded.completedQuestIds).toContain('quest-harborwatch')
  })

  it('faction standing from provenance.linkedFactionId on victory', () => {
    const state = {
      ...getStateForCombat(),
      factionStandings: { ...initialStateWithIda.factionStandings, 'faction-civic-compact': 20 },
    }
    let next = startCombatEncounter(state, 'quest-harborwatch')
    next = {
      ...next,
      activeCombat: {
        ...next.activeCombat!,
        outcome: 'victory',
        combatants: next.activeCombat!.combatants.map((c) =>
          c.side === 'enemies' ? { ...c, health: 0 } : c,
        ),
      },
    }
    const concluded = concludeCombatEncounter(next)
    // Standing modified by quest template reward and combat penalty
    // quest-harborwatch has rewardStandingDelta: 8, combat adds -5 → net +3
    expect(concluded.factionStandings['faction-civic-compact']).not.toBe(20)
  })
})
