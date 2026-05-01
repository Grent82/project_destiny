import type { GameState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'

/** Steps 2, 2b: hunger/fatigue/stress decay and health recovery for recovering NPCs. */
export function applyStateDecay(state: GameState): GameState {
  let next: GameState = {
    ...state,
    roster: state.roster.map((npc) => {
      const isResting = npc.assignment !== 'deployed'
      return {
        ...npc,
        states: {
          ...npc.states,
          hunger: Math.min(100, npc.states.hunger + 8),
          fatigue: isResting
            ? Math.max(0, npc.states.fatigue - 10)
            : Math.min(100, npc.states.fatigue + 5),
          stress: isResting
            ? Math.max(0, npc.states.stress - 3)
            : npc.states.stress,
        },
      }
    }),
  }

  // Step 2b: Recovering NPCs regain health each day
  const hasMedic = next.roster.some(
    (r) => r.activeTitle === 'title-medic' && r.assignment !== 'deployed',
  )
  const baseRecovery = 15
  const medicBonus = hasMedic ? 10 : 0

  for (const npc of next.roster.filter((r) => r.assignment === 'recovering')) {
    const newHealth = Math.min(100, npc.states.health + baseRecovery + medicBonus)
    const fullyRecovered = newHealth >= 80
    const npcDef = contentCatalog.npcsById.get(npc.npcId)
    const npcName = npcDef?.name ?? npc.npcId

    next = {
      ...next,
      roster: next.roster.map((r) =>
        r.npcId === npc.npcId
          ? {
              ...r,
              assignment: fullyRecovered ? ('idle' as const) : r.assignment,
              states: { ...r.states, health: newHealth },
            }
          : r,
      ),
    }

    if (fullyRecovered) {
      next = appendActivityLogEntry(next, 'system', `${npcName} is recovered. Back on roster.`)
    } else if (newHealth > npc.states.health) {
      next = appendActivityLogEntry(next, 'system', `${npcName} is recovering. Health improving.`)
    }
  }

  return next
}
