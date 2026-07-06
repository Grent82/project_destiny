/** Action math, turn sequencing, and encounter state utilities for resolving a combat round. */

import type {
  ActiveCombatState,
  CombatAction,
  CombatRange,
  CombatantState,
} from '../../domain'
import { getArmorProfile, getWeaponProfile, UNARMED_PROFILE } from '../content/equipmentCatalog'
import { randomIndex } from './combatants'
import type { Rng } from './seededRng'

export function isAlive(combatant: CombatantState): boolean {
  return combatant.health > 0
}

export function getCombatantById(
  encounter: ActiveCombatState,
  combatantId: string | null,
): CombatantState | null {
  if (!combatantId) {
    return null
  }
  return encounter.combatants.find((combatant) => combatant.combatantId === combatantId) ?? null
}

export function getOpponents(
  encounter: ActiveCombatState,
  side: CombatantState['side'],
): CombatantState[] {
  return encounter.combatants.filter(
    (combatant) => combatant.side !== side && isAlive(combatant),
  )
}

export function getPreferredTarget(
  encounter: ActiveCombatState,
  actor: CombatantState,
  rng: Rng,
): CombatantState | null {
  const opponents = getOpponents(encounter, actor.side)

  if (opponents.length === 0) {
    return null
  }

  // Enemies use varied targeting strategies for unpredictability
  if (actor.side === 'enemies') {
    const roll = rng()
    // 35%: target lowest HP (focus fire)
    if (roll < 0.35) {
      return opponents.slice().sort((a, b) => a.health - b.health)[0] ?? null
    }
    // 25%: target lowest morale (exploit fear)
    if (roll < 0.6) {
      return opponents.slice().sort((a, b) => a.morale - b.morale)[0] ?? null
    }
    // 25%: target highest skill (neutralize the strongest)
    if (roll < 0.85) {
      return opponents.slice().sort((a, b) => b.skill - a.skill)[0] ?? null
    }
    // 15%: random target
    return opponents[randomIndex(opponents.length, rng)] ?? null
  }

  // Allies always focus lowest HP (maximize KO chance)
  return opponents.slice().sort((left, right) => left.health - right.health)[0] ?? null
}

export function updateCombatant(
  encounter: ActiveCombatState,
  combatantId: string,
  updater: (combatant: CombatantState) => CombatantState,
): ActiveCombatState {
  return {
    ...encounter,
    combatants: encounter.combatants.map((combatant) =>
      combatant.combatantId === combatantId ? updater(combatant) : combatant,
    ),
  }
}

export function appendLog(
  encounter: ActiveCombatState,
  actorId: string,
  summary: string,
): ActiveCombatState {
  return {
    ...encounter,
    log: [
      ...encounter.log,
      {
        round: encounter.round,
        actorId,
        summary,
      },
    ],
  }
}

export function clearGuardingForCombatant(
  encounter: ActiveCombatState,
  combatantId: string,
): ActiveCombatState {
  return {
    ...encounter,
    combatants: encounter.combatants.map((combatant) =>
      combatant.combatantId === combatantId ? { ...combatant, guarding: false } : combatant,
    ),
  }
}

export function evaluateOutcome(encounter: ActiveCombatState): ActiveCombatState {
  const alliesAlive = encounter.combatants.some(
    (combatant) => combatant.side === 'allies' && isAlive(combatant),
  )
  const enemiesAlive = encounter.combatants.some(
    (combatant) => combatant.side === 'enemies' && isAlive(combatant),
  )

  if (!alliesAlive) {
    return {
      ...encounter,
      outcome: 'defeat',
      activeCombatantId: null,
    }
  }

  if (!enemiesAlive) {
    return {
      ...encounter,
      outcome: 'victory',
      activeCombatantId: null,
    }
  }

  return encounter
}

export function getRangeModifier(weaponId: string | null, range: CombatRange): number {
  const weapon = getWeaponProfile(weaponId)
  if (range === 'close') return weapon.rangeModifierClose
  if (range === 'medium') return weapon.rangeModifierMedium
  return weapon.rangeModifierDistant
}

function buildHitMessage(actorName: string, targetName: string, rng: Rng): string {
  const phrases = ['strikes', 'lands a blow on', 'connects with']
  return `${actorName} ${phrases[randomIndex(phrases.length, rng)]} ${targetName}`
}

