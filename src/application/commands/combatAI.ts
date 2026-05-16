/** Enemy AI turn resolution — decides and executes enemy actions until an ally becomes active. */

import type { ActiveCombatState, CombatAction } from '../../domain'
import type { Rng } from './seededRng'
import {
  advanceTurn,
  applyAction,
  appendLog,
  clearGuardingForCombatant,
  evaluateOutcome,
  getCombatantById,
  updateCombatant,
} from './combatResolution'

export function resolveEnemyTurns(encounter: ActiveCombatState, rng: Rng): ActiveCombatState {
  let nextEncounter = encounter

  while (nextEncounter.outcome === 'ongoing') {
    const activeCombatant = getCombatantById(nextEncounter, nextEncounter.activeCombatantId)

    if (!activeCombatant || activeCombatant.side === 'allies') {
      break
    }

    // Stagger: skip this enemy's turn and clear the flag
    if (activeCombatant.staggered) {
      nextEncounter = updateCombatant(nextEncounter, activeCombatant.combatantId, (c) => ({
        ...c,
        staggered: false,
      }))
      nextEncounter = appendLog(
        nextEncounter,
        activeCombatant.combatantId,
        `${activeCombatant.name} is still reeling — their action is lost.`,
      )
      nextEncounter = advanceTurn(nextEncounter)
      continue
    }

    const chosenAction: CombatAction = (() => {
      // At distance, melee enemies advance
      if (nextEncounter.range === 'distant' && activeCombatant.effectiveRange === 'close') {
        return 'advance'
      }
      // Low health + not on cooldown: chance to guard (defensive AI)
      if (activeCombatant.health < 30 && !activeCombatant.guardCooldown && rng() < 0.5) {
        return 'guard'
      }
      // Ranged enemies at close range: retreat to get effective range
      if (
        nextEncounter.range === 'close' &&
        activeCombatant.effectiveRange === 'distant' &&
        rng() < 0.4
      ) {
        return 'retreat'
      }
      return 'attack'
    })()

    nextEncounter = clearGuardingForCombatant(nextEncounter, activeCombatant.combatantId)
    nextEncounter = applyAction(nextEncounter, activeCombatant.combatantId, chosenAction, rng)
    nextEncounter = evaluateOutcome(nextEncounter)

    if (nextEncounter.outcome !== 'ongoing') {
      break
    }

    nextEncounter = advanceTurn(nextEncounter)
  }

  return nextEncounter
}
