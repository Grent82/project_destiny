/** Builds typed combatant objects for the player, allies, and enemies at encounter start. */

import type {
  CombatRange,
  CombatantState,
  GameState,
  NpcRuntimeState,
} from '../../domain'
import {
  getFatigueAccuracyPenalty,
  getHungerCombatPenalty,
} from '../../domain/npcStateModifiers'
import { buildRelationshipKey, type RelationshipAxes } from '../../domain/relationships/contracts'
import { contentCatalog, type EncounterEntry } from '../content/contentCatalog'
import { getDurabilityAccuracyModifier, getDurabilityArmorModifier } from './durability'
import { hasNpcClothing } from '../../domain/npc/isNpcNaked'

export const FALLBACK_ENCOUNTER_POOL: EncounterEntry[] = [
  { name: 'Ash Raider', lore: 'A hard-eyed opportunist with nothing left to lose.' },
  { name: 'Bog Skirmisher', lore: 'Knows the terrain. Uses it.' },
  { name: 'Ruin Poacher', lore: "Picks through the city's wounds for whatever bleeds." },
  { name: 'Fen Cutthroat', lore: 'Has done this before. Will do it again.' },
]

export const PLAYER_DEFAULT_WEAPON_ID = 'weapon-dagger-wasterunner'
export const PLAYER_MAX_HEALTH = 80

export function randomIndex(length: number, rng: () => number): number {
  return Math.floor(rng() * length)
}

export function buildPlayerCombatant(playerCharacter: GameState['playerCharacter']): CombatantState {
  const { attributes, skills } = playerCharacter
  const combatState = playerCharacter.combatState
  return {
    combatantId: 'player',
    sourceNpcId: null,
    name: playerCharacter.name || 'The Heir',
    side: 'allies',
    maxHealth: PLAYER_MAX_HEALTH,
    health: Math.max(0, Math.min(PLAYER_MAX_HEALTH, combatState?.health ?? PLAYER_MAX_HEALTH)),
    morale: Math.max(
      30,
      Math.min(
        100,
        combatState?.morale ?? Math.round(attributes.resolve * 0.7 + attributes.presence * 0.3),
      ),
    ),
    skill: Math.min(85, Math.max(skills.melee, skills.ranged)),
    accuracy: Math.min(90, 50 + Math.floor(attributes.perception * 0.4)),
    damageMin: Math.max(5, Math.floor(attributes.might / 8) + 5),
    damageMax: Math.max(8, Math.floor(attributes.might / 5) + 6),
    effectiveRange: skills.ranged > skills.melee ? 'distant' : 'close',
    soak: 3,
    speed: 4,
    guarding: false,
    staggered: false,
    guardCooldown: false,
    equippedWeaponId: PLAYER_DEFAULT_WEAPON_ID,
    equippedArmorId: null,
  }
}

/**
 * Compute hit chance bonus/penalty from relationships.
 * Called when building ally combatants.
 * Returns a modifier in range [-0.15, +0.15].
 */
export function getRelationshipCombatModifier(
  npcId: string,
  relationships: Record<string, RelationshipAxes>,
): number {
  const key = buildRelationshipKey('player', npcId)
  const rel = relationships[key]
  if (!rel) return 0

  const loyaltyBonus = (rel.loyalty - 50) / 1000 // ±0.05 max
  const trustBonus = (rel.trust - 50) / 1000 // ±0.05 max
  const fearPenalty = rel.fear > 70 ? -(rel.fear - 70) / 1000 : 0 // up to -0.03

  return Math.max(-0.15, Math.min(0.15, loyaltyBonus + trustBonus + fearPenalty))
}

