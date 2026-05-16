/** Roster synchronisation and activity-log writing after a combat round or encounter conclusion. */

import type { ActiveCombatState, GameState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'

export function syncRosterFromCombat(
  state: GameState,
  encounter: ActiveCombatState,
): GameState {
  const allyByNpcId = new Map(
    encounter.combatants
      .filter((combatant) => combatant.side === 'allies' && combatant.sourceNpcId)
      .map((combatant) => [combatant.sourceNpcId as string, combatant]),
  )

  return {
    ...state,
    roster: state.roster.map((npc) => {
      const combatant = allyByNpcId.get(npc.npcId)

      if (!combatant) {
        return npc
      }

      return {
        ...npc,
        states: {
          ...npc.states,
          health: Math.max(0, Math.min(100, combatant.health)),
          morale: combatant.morale,
          injury: Math.min(
            100,
            npc.states.injury + Math.max(0, npc.states.health - combatant.health),
          ),
        },
      }
    }),
  }
}

export function appendCombatActivityEntries(
  state: GameState,
  encounter: ActiveCombatState,
  previousLogLength: number,
): GameState {
  return encounter.log.slice(previousLogLength).reduce(
    (nextState, entry) => appendActivityLogEntry(nextState, 'combat', entry.summary),
    state,
  )
}
