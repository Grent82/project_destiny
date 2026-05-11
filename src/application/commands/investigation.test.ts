import { describe, it, expect } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { initialStateWithIda } from './testFixtures'
import { computeBestInvestigationSkill, rollInvestigationOutcome } from './investigation'
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

describe('investigation helpers', () => {
  it('computes the best available investigation skill across selected operatives', () => {
    const skill = computeBestInvestigationSkill(initialStateWithIda, ['npc-marion-vale', 'npc-ida-rhys'])
    expect(skill).toBe(68)
  })

  it('resolves deterministic seeded outcomes', () => {
    expect(rollInvestigationOutcome(42, 68).outcome).toBe('success')
    expect(rollInvestigationOutcome(7, 68).outcome).toBe('partial')
    expect(rollInvestigationOutcome(7, 31).outcome).toBe('failure')
  })
})

describe('startInvestigation', () => {
  it('sets activeInvestigation for an investigation quest', () => {
    const store = makeStore({
      activeQuests: [
        makeActiveQuest('quest-ledger-recovery'),
      ],
    })

    store.dispatch(gameActions.startInvestigation({ questId: 'quest-ledger-recovery' }))

    const state = store.getState().game
    expect(state.activeInvestigation).not.toBeNull()
    expect(state.activeInvestigation?.questId).toBe('quest-ledger-recovery')
    expect(state.activeInvestigation?.districtId).toBe('district-the-pale')
    expect(state.activeInvestigation?.rollResult).toBe('pending')
    expect(state.activeQuests[0]?.stageId).toBe('investigating')
    expect(state.activeQuests[0]?.currentObjectiveLabel).toContain('Select operatives')
    expect(state.activeQuests[0]?.progress.completedSteps).toBe(1)
  })

  it('is a no-op for a non-investigation quest', () => {
    const store = makeStore({
      activeQuests: [
        makeActiveQuest('quest-harborwatch'),
      ],
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
})

describe('resolveInvestigation', () => {
  it('produces success with high skill and high roll', () => {
    const store = makeStore({
      rngSeed: 42,
      activeInvestigation: {
        questId: 'quest-ledger-recovery',
        districtId: 'district-the-pale',
        rollResult: 'pending',
      },
      activeQuests: [
        makeActiveQuest('quest-ledger-recovery'),
      ],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 20,
      },
      money: 0,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.activeInvestigation).toBeNull()
    expect(state.money).toBe(250) // rewardMarks
    expect(state.factionStandings['faction-gilded-court']).toBe(30) // 20 + 10
    expect(state.completedQuestIds).toContain('quest-ledger-recovery')
    expect(state.activeQuests.find((q) => q.questId === 'quest-ledger-recovery')).toBeUndefined()
    expect(state.activityLog[0].message).toMatch(/investigation concludes/i)
  })

  it('produces partial result with moderate roll', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: {
        questId: 'quest-ledger-recovery',
        districtId: 'district-the-pale',
        rollResult: 'pending',
      },
      activeQuests: [
        makeActiveQuest('quest-ledger-recovery'),
      ],
      money: 0,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.activeInvestigation).toBeNull()
    expect(state.money).toBe(125) // half of 250
    expect(state.completedQuestIds).toContain('quest-ledger-recovery')
    expect(state.activityLog[0].message).toMatch(/yields something/i)
  })

  it('produces failure with low skill and low roll', () => {
    const store = makeStore({
      rngSeed: 7,
      activeInvestigation: {
        questId: 'quest-ledger-recovery',
        districtId: 'district-the-pale',
        rollResult: 'pending',
      },
      activeQuests: [
        makeActiveQuest('quest-ledger-recovery'),
      ],
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
    expect(state.activityLog[0].message).toMatch(/goes nowhere/i)
  })

  it('failure applies standing penalty', () => {
    const store = makeStore({
      rngSeed: 35,
      activeInvestigation: {
        questId: 'quest-ledger-recovery',
        districtId: 'district-the-pale',
        rollResult: 'pending',
      },
      activeQuests: [
        makeActiveQuest('quest-ledger-recovery'),
      ],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 0,
      },
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-ida-rhys'] }))

    // penaltyStandingDelta: -8
    const state = store.getState().game
    expect(state.factionStandings['faction-gilded-court']).toBe(-8)
  })

  it('success awards full marks and standing', () => {
    const store = makeStore({
      rngSeed: 42,
      activeInvestigation: {
        questId: 'quest-restored-appeal',
        districtId: null,
        rollResult: 'pending',
      },
      activeQuests: [
        makeActiveQuest('quest-restored-appeal'),
      ],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-restored': 10,
      },
      money: 50,
    })

    store.dispatch(gameActions.resolveInvestigation({ npcIds: ['npc-marion-vale'] }))

    const state = store.getState().game
    expect(state.money).toBe(200) // 50 + 150 reward
    expect(state.factionStandings['faction-restored']).toBe(25) // 10 + 15
    expect(state.completedQuestIds).toContain('quest-restored-appeal')
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
