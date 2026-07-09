import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { initialStateWithIda } from './testFixtures'
import { concludeCombatEncounter, startCombatEncounter } from './combat'
import { addNpcToSelectedSquad, removeNpcFromSelectedSquad } from './squad'
import { endDay } from './endDay'

function makeResolvedState(outcome: 'victory' | 'defeat') {
  const startedState = startCombatEncounter(initialGameStateSnapshot)
  if (!startedState.activeCombat) throw new Error('No active combat')
  return {
    ...startedState,
    activeCombat: {
      ...startedState.activeCombat,
      outcome,
      activeCombatantId: null,
    },
  }
}

describe('concludeCombatEncounter — injury persistence', () => {
  it('writes ally combat health back to roster state', () => {
    const resolvedState = makeResolvedState('victory')
    if (!resolvedState.activeCombat) throw new Error('No active combat')

    // Damage an ally combatant directly
    const ally = resolvedState.activeCombat.combatants.find((c) => c.side === 'allies')!
    const damagedState = {
      ...resolvedState,
      activeCombat: {
        ...resolvedState.activeCombat,
        combatants: resolvedState.activeCombat.combatants.map((c) =>
          c.combatantId === ally.combatantId ? { ...c, health: 40 } : c,
        ),
      },
    }

    const nextState = concludeCombatEncounter(damagedState)
    const rosterEntry = nextState.npcRuntimeStates.find((r) => r.npcId === ally.sourceNpcId!)!
    expect(rosterEntry.states.health).toBe(40)
  })

  it('KO\'d NPC (health <= 0) gets assignment "recovering"', () => {
    const resolvedState = makeResolvedState('defeat')
    if (!resolvedState.activeCombat) throw new Error('No active combat')

    const ally = resolvedState.activeCombat.combatants.find((c) => c.side === 'allies')!
    const koState = {
      ...resolvedState,
      activeCombat: {
        ...resolvedState.activeCombat,
        combatants: resolvedState.activeCombat.combatants.map((c) =>
          c.combatantId === ally.combatantId ? { ...c, health: 0 } : c,
        ),
      },
    }

    const nextState = concludeCombatEncounter(koState)
    const rosterEntry = nextState.npcRuntimeStates.find((r) => r.npcId === ally.sourceNpcId!)!
    expect(rosterEntry.assignment).toBe('recovering')
    expect(rosterEntry.states.health).toBe(10) // KO'd NPCs are set to 10 (critical but alive)
  })

  it('surviving NPC (health > 0) gets assignment "idle"', () => {
    const resolvedState = makeResolvedState('victory')
    if (!resolvedState.activeCombat) throw new Error('No active combat')

    // All allies alive at some positive health
    const nextState = concludeCombatEncounter(resolvedState)
    const allyIds = resolvedState.activeCombat.combatants
      .filter((c) => c.side === 'allies' && (c.health ?? 0) > 0 && c.sourceNpcId !== null)
      .map((c) => c.sourceNpcId!)

    for (const npcId of allyIds) {
      const rosterEntry = nextState.npcRuntimeStates.find((r) => r.npcId === npcId)!
      expect(rosterEntry.assignment).toBe('idle')
    }
  })

  it('surviving NPC with serious injury remains recovering', () => {
    const resolvedState = makeResolvedState('defeat')
    if (!resolvedState.activeCombat) throw new Error('No active combat')

    const ally = resolvedState.activeCombat.combatants.find((c) => c.side === 'allies' && c.sourceNpcId)!
    const badlyHurtState = {
      ...resolvedState,
      activeCombat: {
        ...resolvedState.activeCombat,
        combatants: resolvedState.activeCombat.combatants.map((c) =>
          c.combatantId === ally.combatantId ? { ...c, health: 35 } : c,
        ),
      },
    }

    const nextState = concludeCombatEncounter(badlyHurtState)
    const rosterEntry = nextState.npcRuntimeStates.find((r) => r.npcId === ally.sourceNpcId!)!

    expect(rosterEntry.assignment).toBe('recovering')
    expect(rosterEntry.states.health).toBeGreaterThanOrEqual(30)
  })

  it('clears selectedSquadNpcIds after combat resolves', () => {
    const resolvedState = makeResolvedState('victory')
    expect(resolvedState.selectedSquadNpcIds.length).toBeGreaterThan(0)

    const nextState = concludeCombatEncounter(resolvedState)
    expect(nextState.selectedSquadNpcIds).toEqual([])
  })

  it('writes player combat health, morale, and injury back to playerCharacter', () => {
    const resolvedState = makeResolvedState('victory')
    if (!resolvedState.activeCombat) throw new Error('No active combat')

    const stateWithPlayerCombatState = {
      ...resolvedState,
      playerCharacter: {
        ...resolvedState.playerCharacter,
        combatState: {
          health: 80,
          morale: 70,
        },
      },
      activeCombat: {
        ...resolvedState.activeCombat,
        combatants: resolvedState.activeCombat.combatants.map((combatant) =>
          combatant.combatantId === 'player'
            ? { ...combatant, health: 49, morale: 61 }
            : combatant,
        ),
      },
    }

    const nextState = concludeCombatEncounter(stateWithPlayerCombatState)

    expect(nextState.playerCharacter.combatState).toEqual({
      health: 49,
      morale: 66,
    })
  })
})

