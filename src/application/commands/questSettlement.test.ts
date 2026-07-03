import { describe, it, expect } from 'vitest'
import { settleQuestSuccess } from './questSettlement'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { createQuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../content/contentCatalog'
import type { GameState } from '../../domain/game/contracts'
import type { QuestRuntime } from '../../domain/quests/contracts'

function makeActiveQuest(questId: string, overrides: Partial<QuestRuntime> = {}): QuestRuntime {
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) throw new Error(`Unknown quest template in test: ${questId}`)
  const base = createQuestRuntime(template, 1)
  return { ...base, ...overrides, progress: { ...base.progress, ...overrides.progress }, context: { ...base.context, ...overrides.context } }
}

function stateWithQuest(questId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    day: 3,
    activeQuests: [makeActiveQuest(questId)],
    rumors: [],
    relationships: {},
  }
}

describe('settleQuestSuccess — rewardItemIds', () => {
  it('adds a new inventory entry for each reward item', () => {
    const state = stateWithQuest('quest-ledger-recovery')
    const result = settleQuestSuccess(state, 'quest-ledger-recovery')
    // Check inventoryState instead of ownedItems
    // Note: uniqueId is formatted as `${itemId}-reward-${day}`
    const hasItem = result.inventoryState.player.bagContainers.some(c =>
      c.slots.some(s => s.itemInstanceId === 'item-ledger-bureau-reward-3')
    )
    expect(hasItem).toBe(true)
  })

  it('logs item reward to activity log', () => {
    const state = stateWithQuest('quest-nightbloom-extract')
    const result = settleQuestSuccess(state, 'quest-nightbloom-extract')
    const hasEntry = result.activityLog.some((e) => e.message.includes('added to inventory'))
    expect(hasEntry).toBe(true)
  })
})

describe('settleQuestSuccess — rewardRelationshipDeltas', () => {
  it('creates a player relationship entry for the target NPC', () => {
    const state = stateWithQuest('quest-mira-rescue')
    state.mainQuest = { ...state.mainQuest, stage: 'searching' }
    const result = settleQuestSuccess(state, 'quest-mira-rescue')
    const rel = result.relationships['player-to-npc-mira']
    expect(rel).toBeDefined()
    expect(rel?.trust).toBe(40)
    expect(rel?.fear).toBe(-20)
  })

  it('clamps relationship values to [-100, 100]', () => {
    const state = stateWithQuest('quest-mira-rescue')
    state.mainQuest = { ...state.mainQuest, stage: 'searching' }
    state.relationships['player-to-npc-mira'] = { affinity: 0, respect: 0, fear: -90, trust: 80, loyalty: 0 }
    const result = settleQuestSuccess(state, 'quest-mira-rescue')
    const rel = result.relationships['player-to-npc-mira']
    expect(rel?.trust).toBe(100)
    expect(rel?.fear).toBe(-100)
  })

  it('stacks onto existing relationship values', () => {
    const state = stateWithQuest('quest-orren-wex-rescue')
    state.relationships['player-to-npc-orren-wex'] = { affinity: 0, respect: 0, fear: 0, trust: 20, loyalty: 0 }
    state.npcSitePresences = [] // Required for applyOrrenRescueResolution
    const result = settleQuestSuccess(state, 'quest-orren-wex-rescue')
    const rel = result.relationships['player-to-npc-orren-wex']
    expect(rel?.trust).toBe(50)
    expect(rel?.loyalty).toBe(20)
  })
})

describe('settleQuestSuccess — successorRumorIds', () => {
  it('spawns a new rumor instance with heat 50', () => {
    const state = stateWithQuest('quest-harborwatch')
    const result = settleQuestSuccess(state, 'quest-harborwatch')
    const rumor = result.rumors.find((r) => r.templateId === 'rumor-valdris-cleared-harborwatch')
    expect(rumor).toBeDefined()
    expect(rumor?.heat).toBe(50)
  })

  it('does not duplicate an already-active rumor template', () => {
    const state = stateWithQuest('quest-harborwatch')
    state.rumors.push({
      id: 'existing-rumor',
      kind: 'ambient',
      source: 'authored',
      districtId: 'district-harbor',
      originNpcId: null,
      templateId: 'rumor-valdris-cleared-harborwatch',
      text: 'Word in the Harbor...',
      subjectNpcIds: ['npc-enemy-the-dockmaster'],
      truth: 'true',
      credibility: 60,
      heat: 75,
      createdDay: 1,
      lastSpreadDay: 1,
    })
    const result = settleQuestSuccess(state, 'quest-harborwatch')
    const matching = result.rumors.filter((r) => r.templateId === 'rumor-valdris-cleared-harborwatch')
    expect(matching).toHaveLength(1)
    expect(matching[0]?.heat).toBe(75)
  })
})

describe('settleQuestSuccess — corridor-run quests', () => {
  it('imports food to city stock on success', () => {
    const state = stateWithQuest('quest-corridor-run-green')
    const beforeStock = state.cityResources.foodStock
    const result = settleQuestSuccess(state, 'quest-corridor-run-green')
    expect(result.cityResources.foodStock).toBe(beforeStock + 120)
  })

  it('updates foodSecurity based on new stock level', () => {
    const state = stateWithQuest('quest-corridor-run-green')
    const beforeSecurity = state.cityResources.foodSecurity
    const result = settleQuestSuccess(state, 'quest-corridor-run-green')
    expect(result.cityResources.foodSecurity).toBeGreaterThan(beforeSecurity)
  })

  it('collects toll income from the corridor run', () => {
    const state = stateWithQuest('quest-corridor-run-green')
    const beforeMoney = state.money
    const result = settleQuestSuccess(state, 'quest-corridor-run-green')
    const rewardMarks = 150 // From quest template
    const expectedToll = Math.round(120 * 0.05)
    expect(result.money).toBe(beforeMoney + rewardMarks + expectedToll)
  })

  it('logs food import to activity log', () => {
    const state = stateWithQuest('quest-corridor-run-green')
    const result = settleQuestSuccess(state, 'quest-corridor-run-green')
    const hasImportLog = result.activityLog.some((e) =>
      e.message.includes('rations imported')
    )
    expect(hasImportLog).toBe(true)
  })

  it('logs toll collection to activity log', () => {
    const state = stateWithQuest('quest-corridor-run-green')
    const result = settleQuestSuccess(state, 'quest-corridor-run-green')
    const hasTollLog = result.activityLog.some((e) =>
      e.message.includes('toll collected')
    )
    expect(hasTollLog).toBe(true)
  })

  it('handles higher import amounts for high-risk runs', () => {
    const state = stateWithQuest('quest-corridor-run-ashfields')
    const beforeStock = state.cityResources.foodStock
    const result = settleQuestSuccess(state, 'quest-corridor-run-ashfields')
    expect(result.cityResources.foodStock).toBe(beforeStock + 200)
  })
})
