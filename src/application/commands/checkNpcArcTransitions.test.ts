import { describe, expect, it } from 'vitest'
import { checkNpcArcTransitions, checkFracturedArcBranching } from './checkNpcArcTransitions'
import { initialStateWithIda } from './testFixtures'
import type { GameState, NpcRuntimeState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'

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

describe('checkFracturedArcBranching', () => {
  function makeBrenNpc(stageEnteredDay: number, stage = 'cracking', flags: Record<string, boolean> = {}): NpcRuntimeState {
    return {
      ...initialStateWithIda.roster[0]!,
      npcId: 'npc-bren-aldoth',
      name: 'Bren Aldoth',
      npcArc: { arcId: 'arc-fractured', stage, stageEnteredDay, stageFlags: flags, driftHistory: [] },
      traits: { ...initialStateWithIda.roster[0]!.traits, loyalty: 68, empathy: 38, discipline: 81 },
    }
  }

  function makeAnchorNpc(): NpcRuntimeState {
    return {
      ...initialStateWithIda.roster[0]!,
      npcId: 'npc-anchor-test',
      name: 'Anchor Person',
      traits: { ...initialStateWithIda.roster[0]!.traits, empathy: 65 },
      npcArc: null,
    }
  }

  it('does nothing if Bren has less than 30 days in cracking stage', () => {
    const bren = makeBrenNpc(initialStateWithIda.day - 10)
    const state = { ...initialStateWithIda, roster: [bren] }
    const result = checkFracturedArcBranching(state)
    expect(result.roster[0]!.npcArc!.stage).toBe('cracking')
  })

  it('advances to broken when no anchor NPC after 30 days', () => {
    const bren = makeBrenNpc(initialStateWithIda.day - 35)
    const state = { ...initialStateWithIda, roster: [bren] }
    const result = checkFracturedArcBranching(state)
    expect(result.roster[0]!.npcArc!.stage).toBe('broken')
  })

  it('advances to healing when anchor NPC has empathy>60 and trust≥40', () => {
    const bren = makeBrenNpc(initialStateWithIda.day - 35)
    const anchor = makeAnchorNpc()
    const relKey = buildRelationshipKey(anchor.npcId, bren.npcId)
    const state: GameState = {
      ...initialStateWithIda,
      roster: [anchor, bren],
      relationships: { [relKey]: { affinity: 50, trust: 45, respect: 40, fear: 0, loyalty: 30 } },
    }
    const result = checkFracturedArcBranching(state)
    const brenAfter = result.roster.find((n) => n.npcId === bren.npcId)!
    expect(brenAfter.npcArc!.stage).toBe('healing')
    expect(brenAfter.npcArc!.stageFlags['anchorNpcId']).toBe(true)
  })

  it('queues leaving-warning event when advancing to broken', () => {
    const bren = makeBrenNpc(initialStateWithIda.day - 35)
    const state = { ...initialStateWithIda, roster: [bren] }
    const result = checkFracturedArcBranching(state)
    expect(result.pendingEvents.some((e) => e.eventId === 'event-bren-leaving-warning')).toBe(true)
  })

  it('queues bren-left event after 10 days in broken stage', () => {
    const bren = makeBrenNpc(initialStateWithIda.day - 15, 'broken')
    const state = { ...initialStateWithIda, roster: [bren] }
    const result = checkFracturedArcBranching(state)
    expect(result.pendingEvents.some((e) => e.eventId === 'event-bren-left')).toBe(true)
  })

  it('does not duplicate leaving-warning if already pending', () => {
    const bren = makeBrenNpc(initialStateWithIda.day - 35)
    const state = {
      ...initialStateWithIda,
      roster: [bren],
      pendingEvents: [{ eventId: 'event-bren-leaving-warning', firedOnDay: initialStateWithIda.day - 1 }],
    }
    const result = checkFracturedArcBranching(state)
    const count = result.pendingEvents.filter((e) => e.eventId === 'event-bren-leaving-warning').length
    expect(count).toBe(1)
  })
})
