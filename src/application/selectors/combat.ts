import { createSelector } from '@reduxjs/toolkit'

import type { CombatantState } from '../../domain'
import type { RootState } from '../store/gameStore'

function toCombatantSummary(combatant: CombatantState) {
  return {
    combatantId: combatant.combatantId,
    name: combatant.name,
    side: combatant.side,
    health: combatant.health,
    maxHealth: combatant.maxHealth,
    morale: combatant.morale,
    guarding: combatant.guarding,
    effectiveRange: combatant.effectiveRange,
    damageLabel: `${combatant.damageMin}-${combatant.damageMax}`,
    defeated: combatant.health === 0,
    lore: combatant.lore,
  }
}

const selectActiveCombat = (state: RootState) => state.game.activeCombat

export const selectCombatScreenState = createSelector(
  [selectActiveCombat],
  (activeCombat) => {
    if (!activeCombat) {
      return {
        hasActiveCombat: false,
        canAct: false,
        outcome: null,
        range: null,
        round: null,
        activeCombatantName: null,
        allies: [],
        enemies: [],
        log: [],
      }
    }

    const activeCombatant =
      activeCombat.combatants.find(
        (combatant) => combatant.combatantId === activeCombat.activeCombatantId,
      ) ?? null

    return {
      hasActiveCombat: true,
      canAct:
        activeCombat.outcome === 'ongoing' && activeCombatant?.side === 'allies',
      outcome: activeCombat.outcome,
      range: activeCombat.range,
      round: activeCombat.round,
      activeCombatantName: activeCombatant?.name ?? null,
      allies: activeCombat.combatants
        .filter((combatant) => combatant.side === 'allies')
        .map(toCombatantSummary),
      enemies: activeCombat.combatants
        .filter((combatant) => combatant.side === 'enemies')
        .map(toCombatantSummary),
      log: activeCombat.log.slice(-6).reverse(),
    }
  },
)
