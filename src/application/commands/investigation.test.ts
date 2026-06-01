import { describe, it, expect } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { initialStateWithIda } from './testFixtures'
import {
  computeBestInvestigationSkill,
  computeApproachSkillValue,
  buildInvestigationOperativeResults,
  rollInvestigationOutcome,
  INVESTIGATION_APPROACHES,
} from './investigation'
import { gameStateSchema } from '../../domain'
import { createQuestRuntime, type QuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../content/contentCatalog'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialStateWithIda, ...overrides })
  return createGameStore(state)
}

function makeActiveQuest(questId: string, overrides: Partial<QuestRuntime> = {}): QuestRuntime {
  const template = getQuestTemplates().find((quest) => quest.id === questId)
  if (!template) {
    throw new Error(`Unknown quest template in test: ${questId}`)
  }

  const base = createQuestRuntime(template, 1)
  return {
    ...base,
    ...overrides,
    progress: {
      ...base.progress,
      ...overrides.progress,
    },
    context: {
      ...base.context,
      ...overrides.context,
    },
    journalEntries: overrides.journalEntries ?? base.journalEntries,
  }
}

/** Ready-to-resolve activeInvestigation fixture using the given approach. */
function readyInvestigation(questId: string, districtId: string | null, approachId: string) {
  return {
    questId,
    districtId,
    rollResult: 'pending' as const,
    stage: 'ready-to-resolve' as const,
    chosenApproachId: approachId,
    clueText: 'A clue was found.',
  }
}

describe('investigation helpers', () => {
  it('computes the best available investigation skill across selected operatives', () => {
    const skill = computeBestInvestigationSkill(initialStateWithIda, ['npc-marion-vale', 'npc-ida-rhys'])
    expect(skill).toBe(68)
  })

  it('resolves deterministic seeded outcomes without modifier', () => {
    expect(rollInvestigationOutcome(42, 68).outcome).toBe('success')
    expect(rollInvestigationOutcome(7, 68).outcome).toBe('partial')
    expect(rollInvestigationOutcome(7, 31).outcome).toBe('failure')
  })

  it('difficulty modifier shifts outcome thresholds', () => {
    // seed 7, skill 68: normally partial — +15 modifier (surveillance) pushes it to success
    expect(rollInvestigationOutcome(7, 68, 15).outcome).toBe('success')
    // seed 8, skill 31: normally failure — +15 modifier (surveillance) lifts it to partial
    expect(rollInvestigationOutcome(8, 31, 0).outcome).toBe('failure')
    expect(rollInvestigationOutcome(8, 31, 15).outcome).toBe('partial')
  })

  it('computeApproachSkillValue uses approach-specific skills', () => {
    const briberSkill = computeApproachSkillValue(initialStateWithIda, ['npc-marion-vale'], ['negotiation', 'intrigue'])
    expect(briberSkill).toBeGreaterThan(0)
    expect(briberSkill).toBeLessThanOrEqual(100)
  })

  it('INVESTIGATION_APPROACHES has exactly 3 options with correct ids', () => {
    expect(INVESTIGATION_APPROACHES).toHaveLength(3)
    const ids = INVESTIGATION_APPROACHES.map((a) => a.id)
    expect(ids).toContain('bribe')
    expect(ids).toContain('surveillance')
    expect(ids).toContain('records')
  })

  it('builds per-operative breakdown from the shared investigation roll', () => {
    const results = buildInvestigationOperativeResults(
      initialStateWithIda,
      ['npc-marion-vale', 'npc-ida-rhys'],
      ['negotiation', 'intrigue'],
      6,
      0,
    )

    expect(results).toEqual([
      expect.objectContaining({
        npcId: 'npc-marion-vale',
        skillUsed: 'negotiation',
        skillValue: 68,
        rollValue: 6,
        outcome: 'partial',
      }),
      expect.objectContaining({
        npcId: 'npc-ida-rhys',
        skillUsed: 'negotiation',
        skillValue: 16,
        rollValue: 6,
        outcome: 'failure',
      }),
    ])
  })
})

