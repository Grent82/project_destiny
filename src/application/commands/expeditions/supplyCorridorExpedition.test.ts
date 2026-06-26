import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { supplyCorridorExpedition } from './supplyCorridorExpedition'

describe('supplyCorridorExpedition', () => {
  const groupId = 'test-group'

  const stateWithGroup = {
    ...initialGameStateSnapshot,
    money: 1000,
    cityResources: {
      ...initialGameStateSnapshot.cityResources,
      foodStock: 500,
      materialStock: 300,
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

  it('donates food to expedition', () => {
    const result = supplyCorridorExpedition(stateWithGroup, groupId, 'food', 50)

    expect(result.cityResources.foodStock).toBe(450)
    expect(result.cityResources.activeGroups[0]!.playerContribution?.food).toBe(50)
  })

  it('donates money to expedition', () => {
    const result = supplyCorridorExpedition(stateWithGroup, groupId, 'money', 200)

    expect(result.money).toBe(800)
    expect(result.cityResources.activeGroups[0]!.playerContribution?.money).toBe(200)
  })

  it('donates material to expedition', () => {
    const result = supplyCorridorExpedition(stateWithGroup, groupId, 'material', 30)

    expect(result.cityResources.materialStock).toBe(270)
    expect(result.cityResources.activeGroups[0]!.playerContribution?.material).toBe(30)
  })

  it('returns state unchanged if group not found', () => {
    const result = supplyCorridorExpedition(stateWithGroup, 'non-existent-group', 'money', 100)

    expect(result).toEqual(stateWithGroup)
  })

  it('returns state unchanged if player lacks resources', () => {
    const result = supplyCorridorExpedition(stateWithGroup, groupId, 'money', 5000)

    expect(result.money).toBe(1000) // Unchanged
    expect(result.cityResources.activeGroups[0]!.playerContribution?.money).toBe(0)
  })

  it('returns state unchanged if amount is zero or negative', () => {
    const result1 = supplyCorridorExpedition(stateWithGroup, groupId, 'money', 0)
    const result2 = supplyCorridorExpedition(stateWithGroup, groupId, 'money', -50)

    expect(result1).toEqual(stateWithGroup)
    expect(result2).toEqual(stateWithGroup)
  })

  it('accumulates multiple donations', () => {
    let result = supplyCorridorExpedition(stateWithGroup, groupId, 'money', 100)
    result = supplyCorridorExpedition(result, groupId, 'money', 50)
    result = supplyCorridorExpedition(result, groupId, 'food', 30)

    expect(result.cityResources.activeGroups[0]!.playerContribution?.money).toBe(150)
    expect(result.cityResources.activeGroups[0]!.playerContribution?.food).toBe(30)
  })

  it('logs donation to activity log', () => {
    const result = supplyCorridorExpedition(stateWithGroup, groupId, 'money', 100)

    expect(result.activityLog.length).toBeGreaterThan(0)
    expect(result.activityLog[result.activityLog.length - 1]!.message).toContain('supplied')
  })
})