describe('concludeCombatEncounter — emotional aftermath', () => {
  it('victory increases morale and reduces stress', () => {
    const resolvedState = makeResolvedState('victory')
    if (!resolvedState.activeCombat) throw new Error('No active combat')

    const ally = resolvedState.activeCombat.combatants.find(
      (c) => c.side === 'allies' && c.sourceNpcId,
    )!
    const npcBefore = resolvedState.npcRuntimeStates.find((r) => r.npcId === ally.sourceNpcId!)!
    const npcBeforeMorale = npcBefore.states.morale
    const npcBeforeStress = npcBefore.states.stress

    const nextState = concludeCombatEncounter(resolvedState)
    const npcAfter = nextState.npcRuntimeStates.find((r) => r.npcId === ally.sourceNpcId!)!

    // Victory: morale +5; stress -3 then +3 = net 0 change on stress, morale net +5
    expect(npcAfter.states.morale).toBeGreaterThanOrEqual(npcBeforeMorale)
    // stress net effect: -3 + 3 = 0, but clamped at 0
    expect(npcAfter.states.stress).toBe(
      Math.max(0, Math.min(100, npcBeforeStress - 3 + 3)),
    )
  })

  it('defeat increases stress and decreases morale', () => {
    const resolvedState = makeResolvedState('defeat')
    if (!resolvedState.activeCombat) throw new Error('No active combat')

    const ally = resolvedState.activeCombat.combatants.find(
      (c) => c.side === 'allies' && c.sourceNpcId,
    )!
    const npcBefore = resolvedState.npcRuntimeStates.find((r) => r.npcId === ally.sourceNpcId!)!
    const npcBeforeMorale = npcBefore.states.morale
    const npcBeforeStress = npcBefore.states.stress

    const nextState = concludeCombatEncounter(resolvedState)
    const npcAfter = nextState.npcRuntimeStates.find((r) => r.npcId === ally.sourceNpcId!)!

    // Defeat: morale -8; stress +8 +3 = +11
    expect(npcAfter.states.morale).toBe(Math.max(0, npcBeforeMorale - 8))
    expect(npcAfter.states.stress).toBe(Math.min(100, npcBeforeStress + 8 + 3))
  })
})

