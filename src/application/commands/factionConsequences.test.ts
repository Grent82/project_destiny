import { describe, expect, it } from 'vitest'

import { gameStateSchema } from '../../domain'
import { createQuestLeadRuntime } from '../../domain/quests/contracts'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { selectAvailableQuests } from '../selectors/quests'
import { getQuestTemplates } from '../content/contentCatalog'
import { travelToDistrict } from './districtTravel'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialGameStateSnapshot, ...overrides })
  return createGameStore(state)
}

function makeLead(questId: string, day = 1) {
  const template = getQuestTemplates().find((quest) => quest.id === questId)
  if (!template) throw new Error(`Unknown quest template in test: ${questId}`)
  return createQuestLeadRuntime(template, day)
}

describe('adjustFactionStanding — NPC loyalty reactions', () => {
  it('reduces affiliated NPC loyalty when delta is less than -10', () => {
    // npc-marion-vale has factionAffinityId: faction-civic-compact, traits.loyalty: 52
    const store = makeStore()
    const loyaltyBefore = store.getState().game.roster.find((r) => r.npcId === 'npc-marion-vale')!.traits.loyalty

    store.dispatch(gameActions.adjustFactionStanding({ factionId: 'faction-civic-compact', delta: -20 }))

    const loyaltyAfter = store.getState().game.roster.find((r) => r.npcId === 'npc-marion-vale')!.traits.loyalty
    expect(loyaltyAfter).toBe(loyaltyBefore - 5)
  })

  it('does not reduce NPC loyalty when delta is -10 or greater', () => {
    const store = makeStore()
    const loyaltyBefore = store.getState().game.roster.find((r) => r.npcId === 'npc-marion-vale')!.traits.loyalty

    store.dispatch(gameActions.adjustFactionStanding({ factionId: 'faction-civic-compact', delta: -10 }))

    const loyaltyAfter = store.getState().game.roster.find((r) => r.npcId === 'npc-marion-vale')!.traits.loyalty
    expect(loyaltyAfter).toBe(loyaltyBefore)
  })
})

describe('selectAvailableQuests — faction standing gating', () => {
  it('excludes quests where faction standing requirement is not met', () => {
    // quest-ring-debt requires faction-tallow-ring standing >= 5
    const store = makeStore({
      availableQuestLeads: [makeLead('quest-ring-debt')],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-tallow-ring': 3,
      },
    })

    const quests = selectAvailableQuests(store.getState())
    expect(quests.map((q) => q.template.id)).not.toContain('quest-ring-debt')
  })

  it('includes quests where faction standing requirement is met', () => {
    // quest-ring-debt requires faction-tallow-ring standing >= 5
    const store = makeStore({
      availableQuestLeads: [makeLead('quest-ring-debt')],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-tallow-ring': 10,
      },
    })

    const quests = selectAvailableQuests(store.getState())
    expect(quests.map((q) => q.template.id)).toContain('quest-ring-debt')
  })
})

describe('travelToDistrict — hostile faction district pressure', () => {
  it('logs a hostile territory warning when controlling faction standing is -50 or lower', () => {
    // district-harbor is controlled by faction-civic-compact
    const hostileState = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-civic-compact': -60,
      },
    })

    const next = travelToDistrict(hostileState, 'district-harbor')

    const hostileLog = next.activityLog.find((e) =>
      e.message.includes('hostile territory'),
    )
    expect(hostileLog).toBeDefined()
    expect(hostileLog?.message).toContain('civic-compact')
  })
})
