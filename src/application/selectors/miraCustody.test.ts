import { describe, expect, it } from 'vitest'

import type { GameState } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import {
  getMiraCustodyTruthForPlayer,
  getMiraSiteDescription,
  getMiraRoomRouteDescription,
  getMiraHandlerName,
  getMiraConditionDescription,
} from './miraCustody'

import type { QuestRuntime } from '../../domain/quests/contracts'

function createBaseState(overrides: Partial<GameState> = {}): Pick<GameState, 'npcCaptivityStates' | 'roster' | 'completedQuestIds' | 'activeQuests'> {
  return {
    ...initialGameStateSnapshot,
    npcCaptivityStates: {
      ...initialGameStateSnapshot.npcCaptivityStates,
      'npc-mira': {
        status: 'captive',
        holderId: 'faction-gilded-court',
        siteId: 'site-poi-pale-old-tannery',
        roomId: 'tannery-inner-ring',
        regime: 'guarded',
        condition: 'hurt',
        compliance: 'resistant',
        bondType: 'fear',
        timeHeldDays: 21,
        lastTransferDay: null,
        questTag: 'quest-mira-rescue',
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    },
    completedQuestIds: overrides.completedQuestIds ?? [],
    activeQuests: overrides.activeQuests ?? [],
    roster: overrides.roster ?? [],
  }
}

describe('getMiraCustodyTruthForPlayer', () => {
  it('returns null when Mira is not in captivity', () => {
    const state = createBaseState()
    state.npcCaptivityStates['npc-mira']!.status = 'rescued'

    expect(getMiraCustodyTruthForPlayer(state)).toBeNull()
  })

  it('returns no truth on fresh save (no quests completed or active)', () => {
    const state = createBaseState()
    const truth = getMiraCustodyTruthForPlayer(state)

    expect(truth).toEqual({
      siteKnown: false,
      roomRouteKnown: false,
      handlerKnown: false,
      conditionKnown: false,
    })
  })

  it('reveals site truth when act1 is completed', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-act1-wren-favor'] })
    const truth = getMiraCustodyTruthForPlayer(state)

    expect(truth?.siteKnown).toBe(true)
    expect(truth?.roomRouteKnown).toBe(false)
    expect(truth?.handlerKnown).toBe(false)
    expect(truth?.conditionKnown).toBe(false)
  })

  it('reveals site truth when act2 is active', () => {
    const state = createBaseState({
      activeQuests: [{ questId: 'quest-mira-act2-tannery-watch', acceptedOnDay: 1, status: 'active', acceptedTitle: 'Test', stageId: 'stage1' } as QuestRuntime],
    })
    const truth = getMiraCustodyTruthForPlayer(state)

    expect(truth?.siteKnown).toBe(true)
  })

  it('reveals room-route and handler truth when act2 is completed', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-act2-tannery-watch'] })
    const truth = getMiraCustodyTruthForPlayer(state)

    expect(truth?.siteKnown).toBe(true)
    expect(truth?.roomRouteKnown).toBe(true)
    expect(truth?.handlerKnown).toBe(true)
    expect(truth?.conditionKnown).toBe(false)
  })

  it('reveals condition truth when rescue is active or completed', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-rescue'] })
    const truth = getMiraCustodyTruthForPlayer(state)

    expect(truth?.conditionKnown).toBe(true)
  })

  it('reveals condition truth when rescue is active', () => {
    const state = createBaseState({
      activeQuests: [{ questId: 'quest-mira-rescue', acceptedOnDay: 1, status: 'active', acceptedTitle: 'Test', stageId: 'stage1' } as QuestRuntime],
    })
    const truth = getMiraCustodyTruthForPlayer(state)

    expect(truth?.conditionKnown).toBe(true)
  })
})

describe('getMiraSiteDescription', () => {
  it('returns null when site truth is not earned', () => {
    const state = createBaseState()
    expect(getMiraSiteDescription(state)).toBeNull()
  })

  it('returns tannery description when site truth is earned', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-act1-wren-favor'] })
    const description = getMiraSiteDescription(state)

    expect(description).toBe("the old tannery on the Pale's eastern edge")
  })

  it('returns null when Mira has no siteId', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-act1-wren-favor'] })
    state.npcCaptivityStates['npc-mira']!.siteId = null

    expect(getMiraSiteDescription(state)).toBeNull()
  })
})

describe('getMiraRoomRouteDescription', () => {
  it('returns null when room-route truth is not earned', () => {
    const state = createBaseState()
    expect(getMiraRoomRouteDescription(state)).toBeNull()
  })

  it('returns room route description when earned', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-act2-tannery-watch'] })
    const description = getMiraRoomRouteDescription(state)

    expect(description).toBe('the holding floor and inner ring')
  })
})

describe('getMiraHandlerName', () => {
  it('returns null when handler truth is not earned', () => {
    const state = createBaseState()
    expect(getMiraHandlerName(state)).toBeNull()
  })

  it('returns Dalen Morke when handler truth is earned', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-act2-tannery-watch'] })
    const name = getMiraHandlerName(state)

    expect(name).toBe('Dalen Morke')
  })
})

describe('getMiraConditionDescription', () => {
  it('returns null when condition truth is not earned', () => {
    const state = createBaseState()
    expect(getMiraConditionDescription(state)).toBeNull()
  })

  it('returns hurt condition description', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-rescue'] })
    const description = getMiraConditionDescription(state)

    expect(description).toContain('visible signs of strain')
  })

  it('returns broken condition description', () => {
    const state = createBaseState({
      completedQuestIds: ['quest-mira-rescue'],
    })
    state.npcCaptivityStates['npc-mira']!.condition = 'broken'

    const description = getMiraConditionDescription(state)
    expect(description).toContain('flinches at sudden movements')
  })

  it('returns altered condition description', () => {
    const state = createBaseState({
      completedQuestIds: ['quest-mira-rescue'],
    })
    state.npcCaptivityStates['npc-mira']!.condition = 'altered'

    const description = getMiraConditionDescription(state)
    expect(description).toContain('something fundamental has shifted')
  })

  it('returns healthy condition description', () => {
    const state = createBaseState({
      completedQuestIds: ['quest-mira-rescue'],
    })
    state.npcCaptivityStates['npc-mira']!.condition = 'healthy'

    const description = getMiraConditionDescription(state)
    expect(description).toContain('physically intact')
  })
})