function buildMissMessage(actorName: string, targetName: string, rng: Rng): string {
  const phrases = ['misses', 'goes wide of', 'is deflected by']
  return `${actorName} ${phrases[randomIndex(phrases.length, rng)]} ${targetName}`
}

/**
 * Hit chance for `actor` attacking `target` at the given range — the exact formula `attack()`
 * rolls against. Exposed so the UI can preview accuracy before the player commits to an action,
 * without duplicating (and risking drift from) the resolution math.
 */
export function computeAttackAccuracy(
  actor: CombatantState,
  target: CombatantState,
  range: CombatRange,
): number {
  const weapon = getWeaponProfile(actor.equippedWeaponId)
  const armor = getArmorProfile(target.equippedArmorId)
  const rangeOffset = getRangeModifier(actor.equippedWeaponId, range)
  const weaponAccuracyModifier = weapon.accuracy - UNARMED_PROFILE.accuracy
  return Math.min(
    99,
    Math.max(1, actor.accuracy + weaponAccuracyModifier + rangeOffset - armor.evasionPenalty),
  )
}

/**
 * Post-mitigation damage bounds (min/max, pre-crit) for `actor` hitting `target` — the same
 * effectiveDamageMin/Max/soak/guard math `attack()` uses to roll actual damage. Exposed for
 * UI preview for the same reason as computeAttackAccuracy above.
 */
export function computeAttackDamageRange(
  actor: CombatantState,
  target: CombatantState,
): { min: number; max: number } {
  const weapon = getWeaponProfile(actor.equippedWeaponId)
  const armor = getArmorProfile(target.equippedArmorId)
  const effectiveDamageMin = Math.max(
    1,
    actor.damageMin + (weapon.damageMin - UNARMED_PROFILE.damageMin),
  )
  const effectiveDamageMax = Math.max(
    effectiveDamageMin,
    actor.damageMax + (weapon.damageMax - UNARMED_PROFILE.damageMax),
  )
  const effectiveSoak = Math.max(0, armor.soak - weapon.armorPiercing)
  const guardMitigation = target.guarding ? 0.7 : 1
  return {
    min: Math.max(0, Math.round((effectiveDamageMin - effectiveSoak) * guardMitigation)),
    max: Math.max(0, Math.round((effectiveDamageMax - effectiveSoak) * guardMitigation)),
  }
}

export function attack(encounter: ActiveCombatState, actorId: string, rng: Rng): ActiveCombatState {
  const actor = getCombatantById(encounter, actorId)

  if (!actor || !isAlive(actor)) {
    return encounter
  }

  const target = getPreferredTarget(encounter, actor, rng)

  if (!target) {
    return encounter
  }

  const weapon = getWeaponProfile(actor.equippedWeaponId)
  const armor = getArmorProfile(target.equippedArmorId)
  const rangeOffset = getRangeModifier(actor.equippedWeaponId, encounter.range)
  const weaponAccuracyModifier = weapon.accuracy - UNARMED_PROFILE.accuracy
  const effectiveAccuracy = Math.min(
    99,
    Math.max(1, actor.accuracy + weaponAccuracyModifier + rangeOffset - armor.evasionPenalty),
  )

  const hit = rng() * 100 < effectiveAccuracy

  if (!hit) {
    return appendLog(encounter, actorId, `${buildMissMessage(actor.name, target.name, rng)}.`)
  }

  const effectiveDamageMin = Math.max(
    1,
    actor.damageMin + (weapon.damageMin - UNARMED_PROFILE.damageMin),
  )
  const effectiveDamageMax = Math.max(
    effectiveDamageMin,
    actor.damageMax + (weapon.damageMax - UNARMED_PROFILE.damageMax),
  )
  const rawDamage = Math.round(
    effectiveDamageMin + rng() * (effectiveDamageMax - effectiveDamageMin),
  )
  const effectiveSoak = Math.max(0, armor.soak - weapon.armorPiercing)
  const guardMitigation = target.guarding ? 0.7 : 1
  let damage = Math.max(0, Math.round((rawDamage - effectiveSoak) * guardMitigation))

  const isCrit = rng() * 100 < weapon.critChance
  if (isCrit) damage = damage * 2

  const isStagger = rng() * 100 < weapon.staggerChance

  const parts: string[] = [buildHitMessage(actor.name, target.name, rng)]
  parts.push(
    effectiveSoak > 0
      ? `${damage} damage (${effectiveSoak} soaked by armor)`
      : `${damage} damage`,
  )
  if (isCrit) parts.push('A telling blow!')
  if (isStagger) parts.push(`${target.name} is knocked off-balance`)

  const nextEncounter = updateCombatant(encounter, target.combatantId, (combatant) => ({
    ...combatant,
    health: Math.max(0, combatant.health - damage),
    morale: Math.max(0, combatant.morale - 6),
    guarding: false,
    staggered: isStagger,
  }))

  return appendLog(nextEncounter, actorId, `${parts.join(' — ')}.`)
}

