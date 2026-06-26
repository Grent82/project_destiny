import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { joinCorridorExpedition } from './joinCorridorExpedition'

describe('joinCorridorExpedition', () => {
  const groupId = 'test-group'
  const npcId = 'npc-marion-vale'

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

  it('adds NPC to expedition and marks as deployed', () => {
    const result = joinCorridorExpedition(stateWithGroup, groupId, npcId)

    const npc = result.roster.find((r) => r.npcId === npcId)
    expect(npc?.assignment).toBe('deployed')
    expect(result.cityResources.activeGroups[0]!.playerContribution?.joinedNpcIds).toContain(npcId)
  })

  it('returns state unchanged if group not found', () => {
    const result = joinCorridorExpedition(stateWithGroup, 'non-existent-group', npcId)

    expect(result).toEqual(stateWithGroup)
  })

  it('returns state unchanged if NPC not found', () => {
    const result = joinCorridorExpedition(stateWithGroup, groupId, 'non-existent-npc')

    expect(result).toEqual(stateWithGroup)
  })

  it('returns state unchanged if NPC is not idle', () => {
    const stateWithAssignedNpc = {
      ...stateWithGroup,
      roster: stateWithGroup.roster.map((r) =>
        r.npcId === npcId ? { ...r, assignment: 'working' as const } : r
      ),
    }

    const result = joinCorridorExpedition(stateWithAssignedNpc, groupId, npcId)

    const npc = result.roster.find((r) => r.npcId === npcId)
    expect(npc?.assignment).toBe('working')
  })

  it('returns state unchanged if NPC is already on directive', () => {
    const stateWithDirective = {
      ...stateWithGroup,
      roster: stateWithGroup.roster.map((r) =>
        r.npcId === npcId ? { ...r, currentDirectiveId: 'some-directive' } : r
      ),
    }

    const result = joinCorridorExpedition(stateWithDirective, groupId, npcId)

    expect(result).toEqual(stateWithDirective)
  })

  it('returns state unchanged if NPC already joined expedition', () => {
    const stateWithJoinedNpc = {
      ...stateWithGroup,
      cityResources: {
        ...stateWithGroup.cityResources,
        activeGroups: [
          {
            ...stateWithGroup.cityResources.activeGroups[0]!,
            playerContribution: {
              food: 0,
              money: 0,
              material: 0,
              joinedNpcIds: [npcId],
            },
          },
        ],
      },
    }

    const result = joinCorridorExpedition(stateWithJoinedNpc, groupId, npcId)

    expect(result.cityResources.activeGroups[0]!.playerContribution?.joinedNpcIds).toHaveLength(1)
  })

  it('returns state unchanged if group is full (5 members)', () => {
    const stateWithFullGroup = {
      ...stateWithGroup,
      cityResources: {
        ...stateWithGroup.cityResources,
        activeGroups: [
          {
            ...stateWithGroup.cityResources.activeGroups[0]!,
            members: [
              { npcId: 'npc-1', role: 'leader' as const, contribution: 0, status: 'committed' as const },
              { npcId: 'npc-2', role: 'vanguard' as const, contribution: 0, status: 'committed' as const },
              { npcId: 'npc-3', role: 'support' as const, contribution: 0, status: 'committed' as const },
              { npcId: 'npc-4', role: 'scout' as const, contribution: 0, status: 'committed' as const },
            ],
            playerContribution: {
              food: 0,
              money: 0,
              material: 0,
              joinedNpcIds: ['npc-5'],
            },
          },
        ],
      },
    }

    const result = joinCorridorExpedition(stateWithFullGroup, groupId, npcId)

    expect(result).toEqual(stateWithFullGroup)
  })

  it('logs joining to activity log', () => {
    const result = joinCorridorExpedition(stateWithGroup, groupId, npcId)

    expect(result.activityLog.length).toBeGreaterThan(0)
    expect(result.activityLog[result.activityLog.length - 1]!.message).toContain('join')
  })
})