export function buildAllyCombatant(
  npc: NpcRuntimeState,
  equippedItemDurabilities: GameState['equippedItemDurabilities'],
  relationships: Record<string, RelationshipAxes> = {},
): CombatantState {
  const definition = contentCatalog.npcsById.get(npc.npcId)
  const skill = Math.max(npc.skills.melee, npc.skills.ranged)
  const effectiveRange: CombatRange = npc.skills.ranged > npc.skills.melee ? 'distant' : 'close'

  const snap = { hunger: npc.states.hunger, fatigue: npc.states.fatigue }
  const statePenalty = getHungerCombatPenalty(snap) + getFatigueAccuracyPenalty(snap)
  const baseAccuracy = Math.min(95, skill + Math.floor(npc.attributes.perception / 3))

  const weaponDurability = equippedItemDurabilities[npc.npcId]?.['weapon'] ?? 100
  const weaponDurMod = getDurabilityAccuracyModifier(weaponDurability)
  const armorDurability = equippedItemDurabilities[npc.npcId]?.['armor'] ?? 100
  const armorDurMod = getDurabilityArmorModifier(armorDurability)

  const relModifier = getRelationshipCombatModifier(npc.npcId, relationships)
  const skillAccuracy = Math.max(
    1,
    Math.floor(Math.max(1, baseAccuracy + statePenalty) * weaponDurMod),
  )
  const hitChance = Math.max(0.05, Math.min(0.95, skillAccuracy / 100 + relModifier))

  return {
    combatantId: `ally-${npc.npcId}`,
    sourceNpcId: npc.npcId,
    name: definition?.name ?? npc.npcId,
    side: 'allies',
    maxHealth: Math.max(1, npc.states.health),
    health: Math.max(0, npc.states.health),
    morale: npc.states.morale,
    skill,
    accuracy: Math.max(0, Math.min(100, Math.round(hitChance * 100))),
    damageMin: Math.max(8, Math.floor((npc.attributes.might + skill) / 12)),
    damageMax: Math.max(12, Math.floor((npc.attributes.might + skill) / 9)),
    effectiveRange,
    // NPCs without clothing receive no armor protection, even if armor is equipped
    soak: hasNpcClothing(npc) ? Math.floor(Math.floor(npc.attributes.endurance / 4) * armorDurMod) : 0,
    speed: Math.max(1, Math.floor((npc.attributes.agility + npc.attributes.resolve) / 18)),
    guarding: false,
    staggered: false,
    guardCooldown: false,
    equippedWeaponId: npc.loadout.primaryWeaponId,
    equippedArmorId: npc.loadout.armorId,
  }
}

/** Stat multipliers applied per district danger tier (1-5). */
const DANGER_TIER_MODIFIERS = [
  { healthMult: 1.0, accuracyBonus: 0, damageMod: 0 }, // tier 1
  { healthMult: 1.1, accuracyBonus: 3, damageMod: 1 }, // tier 2
  { healthMult: 1.25, accuracyBonus: 6, damageMod: 2 }, // tier 3
  { healthMult: 1.4, accuracyBonus: 10, damageMod: 4 }, // tier 4
  { healthMult: 1.6, accuracyBonus: 15, damageMod: 6 }, // tier 5
] as const

export function getEnemyDangerModifiers(dangerLevel: number) {
  const idx = Math.max(0, Math.min(4, (dangerLevel ?? 1) - 1))
  return DANGER_TIER_MODIFIERS[idx]!
}

export function buildEnemyCombatant(
  index: number,
  allies: CombatantState[],
  dangerLevel = 1,
  entry?: EncounterEntry,
): CombatantState {
  const allyAverageSkill = Math.max(
    35,
    Math.floor(
      allies.reduce((total, ally) => total + ally.skill, 0) / Math.max(allies.length, 1),
    ) - 4,
  )
  const allyAverageHealth = Math.max(
    38,
    Math.floor(
      allies.reduce((total, ally) => total + ally.maxHealth, 0) / Math.max(allies.length, 1),
    ) - 6,
  )

  const tier = getEnemyDangerModifiers(dangerLevel)
  const scaledHealth = Math.round(allyAverageHealth * tier.healthMult)

  return {
    combatantId: `enemy-${index + 1}`,
    sourceNpcId: null,
    name: entry?.name ?? FALLBACK_ENCOUNTER_POOL[index % FALLBACK_ENCOUNTER_POOL.length]!.name,
    lore: entry?.lore,
    side: 'enemies',
    maxHealth: scaledHealth,
    health: scaledHealth,
    morale: 58,
    skill: allyAverageSkill,
    accuracy: Math.min(90, allyAverageSkill + 12 + tier.accuracyBonus),
    damageMin: Math.max(7, Math.floor(allyAverageSkill / 7) + tier.damageMod),
    damageMax: Math.max(11, Math.floor(allyAverageSkill / 5) + tier.damageMod),
    effectiveRange: index % 2 === 0 ? 'close' : 'distant',
    soak: 10 + index * 2,
    speed: 4 + (index % 2),
    guarding: false,
    staggered: false,
    guardCooldown: false,
    equippedWeaponId: null,
    equippedArmorId: null,
  }
}