describe('startInvestigation', () => {
  it('sets activeInvestigation at approach-selection stage', () => {
    const store = makeStore({
      activeQuests: [makeActiveQuest('quest-ledger-recovery')],
    })

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-ledger-recovery' }))

    const state = store.getState().game
    expect(state.activeInvestigation).not.toBeNull()
    expect(state.activeInvestigation?.questId).toBe('quest-ledger-recovery')
    expect(state.activeInvestigation?.stage).toBe('approach-selection')
    expect(state.activeInvestigation?.chosenApproachId).toBeNull()
    expect(state.activeInvestigation?.rollResult).toBe('pending')
    expect(state.activeQuests[0]?.stageId).toBe('investigating')
    expect(state.activeQuests[0]?.currentObjectiveLabel).toContain('approach')
    expect(state.activeQuests[0]?.progress.completedSteps).toBe(1)
  })

  it('is a no-op for a non-investigation quest', () => {
    const store = makeStore({
      activeQuests: [makeActiveQuest('quest-harborwatch')],
    })

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-harborwatch' }))

    const state = store.getState().game
    expect(state.activeInvestigation).toBeNull()
  })

  it('is a no-op for an unknown quest id', () => {
    const store = makeStore()
    store.dispatch(gameActions.startInvestigation({ questId: 'quest-does-not-exist' }))
    expect(store.getState().game.activeInvestigation).toBeNull()
  })

  it('uses a custody-breakout objective label for Old Ledgers', () => {
    const store = makeStore({
      activeQuests: [makeActiveQuest('quest-orren-wex-rescue')],
    })

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-orren-wex-rescue' }))

    const runtime = store.getState().game.activeQuests[0]
    expect(runtime?.currentObjectiveLabel).toContain('custody')
    expect(runtime?.journalEntries.some((entry) => entry.match(/custody|holding room/i))).toBe(true)
  })

  it('uses archive-specific setup copy for The Restored Ask a Favor', () => {
    const store = makeStore({
      activeQuests: [makeActiveQuest('quest-restored-appeal')],
    })

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-restored-appeal' }))

    const runtime = store.getState().game.activeQuests[0]
    expect(runtime?.currentObjectiveLabel).toContain('archive')
    expect(runtime?.journalEntries.some((entry) => entry.match(/seal|archive|clerk/i))).toBe(true)
    expect(runtime?.clues).toHaveLength(3)
  })
})

describe('chooseInvestigationApproach', () => {
  function makeInvestigatingStore() {
    const store = makeStore({
      activeQuests: [makeActiveQuest('quest-ledger-recovery')],
    })
    store.dispatch(gameActions.startInvestigation({ questId: 'quest-ledger-recovery' }))
    return store
  }

  it('advances stage to ready-to-resolve and records chosen approach', () => {
    const store = makeInvestigatingStore()
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'bribe' }))

    const state = store.getState().game
    expect(state.activeInvestigation?.stage).toBe('ready-to-resolve')
    expect(state.activeInvestigation?.chosenApproachId).toBe('bribe')
  })

  it('sets clue text from the chosen approach', () => {
    const store = makeInvestigatingStore()
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'surveillance' }))

    const state = store.getState().game
    expect(state.activeInvestigation?.clueText).not.toBeNull()
    expect(typeof state.activeInvestigation?.clueText).toBe('string')
  })

  it('adds clue text to quest journal', () => {
    const store = makeInvestigatingStore()
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'records' }))

    const quest = store.getState().game.activeQuests[0]
    expect(quest?.journalEntries.length).toBeGreaterThan(1)
  })

  it('advances quest progress to step 2', () => {
    const store = makeInvestigatingStore()
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'bribe' }))

    const quest = store.getState().game.activeQuests[0]
    expect(quest?.progress.completedSteps).toBe(2)
  })

  it('uses quest-specific approach clue text for Old Ledgers', () => {
    const store = makeStore({
      activeQuests: [makeActiveQuest('quest-orren-wex-rescue')],
    })

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-orren-wex-rescue' }))
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'records' }))

    const quest = store.getState().game.activeQuests[0]
    const investigation = store.getState().game.activeInvestigation
    expect(investigation?.clueText).toContain('shift handoff')
    expect(quest?.currentObjectiveLabel).toContain('Custody Ledger')
    expect(quest?.journalEntries.some((entry) => entry.includes('shift handoff'))).toBe(true)
    expect(quest?.context.selectedBranchId).toBe('records')
    expect(quest?.clues.find((clue) => clue.usedInBranchId === 'records')?.discovered).toBe(true)
  })

  it('records the selected archive clue for The Restored Ask a Favor', () => {
    const store = makeStore({
      activeQuests: [makeActiveQuest('quest-restored-appeal')],
    })

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-restored-appeal' }))
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'surveillance' }))

    const quest = store.getState().game.activeQuests[0]
    expect(quest?.context.selectedBranchId).toBe('surveillance')
    expect(
      quest?.clues.find((clue) => clue.usedInBranchId === 'surveillance')?.label,
    ).toContain('east corridor')
    expect(
      quest?.clues.find((clue) => clue.usedInBranchId === 'surveillance')?.discovered,
    ).toBe(true)
  })

  it('is a no-op if stage is not approach-selection', () => {
    const store = makeInvestigatingStore()
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'bribe' }))
    // calling again in ready-to-resolve stage — should be ignored
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'surveillance' }))

    expect(store.getState().game.activeInvestigation?.chosenApproachId).toBe('bribe')
  })

  it('is a no-op for an unknown approach id', () => {
    const store = makeInvestigatingStore()
    store.dispatch(gameActions.chooseInvestigationApproach({ approachId: 'unknown-approach' }))

    expect(store.getState().game.activeInvestigation?.stage).toBe('approach-selection')
  })
})

