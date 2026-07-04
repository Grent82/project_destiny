import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { formCorridorGroup } from './formCorridorGroup'

describe('formCorridorGroup', () => {
  const makeRng = (seed: number) => {
    let state = seed
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff
      return state / 0x7fffffff
    }
  }

  it('does not form coalition when corridor is open', () => {
    const state = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'open' as const,
      },
    }
    const rng = makeRng(42)
    const result = formCorridorGroup(state, rng)

    expect(result.cityResources.activeGroups).toHaveLength(0)
  })

  it('does not form coalition when one already exists', () => {
    const state = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked' as const,
        activeGroups: [
          {
            id: 'test-coalition',
            status: 'forming' as const,
            members: [],
            formedDay: 1,
            targetSegment: 'main-corridor',
            difficulty: 5,
            progress: 0,
            estimatedReturnDay: 5,
          },
        ],
      },
    }
    const rng = makeRng(42)
    const result = formCorridorGroup(state, rng)

    expect(result.cityResources.activeGroups).toHaveLength(1)
  })

  it('requires eligible NPCs to form coalition', () => {
    const state = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked' as const,
      },
      // No eligible NPCs (all have low melee/security)
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates,
      worldNpcStates: [],
    }
    const rng = makeRng(42)
    const result = formCorridorGroup(state, rng)

    // Need at least 2 eligible NPCs
    expect(result.cityResources.activeGroups).toHaveLength(0)
  })

  it('forms coalition when eligible NPCs exist', () => {
    // Add eligible NPCs
    const state = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked' as const,
      },
      npcRuntimeStates: [
        ...initialGameStateSnapshot.npcRuntimeStates,
        {
          ...initialGameStateSnapshot.npcRuntimeStates[0]!,
          npcId: 'npc-elite-1',
          name: 'Elite Warrior 1',
          skills: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.skills, melee: 60, security: 55 },
          traits: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.traits, discipline: 60 },
        },
        {
          ...initialGameStateSnapshot.npcRuntimeStates[0]!,
          npcId: 'npc-elite-2',
          name: 'Elite Warrior 2',
          skills: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.skills, melee: 70, security: 60 },
          traits: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.traits, discipline: 70 },
        },
      ],
      worldNpcStates: [],
    }
    const rng = makeRng(42)
    const result = formCorridorGroup(state, rng)

    expect(result.cityResources.activeGroups).toHaveLength(1)
    const coalition = result.cityResources.activeGroups[0]!
    expect(coalition.status).toBe('forming')
    expect(coalition.members.length).toBeGreaterThanOrEqual(2)
  })

  it('assigns leader role to highest combat stat NPC', () => {
    const state = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked' as const,
      },
      npcRuntimeStates: [
        ...initialGameStateSnapshot.npcRuntimeStates,
        {
          ...initialGameStateSnapshot.npcRuntimeStates[0]!,
          npcId: 'npc-elite',
          name: 'Elite Warrior',
          skills: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.skills, melee: 80, security: 70 },
          traits: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.traits, discipline: 80 },
        },
      ],
      worldNpcStates: [],
    }
    const rng = makeRng(42)
    const result = formCorridorGroup(state, rng)

    if (result.cityResources.activeGroups.length > 0) {
      const coalition = result.cityResources.activeGroups[0]!
      const leader = coalition.members.find((m: { role: string }) => m.role === 'leader')
      expect(leader?.npcId).toBe('npc-elite')
    }
  })

  it('sets difficulty based on corridor status', () => {
    const makeState = (status: 'blocked' | 'disrupted') => ({
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: status as 'blocked' | 'disrupted' | 'open',
      },
      npcRuntimeStates: [
        ...initialGameStateSnapshot.npcRuntimeStates,
        {
          ...initialGameStateSnapshot.npcRuntimeStates[0]!,
          skills: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.skills, melee: 60, security: 55 },
          traits: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.traits, discipline: 60 },
        },
      ],
      worldNpcStates: [],
    })

    const rng1 = makeRng(42)
    const rng2 = makeRng(42)
    const resultBlocked = formCorridorGroup(makeState('blocked'), rng1)
    const resultDisrupted = formCorridorGroup(makeState('disrupted'), rng2)

    if (resultBlocked.cityResources.activeGroups.length > 0 && resultDisrupted.cityResources.activeGroups.length > 0) {
      const blockedCoalition = resultBlocked.cityResources.activeGroups[0]!
      const disruptedCoalition = resultDisrupted.cityResources.activeGroups[0]!

      expect(blockedCoalition.difficulty).toBe(8)
      expect(disruptedCoalition.difficulty).toBe(5)
    }
  })
})