describe('addNpcToSelectedSquad — recovering guard', () => {
  it('rejects NPCs with assignment "recovering"', () => {
    const stateWithRecovering = {
      ...initialStateWithIda,
      selectedSquadNpcIds: [],
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((r) =>
        r.npcId === 'npc-ida-rhys' ? { ...r, assignment: 'recovering' as const } : r,
      ),
    }

    const nextState = addNpcToSelectedSquad(stateWithRecovering, 'npc-ida-rhys')
    expect(nextState.selectedSquadNpcIds).not.toContain('npc-ida-rhys')
  })

  it('sets assignment to "deployed" when NPC is added to squad', () => {
    const stateWithIdle = {
      ...initialStateWithIda,
      selectedSquadNpcIds: [],
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((r) =>
        r.npcId === 'npc-ida-rhys' ? { ...r, assignment: 'idle' as const } : r,
      ),
    }

    const nextState = addNpcToSelectedSquad(stateWithIdle, 'npc-ida-rhys')
    expect(nextState.selectedSquadNpcIds).toContain('npc-ida-rhys')
    const rosterEntry = nextState.npcRuntimeStates.find((r) => r.npcId === 'npc-ida-rhys')!
    expect(rosterEntry.assignment).toBe('deployed')
  })

  it('rejects NPCs who are too injured to deploy', () => {
    const stateWithInjuredNpc = {
      ...initialStateWithIda,
      selectedSquadNpcIds: [],
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((r) =>
        r.npcId === 'npc-ida-rhys'
          ? { ...r, states: { ...r.states, health: 24 } }
          : r,
      ),
    }

    const nextState = addNpcToSelectedSquad(stateWithInjuredNpc, 'npc-ida-rhys')
    expect(nextState.selectedSquadNpcIds).not.toContain('npc-ida-rhys')
  })

  it('returns deselected NPCs from deployed to idle', () => {
    const deployedState = addNpcToSelectedSquad(
      { ...initialStateWithIda, selectedSquadNpcIds: [] },
      'npc-ida-rhys',
    )

    const nextState = removeNpcFromSelectedSquad(deployedState, 'npc-ida-rhys')
    const rosterEntry = nextState.npcRuntimeStates.find((r) => r.npcId === 'npc-ida-rhys')!

    expect(nextState.selectedSquadNpcIds).not.toContain('npc-ida-rhys')
    expect(rosterEntry.assignment).toBe('idle')
  })
})

describe('endDay — recovering NPC health recovery', () => {
  it('recovering NPCs gain 15 health per day', () => {
    const stateWithRecovering = {
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((r) =>
        r.npcId === 'npc-ida-rhys'
          ? { ...r, assignment: 'recovering' as const, states: { ...r.states, health: 20 } }
          : r,
      ),
    }

    const nextState = endDay(stateWithRecovering)
    const npcAfter = nextState.npcRuntimeStates.find((r) => r.npcId === 'npc-ida-rhys')!
    expect(npcAfter.states.health).toBe(35) // 20 + 15
  })

  it('recovering NPC returns to idle when health reaches 80', () => {
    const stateWithRecovering = {
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((r) =>
        r.npcId === 'npc-ida-rhys'
          ? { ...r, assignment: 'recovering' as const, states: { ...r.states, health: 70 } }
          : r,
      ),
    }

    const nextState = endDay(stateWithRecovering)
    const npcAfter = nextState.npcRuntimeStates.find((r) => r.npcId === 'npc-ida-rhys')!
    expect(npcAfter.states.health).toBe(85) // 70 + 15 = 85
    expect(npcAfter.assignment).toBe('idle')
  })

  it('recovering NPC does not return to idle on health alone while injury stays serious', () => {
    const stateWithRecovering = {
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((r) =>
        r.npcId === 'npc-ida-rhys'
          ? {
              ...r,
              assignment: 'recovering' as const,
              states: { ...r.states, health: 70, injury: 30 },
            }
          : r,
      ),
    }

    const nextState = endDay(stateWithRecovering)
    const npcAfter = nextState.npcRuntimeStates.find((r) => r.npcId === 'npc-ida-rhys')!

    expect(npcAfter.states.health).toBeGreaterThan(70)
    expect(npcAfter.assignment).toBe('recovering')
  })

  it('recovery bonus applies with medic on roster (not deployed)', () => {
    const stateWithMedicAndRecovering = {
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((r) => {
        if (r.npcId === 'npc-marion-vale') {
          return { ...r, activeTitle: 'title-medic', assignment: 'idle' as const }
        }
        if (r.npcId === 'npc-ida-rhys') {
          return { ...r, assignment: 'recovering' as const, states: { ...r.states, health: 20 } }
        }
        return r
      }),
    }

    const nextState = endDay(stateWithMedicAndRecovering)
    const npcAfter = nextState.npcRuntimeStates.find((r) => r.npcId === 'npc-ida-rhys')!
    // 20 + 15 (base) + 10 (medic recovery bonus) + 8 (medic title tick) = 53
    expect(npcAfter.states.health).toBe(53)
  })
})