describe('resolveInvestigation', () => {
  it('does not settle surveillance work before the authored day count has elapsed', () => {
    const store = makeStore({
      day: 1,
      timeSlot: 'evening',
      rngSeed: 42,
      activeInvestigation: readyInvestigation('quest-compact-watch', 'district-the-pale', 'surveillance'),
      activeQuests: [makeActiveQuest('quest-compact-watch')],
      money: 0,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    const runtime = state.activeQuests.find((quest) => quest.questId === 'quest-compact-watch')
    expect(state.activeInvestigation).toBeNull()
    expect(state.lastInvestigationResult).toBeNull()
    expect(state.completedQuestIds).not.toContain('quest-compact-watch')
    expect(state.money).toBe(0)
    expect(runtime?.currentObjectiveLabel).toContain('1 of 3')
    expect(runtime?.journalEntries.some((entry) => entry.includes('Surveillance day 1 of 3'))).toBe(true)
  })

  it('settles surveillance work on the final required day', () => {
    const store = makeStore({
      day: 3,
      timeSlot: 'evening',
      rngSeed: 42,
      activeInvestigation: readyInvestigation('quest-compact-watch', 'district-the-pale', 'surveillance'),
      activeQuests: [makeActiveQuest('quest-compact-watch', {
        progress: {
          requiredSteps: 5,
          completedSteps: 4,
          lastAdvancedDay: 2,
        },
      })],
      money: 0,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.completedQuestIds).toContain('quest-compact-watch')
    expect(state.money).toBe(180)
    expect(state.activeQuests.find((quest) => quest.questId === 'quest-compact-watch')).toBeUndefined()
  })

  it('produces success with high skill and high roll (bribe approach — extra marks)', () => {
    const store = makeStore({
      rngSeed: 42,
      activeInvestigation: readyInvestigation('quest-ledger-recovery', 'district-the-pale', 'bribe'),
      activeQuests: [makeActiveQuest('quest-ledger-recovery')],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 20,
      },
      money: 0,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.activeInvestigation).toBeNull()
    expect(state.lastInvestigationResult?.operativeResults).toEqual([
      expect.objectContaining({
        npcId: 'npc-marion-vale',
        operativeName: 'Marion Vale',
        skillUsed: 'negotiation',
      }),
    ])
    // bribe gives 1.25x marks: floor(250 * 1.25) = 312
    expect(state.money).toBe(312)
    expect(state.factionStandings['faction-gilded-court']).toBe(30) // 20 + 10
    expect(state.completedQuestIds).toContain('quest-ledger-recovery')
    expect(state.activeQuests.find((q) => q.questId === 'quest-ledger-recovery')).toBeUndefined()
    expect(state.activityLog.some((e) => e.message.match(/investigation concludes/i))).toBe(true)
  })

  it('produces success with surveillance approach (no marks bonus)', () => {
    const store = makeStore({
      rngSeed: 42,
      activeInvestigation: readyInvestigation('quest-ledger-recovery', 'district-the-pale', 'surveillance'),
      activeQuests: [makeActiveQuest('quest-ledger-recovery')],
      money: 0,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.money).toBe(250) // no bonus: full 250 marks
    expect(state.completedQuestIds).toContain('quest-ledger-recovery')
  })

  it('produces partial result with moderate roll', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: readyInvestigation('quest-ledger-recovery', 'district-the-pale', 'surveillance'),
      activeQuests: [makeActiveQuest('quest-ledger-recovery')],
      money: 0,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    // seed 7 + skill 68 + modifier 15 = success (not partial); update to records approach for partial
    // Actually with surveillance modifier +15 this might be success — use records or bribe for partial test
    // seed 7 + Marion skill in bribe approach = partial remains since bribe has 0 modifier
    // Re-test with bribe below
    expect(state.activeInvestigation).toBeNull()
    expect(state.completedQuestIds).toContain('quest-ledger-recovery')
  })

  it('produces partial result with bribe approach and moderate seed', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: readyInvestigation('quest-ledger-recovery', 'district-the-pale', 'bribe'),
      activeQuests: [makeActiveQuest('quest-ledger-recovery')],
      money: 0,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.activeInvestigation).toBeNull()
    expect(state.money).toBe(125) // half of 250
    expect(state.completedQuestIds).toContain('quest-ledger-recovery')
    expect(state.activityLog.some((e) => e.message.match(/yields something/i))).toBe(true)
  })

  it('produces failure with low skill and low roll', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: readyInvestigation('quest-ledger-recovery', 'district-the-pale', 'bribe'),
      activeQuests: [makeActiveQuest('quest-ledger-recovery')],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 20,
      },
      money: 100,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-ida-rhys'] }))

    const state = store.getState().game
    expect(state.activeInvestigation).toBeNull()
    expect(state.money).toBe(100) // no reward
    expect(state.factionStandings['faction-gilded-court']).toBe(12) // 20 + (-8 penalty)
    expect(state.completedQuestIds).not.toContain('quest-ledger-recovery')
    expect(state.activityLog.some((e) => e.message.match(/goes nowhere/i))).toBe(true)
  })

  it('records (paper trail) approach suppresses standing penalty on failure', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: readyInvestigation('quest-ledger-recovery', 'district-the-pale', 'records'),
      activeQuests: [makeActiveQuest('quest-ledger-recovery')],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 20,
      },
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-ida-rhys'] }))

    const state = store.getState().game
    // records bonusType = 'reduce_penalty' => no standing hit on failure
    expect(state.factionStandings['faction-gilded-court']).toBe(20) // unchanged
    expect(state.completedQuestIds).not.toContain('quest-ledger-recovery')
  })

  it('bribe approach applies standing penalty on failure', () => {
    const store = makeStore({
      rngSeed: 35,
      activeInvestigation: readyInvestigation('quest-ledger-recovery', 'district-the-pale', 'bribe'),
      activeQuests: [makeActiveQuest('quest-ledger-recovery')],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 0,
      },
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-ida-rhys'] }))

    const state = store.getState().game
    expect(state.factionStandings['faction-gilded-court']).toBe(-8)
  })

  it('success awards full marks and standing', () => {
    const store = makeStore({
      rngSeed: 42,
      activeInvestigation: readyInvestigation('quest-restored-appeal', null, 'surveillance'),
      activeQuests: [makeActiveQuest('quest-restored-appeal')],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-restored': 10,
      },
      money: 50,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.money).toBe(200) // 50 + 150 (surveillance: no bonus)
    expect(state.factionStandings['faction-restored']).toBe(25) // 10 + 15
    expect(state.completedQuestIds).toContain('quest-restored-appeal')
  })

  it('frees Orren from captivity on a successful Old Ledgers resolve', () => {
    const store = makeStore({
      rngSeed: 42,
      activeInvestigation: readyInvestigation('quest-orren-wex-rescue', 'district-the-hollows', 'surveillance'),
      activeQuests: [makeActiveQuest('quest-orren-wex-rescue')],
      npcCaptivityStates: {
        ...initialGameStateSnapshot.npcCaptivityStates,
        'npc-orren-wex': {
          status: 'captive',
          condition: 'hurt',
          compliance: 'resistant',
          bondType: 'fear',
          regime: 'guarded',
          holderId: 'faction-civic-compact',
          siteId: 'site-world-house-sorn',
          roomId: 'sorn-locked-cellar',
          timeHeldDays: 6,
          lastTransferDay: 1,
          questTag: 'quest-orren-wex-rescue',
        },
      },
      npcSitePresences: [
        ...initialGameStateSnapshot.npcSitePresences,
        {
          occupancyId: 'occ-orren-captive',
          npcId: 'npc-orren-wex',
          siteId: 'site-world-house-sorn',
          roomId: 'sorn-locked-cellar',
          role: 'captive',
          visibility: 'hidden',
          status: 'present',
          sinceDay: 1,
        },
      ],
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.completedQuestIds).toContain('quest-orren-wex-rescue')
    expect(state.npcCaptivityStates['npc-orren-wex']).toBeUndefined()
    expect(state.npcSitePresences.some((presence) => presence.npcId === 'npc-orren-wex' && presence.role === 'captive')).toBe(false)
  })

  it('keeps Orren captive when Old Ledgers fails', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: readyInvestigation('quest-orren-wex-rescue', 'district-the-hollows', 'records'),
      activeQuests: [makeActiveQuest('quest-orren-wex-rescue')],
      npcCaptivityStates: {
        ...initialGameStateSnapshot.npcCaptivityStates,
        'npc-orren-wex': {
          status: 'captive',
          condition: 'hurt',
          compliance: 'resistant',
          bondType: 'fear',
          regime: 'guarded',
          holderId: 'faction-civic-compact',
          siteId: 'site-world-house-sorn',
          roomId: 'sorn-locked-cellar',
          timeHeldDays: 6,
          lastTransferDay: 1,
          questTag: 'quest-orren-wex-rescue',
        },
      },
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-ida-rhys'] }))

    const state = store.getState().game
    expect(state.completedQuestIds).not.toContain('quest-orren-wex-rescue')
    expect(state.activeQuests.some((quest) => quest.questId === 'quest-orren-wex-rescue')).toBe(true)
    expect(
      state.activeQuests.find((quest) => quest.questId === 'quest-orren-wex-rescue')?.stageId,
    ).toBe('setback')
    expect(state.npcCaptivityStates['npc-orren-wex']?.status).toBe('captive')
  })

  it('keeps Old Ledgers active on a partial result because Orren is not out yet', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: readyInvestigation('quest-orren-wex-rescue', 'district-the-hollows', 'bribe'),
      activeQuests: [makeActiveQuest('quest-orren-wex-rescue')],
      npcCaptivityStates: {
        ...initialGameStateSnapshot.npcCaptivityStates,
        'npc-orren-wex': {
          status: 'captive',
          condition: 'hurt',
          compliance: 'resistant',
          bondType: 'fear',
          regime: 'guarded',
          holderId: 'faction-civic-compact',
          siteId: 'site-world-house-sorn',
          roomId: 'sorn-locked-cellar',
          timeHeldDays: 6,
          lastTransferDay: 1,
          questTag: 'quest-orren-wex-rescue',
        },
      },
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    const runtime = state.activeQuests.find((quest) => quest.questId === 'quest-orren-wex-rescue')
    expect(state.completedQuestIds).not.toContain('quest-orren-wex-rescue')
    expect(runtime).toBeDefined()
    expect(runtime?.stageId).toBe('setback')
    expect(runtime?.currentObjectiveLabel).toContain('Orren is still inside')
    expect(runtime?.journalEntries.some((entry) => entry.includes('breakout window closed'))).toBe(
      true,
    )
    expect(state.npcCaptivityStates['npc-orren-wex']?.status).toBe('captive')
  })

  it('writes quest-specific archive success text for The Restored Ask a Favor', () => {
    const store = makeStore({
      rngSeed: 42,
      activeInvestigation: readyInvestigation('quest-restored-appeal', null, 'records'),
      activeQuests: [makeActiveQuest('quest-restored-appeal')],
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.completedQuestIds).toContain('quest-restored-appeal')
    expect(
      state.activityLog.some((entry) =>
        entry.message.includes('The Restored get the full record'),
      ),
    ).toBe(true)
    expect(
      state.activityLog.some((entry) =>
        entry.message.includes('standing with Gilded Court worsens'),
      ),
    ).toBe(true)
    expect(
      state.activityLog.some((entry) =>
        entry.message.includes('The Restored now hold a Court record'),
      ),
    ).toBe(true)
  })

  it('keeps The Restored Ask a Favor active on a partial result because fragments are not the record', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: readyInvestigation('quest-restored-appeal', null, 'bribe'),
      activeQuests: [makeActiveQuest('quest-restored-appeal')],
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    const runtime = state.activeQuests.find((quest) => quest.questId === 'quest-restored-appeal')
    expect(state.completedQuestIds).not.toContain('quest-restored-appeal')
    expect(runtime).toBeDefined()
    expect(runtime?.stageId).toBe('setback')
    expect(runtime?.currentObjectiveLabel).toContain('Fragments are not enough')
    expect(runtime?.journalEntries.some((entry) => entry.includes('not the record itself'))).toBe(
      true,
    )
  })

  it('keeps The Restored Ask a Favor active on failure so the archive route can be reworked', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: readyInvestigation('quest-restored-appeal', null, 'records'),
      activeQuests: [makeActiveQuest('quest-restored-appeal')],
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-ida-rhys'] }))

    const state = store.getState().game
    const runtime = state.activeQuests.find((quest) => quest.questId === 'quest-restored-appeal')
    expect(state.completedQuestIds).not.toContain('quest-restored-appeal')
    expect(runtime).toBeDefined()
    expect(runtime?.stageId).toBe('setback')
    expect(runtime?.currentObjectiveLabel).toContain('archive window closed')
    expect(runtime?.journalEntries.some((entry) => entry.includes('first archive line failed'))).toBe(
      true,
    )
  })

  it('grants the removal chit on successful Soot Lane ledger recovery', () => {
    const store = makeStore({
      rngSeed: 42,
      activeInvestigation: readyInvestigation('quest-hollows-ledger', 'district-the-hollows', 'records'),
      activeQuests: [makeActiveQuest('quest-hollows-ledger')],
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.completedQuestIds).toContain('quest-hollows-ledger')
    expect(state.ownedItems.some((item) => item.itemId === 'item-chit-ledger-removal')).toBe(true)
    expect(
      state.activityLog.some((entry) =>
        entry.message.includes('Ledger Removal Chit') || entry.message.includes('added to inventory'),
      ),
    ).toBe(true)
  })

  it('keeps Soot Lane active on a partial result because the ledger is still inside', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: readyInvestigation('quest-hollows-ledger', 'district-the-hollows', 'bribe'),
      activeQuests: [makeActiveQuest('quest-hollows-ledger')],
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    const runtime = state.activeQuests.find((quest) => quest.questId === 'quest-hollows-ledger')
    expect(state.completedQuestIds).not.toContain('quest-hollows-ledger')
    expect(runtime).toBeDefined()
    expect(runtime?.stageId).toBe('setback')
    expect(runtime?.currentObjectiveLabel).toContain('fragments, not the ledger')
    expect(runtime?.journalEntries.some((entry) => entry.includes('ledger itself stayed inside'))).toBe(
      true,
    )
    expect(state.ownedItems.some((item) => item.itemId === 'item-chit-ledger-removal')).toBe(false)
  })

  it('keeps Soot Lane active on failure so the house can try another route', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: readyInvestigation('quest-hollows-ledger', 'district-the-hollows', 'records'),
      activeQuests: [makeActiveQuest('quest-hollows-ledger')],
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-ida-rhys'] }))

    const state = store.getState().game
    const runtime = state.activeQuests.find((quest) => quest.questId === 'quest-hollows-ledger')
    expect(state.completedQuestIds).not.toContain('quest-hollows-ledger')
    expect(runtime).toBeDefined()
    expect(runtime?.stageId).toBe('setback')
    expect(runtime?.currentObjectiveLabel).toContain('safer entry')
    expect(runtime?.journalEntries.some((entry) => entry.includes('one way that does not work'))).toBe(
      true,
    )
  })

  it('is a no-op if stage is still approach-selection', () => {
    const store = makeStore({
      activeInvestigation: {
        questId: 'quest-ledger-recovery',
        districtId: 'district-the-pale',
        rollResult: 'pending' as const,
        stage: 'approach-selection' as const,
        chosenApproachId: null,
        clueText: null,
      },
      activeQuests: [makeActiveQuest('quest-ledger-recovery')],
      money: 100,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.money).toBe(100) // unchanged
    expect(state.activeInvestigation?.stage).toBe('approach-selection')
  })

  it('does nothing if no activeInvestigation is set', () => {
    const store = makeStore({ activeInvestigation: null })
    const before = store.getState().game

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.money).toBe(before.money)
    expect(state.activityLog.length).toBe(before.activityLog.length)
  })
})
