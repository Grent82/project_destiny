import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { appendActivityLogEntry } from './activityLog'
import { hasResidentQuarters } from './recovery'
import { findNpcInventoryItemByTag, consumeNpcInventoryItem, resolveItemStatEffect } from './npcInventoryHelpers'

/**
 * NPC Survival Actions (destiny-rjwy)
 *
 * Real implementations for the 5 basic-needs intention types (eat-meal, drink, sleep, rest,
 * groom) plus meditate. These are the NPC's own agency for addressing needs that
 * applyStateDecay.ts otherwise only accumulates passively (hunger/fatigue/hygiene rise on their
 * own each day; these commands are how an NPC actively brings them back down).
 */

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function updateNpcStates(
  state: GameState,
  npcId: string,
  updates: Partial<NpcRuntimeState['states']>,
): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) => (n.npcId === npcId ? { ...n, states: { ...n.states, ...updates } } : n)),
  }
}

// findNpcInventoryItemByTag / consumeNpcInventoryItem / resolveItemStatEffect extracted to
// npcInventoryHelpers.ts (destiny-bkln) for reuse by economy commands (repair/craft/consume/loot).
// resolveItemStatEffect also fixes a gap the old local statModValue had: it only matched the
// 'stat_mod' ItemEffect variant, so real catalog items using 'reduceStat' (e.g.
// item-ration-compact-brick) were never actually read — callers always fell back to the hardcoded
// default below instead of the item's real defined magnitude.

/** NPC eats to reduce hunger — prefers a personal food item, falls back to house food stock. */
export function npcEatMeal(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const found = findNpcInventoryItemByTag(state, npcId, 'food')
  if (found) {
    const reduction = resolveItemStatEffect(found.itemDef, 'hunger') ?? 30
    let next = consumeNpcInventoryItem(state, npcId, found)
    next = updateNpcStates(next, npcId, { hunger: clampPercent(npc.states.hunger - reduction) })
    return appendActivityLogEntry(next, 'system', `${npc.name} eats ${found.itemDef.name}, easing their hunger.`)
  }

  if (state.cityResources.foodStock >= 1) {
    let next: GameState = {
      ...state,
      cityResources: { ...state.cityResources, foodStock: state.cityResources.foodStock - 1 },
    }
    next = updateNpcStates(next, npcId, { hunger: clampPercent(npc.states.hunger - 20) })
    return appendActivityLogEntry(next, 'system', `${npc.name} eats from the house stores.`)
  }

  const next = updateNpcStates(state, npcId, { hunger: clampPercent(npc.states.hunger - 5) })
  return appendActivityLogEntry(next, 'system', `${npc.name} finds only scraps to eat.`)
}

/** NPC drinks — sobers up and eases hunger slightly. Guards against drinking while already very intoxicated. */
export function npcDrink(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  if (npc.states.intoxication > 70) {
    const next = updateNpcStates(state, npcId, { intoxication: clampPercent(npc.states.intoxication - 5) })
    return appendActivityLogEntry(next, 'system', `${npc.name} is too far gone to drink more and staggers off to sleep it off.`)
  }

  const found = findNpcInventoryItemByTag(state, npcId, 'drink')
  if (found) {
    const hungerReduction = resolveItemStatEffect(found.itemDef, 'hunger') ?? 10
    const intoxReduction = resolveItemStatEffect(found.itemDef, 'intoxication') ?? 20
    let next = consumeNpcInventoryItem(state, npcId, found)
    next = updateNpcStates(next, npcId, {
      hunger: clampPercent(npc.states.hunger - hungerReduction),
      intoxication: clampPercent(npc.states.intoxication - intoxReduction),
    })
    return appendActivityLogEntry(next, 'system', `${npc.name} drinks ${found.itemDef.name}.`)
  }

  const waterScarcity = (state.cityResources?.waterAccess ?? 100) < 30
  if (!waterScarcity) {
    const next = updateNpcStates(state, npcId, {
      hunger: clampPercent(npc.states.hunger - 5),
      intoxication: clampPercent(npc.states.intoxication - 10),
    })
    return appendActivityLogEntry(next, 'system', `${npc.name} drinks from the house cistern.`)
  }

  return appendActivityLogEntry(state, 'system', `${npc.name} finds nothing to drink; water access is scarce.`)
}

