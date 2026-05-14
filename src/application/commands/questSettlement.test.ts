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
    ownedItems: [],
  }
}

describe('settleQuestSuccess — rewardItemIds', () => {
  it('adds a new inventory entry for each reward item', () => {
    const state = stateWithQuest('quest-ledger-recovery')
    settleQuestSuccess(state, 'quest-ledger-recovery')
    const owned = state.ownedItems.find((o) => o.itemId === 'item-ledger-bureau')
    expect(owned).toBeDefined()
    expect(owned?.quantity).toBe(1)
    expect(owned?.location).toBe('inventory')
  })

  it('increments quantity when item already in inventory', () => {
    const state = stateWithQuest('quest-ledger-recovery')
    state.ownedItems.push({ instanceId: 'inst-existing', itemId: 'item-ledger-bureau', location: 'inventory', quantity: 2 })
    settleQuestSuccess(state, 'quest-ledger-recovery')
    const owned = state.ownedItems.find((o) => o.itemId === 'item-ledger-bureau')
    expect(owned?.quantity).toBe(3)
  })

  it('logs item reward to activity log', () => {
    const state = stateWithQuest('quest-nightbloom-extract')
    settleQuestSuccess(state, 'quest-nightbloom-extract')
    const hasEntry = state.activityLog.some((e) => e.message.includes('added to inventory'))
    expect(hasEntry).toBe(true)
  })
})

describe('settleQuestSuccess — rewardRelationshipDeltas', () => {
  it('creates a player relationship entry for the target NPC', () => {
    const state = stateWithQuest('quest-mira-rescue')
    state.mainQuest = { ...state.mainQuest, stage: 'searching' }
    settleQuestSuccess(state, 'quest-mira-rescue')
    const rel = state.relationships['player→npc-mira']
    expect(rel).toBeDefined()
    expect(rel?.trust).toBe(40)
    expect(rel?.fear).toBe(-20)
  })

  it('clamps relationship values to [-100, 100]', () => {
    const state = stateWithQuest('quest-mira-rescue')
    state.mainQuest = { ...state.mainQuest, stage: 'searching' }
    state.relationships['player→npc-mira'] = { affinity: 0, respect: 0, fear: -90, trust: 80, loyalty: 0 }
    settleQuestSuccess(state, 'quest-mira-rescue')
    const rel = state.relationships['player→npc-mira']
    expect(rel?.trust).toBe(100)
    expect(rel?.fear).toBe(-100)
  })

  it('stacks onto existing relationship values', () => {
    const state = stateWithQuest('quest-orren-wex-rescue')
    state.relationships['player→npc-orren-wex'] = { affinity: 0, respect: 0, fear: 0, trust: 20, loyalty: 0 }
    settleQuestSuccess(state, 'quest-orren-wex-rescue')
    const rel = state.relationships['player→npc-orren-wex']
    expect(rel?.trust).toBe(50)
    expect(rel?.loyalty).toBe(20)
  })
})

describe('settleQuestSuccess — successorRumorIds', () => {
  it('spawns a new rumor instance with heat 50', () => {
    const state = stateWithQuest('quest-harborwatch')
    settleQuestSuccess(state, 'quest-harborwatch')
    const rumor = state.rumors.find((r) => r.templateId === 'rumor-valdris-cleared-harborwatch')
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
    settleQuestSuccess(state, 'quest-harborwatch')
    const matching = state.rumors.filter((r) => r.templateId === 'rumor-valdris-cleared-harborwatch')
    expect(matching).toHaveLength(1)
    expect(matching[0]?.heat).toBe(75)
  })
})
