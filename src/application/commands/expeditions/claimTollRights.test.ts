import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { claimTollRights } from './claimTollRights'

describe('claimTollRights', () => {
  const groupId = 'test-group'

  const stateWithGroup = {
    ...initialGameStateSnapshot,
    cityResources: {
      ...initialGameStateSnapshot.cityResources,
      activeGroups: [
        {
          id: groupId,
          status: 'forming' as const,
          members: [],
          formedDay: 1,
          targetSegment: 'main-corridor',
          difficulty: 5,
          progress: 0,
          estimatedReturnDay: 10,
          playerContribution: {
            food: 0,
            money: 0,
            material: 0,
            joinedNpcIds: [],
          },
        },
      ],
    },
  }

  it('claims toll rights with sufficient money contribution', () => {
    const state = {
      ...stateWithGroup,
      cityResources: {
        ...stateWithGroup.cityResources,
        activeGroups: [
          {
            ...stateWithGroup.cityResources.activeGroups[0]!,
            playerContribution: {
              food: 0,
              money: 200,
              material: 0,
              joinedNpcIds: [],
            },
          },
        ],
      },
    }

    const result = claimTollRights(state, groupId)

    expect(result.cityResources.activeGroups[0]!.tollRights).toEqual({
      holder: 'player',
      rate: 15,
    })
  })

  it('claims toll rights with sufficient food contribution', () => {
    const state = {
      ...stateWithGroup,
      cityResources: {
        ...stateWithGroup.cityResources,
        activeGroups: [
          {
            ...stateWithGroup.cityResources.activeGroups[0]!,
            playerContribution: {
              food: 100,
              money: 0,
              material: 0,
              joinedNpcIds: [],
            },
          },
        ],
      },
    }

    const result = claimTollRights(state, groupId)

    // 100 food * 2 = 200 total, which is >= 200, so rate is 15
    expect(result.cityResources.activeGroups[0]!.tollRights).toEqual({
      holder: 'player',
      rate: 15,
    })
  })

  it('claims toll rights with sufficient material contribution', () => {
    const state = {
      ...stateWithGroup,
      cityResources: {
        ...stateWithGroup.cityResources,
        activeGroups: [
          {
            ...stateWithGroup.cityResources.activeGroups[0]!,
            playerContribution: {
              food: 0,
              money: 0,
              material: 50,
              joinedNpcIds: [],
            },
          },
        ],
      },
    }

    const result = claimTollRights(state, groupId)

    // 50 material * 5 = 250 total, which is >= 200, so rate is 15
    expect(result.cityResources.activeGroups[0]!.tollRights).toEqual({
      holder: 'player',
      rate: 15,
    })
  })

  it('grants higher toll rate for large contributions', () => {
    const state = {
      ...stateWithGroup,
      cityResources: {
        ...stateWithGroup.cityResources,
        activeGroups: [
          {
            ...stateWithGroup.cityResources.activeGroups[0]!,
            playerContribution: {
              food: 0,
              money: 500,
              material: 0,
              joinedNpcIds: [],
            },
          },
        ],
      },
    }

    const result = claimTollRights(state, groupId)

    expect(result.cityResources.activeGroups[0]!.tollRights?.rate).toBe(25)
  })

  it('returns state unchanged if group not found', () => {
    const result = claimTollRights(stateWithGroup, 'non-existent-group')

    expect(result).toEqual(stateWithGroup)
  })

  it('returns state unchanged if no player contribution', () => {
    const result = claimTollRights(stateWithGroup, groupId)

    expect(result.cityResources.activeGroups[0]!.tollRights).toBeUndefined()
  })

  it('returns state unchanged if contribution below threshold', () => {
    const state = {
      ...stateWithGroup,
      cityResources: {
        ...stateWithGroup.cityResources,
        activeGroups: [
          {
            ...stateWithGroup.cityResources.activeGroups[0]!,
            playerContribution: {
              food: 10,
              money: 30,
              material: 5,
              joinedNpcIds: [],
            },
          },
        ],
      },
    }

    const result = claimTollRights(state, groupId)

    // 10*2 + 30 + 5*5 = 20 + 30 + 25 = 75, still below 100 minimum
    expect(result.cityResources.activeGroups[0]!.tollRights).toBeUndefined()
  })

  it('returns state unchanged if toll rights already claimed', () => {
    const state = {
      ...stateWithGroup,
      cityResources: {
        ...stateWithGroup.cityResources,
        activeGroups: [
          {
            ...stateWithGroup.cityResources.activeGroups[0]!,
            playerContribution: {
              food: 0,
              money: 200,
              material: 0,
              joinedNpcIds: [],
            },
            tollRights: {
              holder: 'npc-someone',
              rate: 10,
            },
          },
        ],
      },
    }

    const result = claimTollRights(state, groupId)

    expect(result.cityResources.activeGroups[0]!.tollRights?.holder).toBe('npc-someone')
  })

  it('logs toll claim to activity log', () => {
    const state = {
      ...stateWithGroup,
      cityResources: {
        ...stateWithGroup.cityResources,
        activeGroups: [
          {
            ...stateWithGroup.cityResources.activeGroups[0]!,
            playerContribution: {
              food: 0,
              money: 200,
              material: 0,
              joinedNpcIds: [],
            },
          },
        ],
      },
    }

    const result = claimTollRights(state, groupId)

    expect(result.activityLog.length).toBeGreaterThan(0)
    expect(result.activityLog[result.activityLog.length - 1]!.message).toContain('toll')
  })
})
