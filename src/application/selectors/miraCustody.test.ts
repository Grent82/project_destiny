import { describe, expect, it } from 'vitest'

import type { GameState } from '../../domain'
import { createRuntimeStateFromDefinition } from '../commands/createRuntimeStateFromDefinition'
import {
  getMiraCustodyTruthForPlayer,
  getMiraSiteDescription,
  getMiraRoomRouteDescription,
  getMiraHandlerName,
  getMiraConditionDescription,
  getMiraQuestBeats,
} from './miraCustody'

import type { QuestRuntime } from '../../domain/quests/contracts'

function createBaseState(overrides: Partial<GameState> = {}): Pick<GameState, 'npcRuntimeStates' | 'completedQuestIds' | 'activeQuests'> {
  const mira = createRuntimeStateFromDefinition('npc-mira', {
    playerRosterMember: false,
    captivityState: {
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
  })
  return {
    completedQuestIds: overrides.completedQuestIds ?? [],
    activeQuests: overrides.activeQuests ?? [],
    npcRuntimeStates: overrides.npcRuntimeStates ?? [mira],
  }
}

/** Finds Mira's captivityState in the fixture state built by createBaseState, for test mutation. */
function miraCaptivity(state: Pick<GameState, 'npcRuntimeStates'>) {
  return state.npcRuntimeStates.find((n) => n.npcId === 'npc-mira')!.captivityState!
}

describe('getMiraCustodyTruthForPlayer', () => {
  it('returns null when Mira is not in captivity', () => {
    const state = createBaseState()
    miraCaptivity(state).status = 'rescued'

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
    miraCaptivity(state).siteId = null

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
    miraCaptivity(state).condition = 'broken'

    const description = getMiraConditionDescription(state)
    expect(description).toContain('flinches at sudden movements')
  })

  it('returns altered condition description', () => {
    const state = createBaseState({
      completedQuestIds: ['quest-mira-rescue'],
    })
    miraCaptivity(state).condition = 'altered'

    const description = getMiraConditionDescription(state)
    expect(description).toContain('something fundamental has shifted')
  })

  it('returns healthy condition description', () => {
    const state = createBaseState({
      completedQuestIds: ['quest-mira-rescue'],
    })
    miraCaptivity(state).condition = 'healthy'

    const description = getMiraConditionDescription(state)
    expect(description).toContain('physically intact')
  })
})

describe('getMiraQuestBeats', () => {
  it('returns empty array for non-Mira quests', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-act1-wren-favor'] })
    const beats = getMiraQuestBeats(state, 'quest-generic-contract')

    expect(beats).toEqual([])
  })

  it('returns empty array when Mira is not in captivity', () => {
    const state = createBaseState()
    miraCaptivity(state).status = 'rescued'

    const beats = getMiraQuestBeats(state, 'quest-mira-rescue')
    expect(beats).toEqual([])
  })

  it('returns empty array on fresh save (no quest progression)', () => {
    const state = createBaseState()
    const beats = getMiraQuestBeats(state, 'quest-mira-act2-tannery-watch')

    expect(beats).toEqual([])
  })

  it('returns act2 beats when act1 is completed', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-act1-wren-favor'] })
    const beats = getMiraQuestBeats(state, 'quest-mira-act2-tannery-watch')

    // Should have investigating beat with site info
    const investigatingBeat = beats.find((b) => b.atStageId === 'investigating')
    expect(investigatingBeat).toBeDefined()
    expect(investigatingBeat?.journalEntry).toContain('tannery')
  })

  it('returns act2 beats with handler info when act2 is completed', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-act2-tannery-watch'] })
    const beats = getMiraQuestBeats(state, 'quest-mira-act2-tannery-watch')

    // Should have on-site beat with handler name
    const onSiteBeat = beats.find((b) => b.atStageId === 'on-site')
    expect(onSiteBeat).toBeDefined()
    expect(onSiteBeat?.journalEntry).toContain('Dalen Morke')
    expect(onSiteBeat?.journalEntry).toContain('holding floor')
  })

  it('returns rescue beats with handler info when act2 is completed', () => {
    const state = createBaseState({ completedQuestIds: ['quest-mira-act2-tannery-watch'] })
    const beats = getMiraQuestBeats(state, 'quest-mira-rescue')

    // Should have pressured beat with handler name and site
    const pressuredBeat = beats.find((b) => b.atStageId === 'pressured')
    expect(pressuredBeat).toBeDefined()
    expect(pressuredBeat?.journalEntry).toContain('Dalen Morke')
    expect(pressuredBeat?.journalEntry).toContain('tannery')
  })

  it('returns rescue beats with condition info when rescue is active', () => {
    const state = createBaseState({
      activeQuests: [{ questId: 'quest-mira-rescue', acceptedOnDay: 1, status: 'active', acceptedTitle: 'Test', stageId: 'stage1' } as QuestRuntime],
    })
    const beats = getMiraQuestBeats(state, 'quest-mira-rescue')

    // Should have setback beat with condition description
    const setbackBeat = beats.find((b) => b.atStageId === 'setback')
    expect(setbackBeat).toBeDefined()
    expect(setbackBeat?.journalEntry).toContain('strain') // hurt condition
  })

  it('does not leak custody info for Mira quests on fresh save', () => {
    const state = createBaseState() // No completed quests, no active quests
    const beats = getMiraQuestBeats(state, 'quest-mira-rescue')

    // Should return empty array - no truth earned yet
    expect(beats).toEqual([])
  })
})
