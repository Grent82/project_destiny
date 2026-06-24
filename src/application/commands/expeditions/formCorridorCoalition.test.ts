import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { formCorridorCoalition } from './formCorridorCoalition'

describe('formCorridorCoalition', () => {
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
        corridorStatus: 'open',
      },
    }
    const rng = makeRng(42)
    const result = formCorridorCoalition(state, rng)

    expect(result.cityResources.activeCoalitions).toHaveLength(0)
  })

  it('does not form coalition when one already exists', () => {
    const state = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked',
        activeCoalitions: [
          {
            id: 'test-coalition',
            status: 'forming',
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
    const result = formCorridorCoalition(state, rng)

    expect(result.cityResources.activeCoalitions).toHaveLength(1)
  })

  it('forms coalition with eligible NPCs', () => {
    // Add an eligible NPC to roster
    const state = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked',
      },
      roster: [
        ...initialGameStateSnapshot.roster,
        {
          ...initialGameStateSnapshot.roster[0]!,
          skills: { ...initialGameStateSnapshot.roster[0]!.skills, melee: 60, security: 55 },
          traits: { ...initialGameStateSnapshot.roster[0]!.traits, discipline: 60 },
        },
      ],
    }
    const rng = makeRng(42)
    const result = formCorridorCoalition(state, rng)

    expect(result.cityResources.activeCoalitions).toHaveLength(1)
    const coalition = result.cityResources.activeCoalitions[0]!
    expect(coalition.status).toBe('forming')
    expect(coalition.members.length).toBeGreaterThanOrEqual(2)
  })

  it('assigns leader role to highest combat stat NPC', () => {
    const state = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked',
      },
      roster: [
        ...initialGameStateSnapshot.roster,
        {
          ...initialGameStateSnapshot.roster[0]!,
          npcId: 'npc-elite',
          name: 'Elite Warrior',
          skills: { ...initialGameStateSnapshot.roster[0]!.skills, melee: 80, security: 70 },
          traits: { ...initialGameStateSnapshot.roster[0]!.traits, discipline: 80 },
        },
      ],
    }
    const rng = makeRng(42)
    const result = formCorridorCoalition(state, rng)

    const coalition = result.cityResources.activeCoalitions[0]!
    const leader = coalition.members.find((m) => m.role === 'leader')
    expect(leader?.npcId).toBe('npc-elite')
  })

  it('sets difficulty based on corridor status', () => {
    const stateBlocked = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked',
      },
      roster: [
        ...initialGameStateSnapshot.roster,
        {
          ...initialGameStateSnapshot.roster[0]!,
          skills: { ...initialGameStateSnapshot.roster[0]!.skills, melee: 60, security: 55 },
          traits: { ...initialGameStateSnapshot.roster[0]!.traits, discipline: 60 },
        },
      ],
    }

    const stateDisrupted = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'disrupted',
      },
      roster: [
        ...initialGameStateSnapshot.roster,
        {
          ...initialGameStateSnapshot.roster[0]!,
          skills: { ...initialGameStateSnapshot.roster[0]!.skills, melee: 60, security: 55 },
          traits: { ...initialGameStateSnapshot.roster[0]!.traits, discipline: 60 },
        },
      ],
    }

    const rng1 = makeRng(42)
    const rng2 = makeRng(42)
    const resultBlocked = formCorridorCoalition(stateBlocked, rng1)
    const resultDisrupted = formCorridorCoalition(stateDisrupted, rng2)

    const blockedCoalition = resultBlocked.cityResources.activeCoalitions[0]!
    const disruptedCoalition = resultDisrupted.cityResources.activeCoalitions[0]!

    expect(blockedCoalition.difficulty).toBe(8)
    expect(disruptedCoalition.difficulty).toBe(5)
  })

  it('publishes coalition-formed event', () => {
    const state = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked',
      },
      roster: [
        ...initialGameStateSnapshot.roster,
        {
          ...initialGameStateSnapshot.roster[0]!,
          skills: { ...initialGameStateSnapshot.roster[0]!.skills, melee: 60, security: 55 },
          traits: { ...initialGameStateSnapshot.roster[0]!.traits, discipline: 60 },
        },
      ],
    }
    const rng = makeRng(42)
    const result = formCorridorCoalition(state, rng)

    const coalitionEvents = result.worldEvents.filter((e) => e.type === 'coalition-formed')
    expect(coalitionEvents.length).toBeGreaterThan(0)
  })
})