export function advance(encounter: ActiveCombatState, actorId: string): ActiveCombatState {
  if (encounter.range === 'close') {
    return appendLog(encounter, actorId, 'The squad is already in close range.')
  }

  const nextRange: CombatRange = encounter.range === 'distant' ? 'medium' : 'close'
  const message =
    nextRange === 'medium'
      ? 'The squad presses forward to medium range.'
      : 'The squad closes to fighting distance.'

  return appendLog({ ...encounter, range: nextRange }, actorId, message)
}

export function retreat(encounter: ActiveCombatState, actorId: string): ActiveCombatState {
  if (encounter.range === 'distant') {
    return appendLog(encounter, actorId, 'The squad is already fighting at distance.')
  }

  const nextRange: CombatRange = encounter.range === 'close' ? 'medium' : 'distant'
  const message =
    nextRange === 'medium'
      ? 'The squad pulls back to medium range.'
      : 'The squad disengages and reopens distance.'

  return appendLog({ ...encounter, range: nextRange }, actorId, message)
}

export function guard(encounter: ActiveCombatState, actorId: string): ActiveCombatState {
  return appendLog(
    updateCombatant(encounter, actorId, (combatant) => ({
      ...combatant,
      guarding: true,
      guardCooldown: true,
      morale: Math.max(0, combatant.morale - 3),
    })),
    actorId,
    'The combatant braces, trading momentum for protection.',
  )
}

export function applyAction(
  encounter: ActiveCombatState,
  actorId: string,
  action: CombatAction,
  rng: Rng,
): ActiveCombatState {
  switch (action) {
    case 'attack':
      return attack(encounter, actorId, rng)
    case 'advance':
      return advance(encounter, actorId)
    case 'retreat':
      return retreat(encounter, actorId)
    case 'guard':
      return guard(encounter, actorId)
  }
}

export function getInitiativeOrder(encounter: ActiveCombatState): string[] {
  return encounter.combatants
    .filter(isAlive)
    .slice()
    .sort((left, right) => right.speed - left.speed || right.skill - left.skill)
    .map((combatant) => combatant.combatantId)
}

export function findNextActiveCombatant(
  encounter: ActiveCombatState,
  currentCombatantId: string | null,
): { activeCombatantId: string | null; round: number } {
  const initiative = getInitiativeOrder(encounter)

  if (initiative.length === 0) {
    return { activeCombatantId: null, round: encounter.round }
  }

  if (!currentCombatantId) {
    return {
      activeCombatantId: initiative[0] ?? null,
      round: encounter.round,
    }
  }

  const currentIndex = initiative.indexOf(currentCombatantId)

  if (currentIndex === -1 || currentIndex === initiative.length - 1) {
    return {
      activeCombatantId: initiative[0] ?? null,
      round: encounter.round + 1,
    }
  }

  return {
    activeCombatantId: initiative[currentIndex + 1] ?? null,
    round: encounter.round,
  }
}

export function advanceTurn(encounter: ActiveCombatState): ActiveCombatState {
  const nextTurn = findNextActiveCombatant(encounter, encounter.activeCombatantId)
  const roundChanged = nextTurn.round > encounter.round

  return {
    ...encounter,
    activeCombatantId: nextTurn.activeCombatantId,
    round: nextTurn.round,
    combatants: roundChanged
      ? encounter.combatants.map((c) => ({ ...c, guardCooldown: false }))
      : encounter.combatants,
  }
}