/** NPC sleeps to significantly reduce fatigue. Quarters (intact, assigned room) improve the effect. */
export function npcSleep(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const hasQuarters = hasResidentQuarters(state, npc.roomAssignment)
  const reduction = hasQuarters ? 40 : 15
  // Per the canonical recovery contract (destiny-i8nc): normal sleep also lowers stress and gives
  // modest health recovery — but does not treat injury (that's treatment's job, see
  // npcCareForInjured).
  const next = updateNpcStates(state, npcId, {
    fatigue: clampPercent(npc.states.fatigue - reduction),
    stress: clampPercent(npc.states.stress - (hasQuarters ? 15 : 6)),
    health: clampPercent(npc.states.health + (hasQuarters ? 5 : 2)),
  })
  const message = hasQuarters
    ? `${npc.name} sleeps soundly in their quarters.`
    : `${npc.name} sleeps rough, without proper quarters.`
  return appendActivityLogEntry(next, 'system', message)
}

/** NPC rests briefly for lighter active recovery — smaller effect than sleep, works anywhere. */
export function npcRest(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const hasQuarters = hasResidentQuarters(state, npc.roomAssignment)
  const reduction = hasQuarters ? 20 : 12
  // Per the canonical recovery contract (destiny-i8nc): brief rest also gives light stress
  // relief, but no health recovery and no injury treatment (unlike full sleep).
  const next = updateNpcStates(state, npcId, {
    fatigue: clampPercent(npc.states.fatigue - reduction),
    stress: clampPercent(npc.states.stress - (hasQuarters ? 8 : 4)),
  })
  return appendActivityLogEntry(next, 'system', `${npc.name} takes a moment to rest.`)
}

/**
 * NPC grooms to improve hygiene (reduce accumulated grime — see applyStateDecay.ts's
 * HYGIENE_PENALTY_THRESHOLD, where a high value is the bad direction). Prefers a personal
 * grooming item, falls back to washing with house water.
 */
export function npcGroom(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const found = findNpcInventoryItemByTag(state, npcId, 'grooming')
  if (found) {
    const reduction = resolveItemStatEffect(found.itemDef, 'hygiene') ?? 30
    let next = consumeNpcInventoryItem(state, npcId, found)
    next = updateNpcStates(next, npcId, { hygiene: clampPercent(npc.states.hygiene - reduction) })
    return appendActivityLogEntry(next, 'system', `${npc.name} grooms with ${found.itemDef.name}.`)
  }

  const waterScarcity = (state.cityResources?.waterAccess ?? 100) < 30
  const reduction = waterScarcity ? 5 : 15
  const next = updateNpcStates(state, npcId, { hygiene: clampPercent(npc.states.hygiene - reduction) })
  return appendActivityLogEntry(next, 'system', `${npc.name} washes up as best they can.`)
}

/**
 * NPC meditates to reduce stress. Skill-based (intellect/prudence scale the effect). Skipped
 * during active player combat or in a district under high tension (destiny-rjwy's "not during
 * combat/alarm" guard).
 */
export function npcMeditate(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  if (state.playerCharacter.combatState) return state

  const tension = npc.assignedDistrictId ? (state.districtTension[npc.assignedDistrictId] ?? 0) : 0
  if (tension > 80) return state

  const skillBonus = Math.round((npc.attributes.intellect - 50) / 5 + (npc.traits.prudence - 50) / 5)
  const reduction = Math.max(5, 15 + skillBonus)
  const next = updateNpcStates(state, npcId, { stress: clampPercent(npc.states.stress - reduction) })
  return appendActivityLogEntry(next, 'system', `${npc.name} meditates to clear their mind.`)
}
