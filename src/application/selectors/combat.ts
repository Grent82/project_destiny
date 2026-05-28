import { createSelector } from '@reduxjs/toolkit'

import type { CombatantState } from '../../domain'
import type { RootState } from '../store/gameStore'
import { formatMarks } from '../../domain/game/currency'

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

function buildResolutionSummary(activeCombat: NonNullable<RootState['game']['activeCombat']>) {
  if (activeCombat.outcome === 'ongoing') return null

  const allies = activeCombat.combatants.filter((combatant) => combatant.side === 'allies')
  const defeatedEnemies = activeCombat.combatants.filter(
    (combatant) => combatant.side === 'enemies' && combatant.health <= 0,
  )
  const lootMarks =
    activeCombat.outcome === 'victory'
      ? defeatedEnemies.reduce(
          (sum, combatant) => sum + Math.max(5, Math.floor(combatant.maxHealth / 5)),
          0,
        )
      : 0

  const knockedOutAllies = allies.filter((combatant) => combatant.health <= 0).length
  const woundedAllies = allies.filter(
    (combatant) => combatant.health > 0 && combatant.health < combatant.maxHealth,
  ).length
  const hasLinkedContract = Boolean(activeCombat.linkedQuestId)
  const returnRoute = hasLinkedContract ? '/contracts' : '/dashboard'
  const returnLabel = hasLinkedContract ? 'Work Board' : 'Dashboard'

  return {
    title: activeCombat.outcome === 'victory' ? 'Victory' : 'Defeat',
    returnRoute,
    returnLabel,
    actionLabel: `Conclude and Return to ${returnLabel}`,
    rewardsLabel:
      activeCombat.outcome === 'victory'
        ? lootMarks > 0
          ? `Rewards secured: +${formatMarks(lootMarks)}`
          : 'Rewards secured: no coin or valuables recovered.'
        : 'Rewards secured: none — the squad withdrew empty-handed.',
    partyConditionLabel:
      knockedOutAllies > 0
        ? `Party condition: ${knockedOutAllies} ally${knockedOutAllies !== 1 ? 'ies' : ''} knocked out${woundedAllies > 0 ? `, ${woundedAllies} wounded.` : '.'}`
        : woundedAllies > 0
          ? `Party condition: ${woundedAllies} ally${woundedAllies !== 1 ? 'ies' : ''} wounded, all still standing.`
          : 'Party condition: all deployed allies remain standing.',
    contractLabel: hasLinkedContract
      ? activeCombat.outcome === 'victory'
        ? 'Contract consequence: the Work Board will register this contract as settled.'
        : 'Contract consequence: the Work Board will carry the aftermath of this defeat.'
      : 'Contract: none — this was a free clash.',
  }
}

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
        resolutionSummary: null,
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
      resolutionSummary: buildResolutionSummary(activeCombat),
    }
  },
)

export const selectLastEncounterSummary = (state: RootState) => state.game.lastEncounterSummary
