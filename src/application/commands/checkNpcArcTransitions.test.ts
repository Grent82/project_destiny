import { describe, expect, it } from 'vitest'
import { checkNpcArcTransitions } from './checkNpcArcTransitions'
import { initialStateWithIda } from './testFixtures'
import type { NpcRuntimeState } from '../../domain'

function makeArcNpc(
  base: NpcRuntimeState,
  arcId: string,
  stage: string,
  stageEnteredDay: number,
  stageFlags: Record<string, boolean> = {},
): NpcRuntimeState {
  return {
    ...base,
    npcArc: {
      arcId,
      stage,
      stageEnteredDay,
      stageFlags,
      driftHistory: [],
    },
  }
}

describe('checkNpcArcTransitions', () => {
  it('does nothing for NPCs without npcArc', () => {
    const result = checkNpcArcTransitions(initialStateWithIda)
    expect(result).toEqual(initialStateWithIda)
  })

  it('does not transition when minDaysInStage not met', () => {
    const npc = makeArcNpc(
      initialStateWithIda.roster[0]!,
      'arc-becoming',
      'forming',
      initialStateWithIda.day - 5, // only 5 days, needs 30
    )
    const highTraitNpc = { ...npc, traits: { ...npc.traits, empathy: 80 } }
    const state = { ...initialStateWithIda, roster: [highTraitNpc] }

    const result = checkNpcArcTransitions(state)
    expect(result.roster[0]!.npcArc!.stage).toBe('forming')
  })

  it('does not transition when trait condition not met', () => {
    const npc = makeArcNpc(
      initialStateWithIda.roster[0]!,
      'arc-becoming',
      'forming',
      initialStateWithIda.day - 35,
    )
    const lowTraitNpc = {
      ...npc,
      traits: {
        discipline: 40, ambition: 30, empathy: 25, ruthlessness: 20,
        prudence: 35, curiosity: 30, dominance: 28, loyalty: 32, vanity: 15, zeal: 22,
      },
    }
    const state = { ...initialStateWithIda, roster: [lowTraitNpc] }

    const result = checkNpcArcTransitions(state)
    expect(result.roster[0]!.npcArc!.stage).toBe('forming')
  })

  it('advances forming → crystallizing when all conditions are met', () => {
    const npc = makeArcNpc(
      initialStateWithIda.roster[0]!,
      'arc-becoming',
      'forming',
      initialStateWithIda.day - 35,
    )
    const highTraitNpc = { ...npc, traits: { ...npc.traits, empathy: 80 } }
    const state = { ...initialStateWithIda, roster: [highTraitNpc] }

    const result = checkNpcArcTransitions(state)
    expect(result.roster[0]!.npcArc!.stage).toBe('crystallizing')
    expect(result.roster[0]!.npcArc!.stageEnteredDay).toBe(state.day)
  })

  it('queues lissel-first-shape event when advancing forming → crystallizing', () => {
    const npc = makeArcNpc(
      initialStateWithIda.roster[0]!,
      'arc-becoming',
      'forming',
      initialStateWithIda.day - 35,
    )
    const highTraitNpc = { ...npc, traits: { ...npc.traits, empathy: 80 } }
    const state = { ...initialStateWithIda, roster: [highTraitNpc] }

    const result = checkNpcArcTransitions(state)
    expect(result.pendingEvents.some((pe) => pe.eventId === 'lissel-first-shape')).toBe(true)
  })

  it('writes dominant trait type to stageFlags when entering crystallizing', () => {
    const npc = makeArcNpc(
      initialStateWithIda.roster[0]!,
      'arc-becoming',
      'forming',
      initialStateWithIda.day - 35,
    )
    // curiosity is the highest crystallization trait
    const curiousNpc = {
      ...npc,
      traits: {
        ...npc.traits,
        curiosity: 85,
        discipline: 40,
        empathy: 30,
        ruthlessness: 20,
      },
    }
    const state = { ...initialStateWithIda, roster: [curiousNpc] }

    const result = checkNpcArcTransitions(state)
    expect(result.roster[0]!.npcArc!.stageFlags['type-curious']).toBe(true)
  })

  it('writes discipline type when discipline is highest crystallization trait', () => {
    const npc = makeArcNpc(
      initialStateWithIda.roster[0]!,
      'arc-becoming',
      'forming',
      initialStateWithIda.day - 35,
    )
    const disciplinedNpc = {
      ...npc,
      traits: {
        ...npc.traits,
        discipline: 90,
        curiosity: 40,
        empathy: 30,
        ruthlessness: 20,
      },
    }
    const state = { ...initialStateWithIda, roster: [disciplinedNpc] }

    const result = checkNpcArcTransitions(state)
    expect(result.roster[0]!.npcArc!.stageFlags['type-disciplined']).toBe(true)
  })

  it('advances crystallizing → set and queues type-specific + settled events', () => {
    const npc = makeArcNpc(
      initialStateWithIda.roster[0]!,
      'arc-becoming',
      'crystallizing',
      initialStateWithIda.day - 70, // 70 days >= 60 required
      { 'type-empathic': true },
    )
    // All traits above 45 (allTraitsAbove condition)
    const highAllTraitNpc = {
      ...npc,
      traits: {
        discipline: 50, ambition: 50, empathy: 80, ruthlessness: 46,
        prudence: 50, curiosity: 50, dominance: 50, loyalty: 50, vanity: 50, zeal: 50,
      },
    }
    const state = { ...initialStateWithIda, roster: [highAllTraitNpc] }

    const result = checkNpcArcTransitions(state)
    expect(result.roster[0]!.npcArc!.stage).toBe('set')
    expect(result.pendingEvents.some((pe) => pe.eventId === 'lissel-crystallized-empathic')).toBe(true)
    expect(result.pendingEvents.some((pe) => pe.eventId === 'lissel-settled')).toBe(true)
  })

  it('does not queue duplicate transition events', () => {
    const npc = makeArcNpc(
      initialStateWithIda.roster[0]!,
      'arc-becoming',
      'forming',
      initialStateWithIda.day - 35,
    )
    const highTraitNpc = { ...npc, traits: { ...npc.traits, empathy: 80 } }
    const state = {
      ...initialStateWithIda,
      roster: [highTraitNpc],
      pendingEvents: [{ eventId: 'lissel-first-shape', firedOnDay: 1 }],
    }

    const result = checkNpcArcTransitions(state)
    const count = result.pendingEvents.filter((pe) => pe.eventId === 'lissel-first-shape').length
    expect(count).toBe(1)
  })

  it('does not transition from terminal stage (set)', () => {
    const npc = makeArcNpc(
      initialStateWithIda.roster[0]!,
      'arc-becoming',
      'set',
      0,
    )
    const state = { ...initialStateWithIda, roster: [npc] }

    const result = checkNpcArcTransitions(state)
    expect(result.roster[0]!.npcArc!.stage).toBe('set')
  })

  it('adds activity log entry when transitioning', () => {
    const npc = makeArcNpc(
      initialStateWithIda.roster[0]!,
      'arc-becoming',
      'forming',
      initialStateWithIda.day - 35,
    )
    const highTraitNpc = { ...npc, traits: { ...npc.traits, empathy: 80 } }
    const state = { ...initialStateWithIda, roster: [highTraitNpc] }

    const result = checkNpcArcTransitions(state)
    const hasLog = result.activityLog.some((entry) => entry.message.includes(npc.name))
    expect(hasLog).toBe(true)
  })
})
