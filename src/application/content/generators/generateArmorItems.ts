/**
 * Armor Item Definition Generator
 *
 * Generates armor item definitions for all armor layers:
 * - light-torso: Vests, padded jackets, light breastplates
 * - light-legs: Padded greaves, leather bracers
 * - heavy-torso: Full breastplates, chainmail
 * - heavy-legs: Full greaves, plate leg armor
 * - shield: Various shield types
 *
 * Rarity distribution: common (50%), uncommon (35%), rare (15%)
 */

import type { ArmorDefinition } from '../../../domain/items/contracts'

export interface ArmorItemConfig {
  id: string
  name: string
  layer: 'light-torso' | 'light-legs' | 'heavy-torso' | 'heavy-legs' | 'shield'
  armorClass: 'light' | 'medium' | 'heavy'
  tier: number
  value: number
  weight: number
  rarity: 'common' | 'uncommon' | 'rare'
  description: string
  tags: string[]
  soak: number
  evasionPenalty: number
  speedPenalty: number
}

/**
 * Generates an armor item definition based on configuration.
 * Returns an ArmorDefinition object compatible with armor.json.
 */
export function generateArmorItem(config: ArmorItemConfig): ArmorDefinition {
  const shopPrice = Math.floor(config.value * 1.3) // 30% markup for shops

  return {
    id: config.id,
    name: config.name,
    category: 'armor' as const,
    armorClass: config.armorClass,
    tier: config.tier,
    value: config.value,
    shopPrice,
    weight: config.weight,
    rarity: config.rarity,
    tags: [config.layer, config.armorClass, ...config.tags],
    description: config.description,
    soak: config.soak,
    evasionPenalty: config.evasionPenalty,
    speedPenalty: config.speedPenalty,
    repairCost: Math.floor(config.value * 0.1),
    durabilityMax: config.tier * 30 + 30,
    resistances: {},
    typedEffects: [],
  }
}

/**
 * Generates a full set of armor items for all layers.
 * Distribution: common (50%), uncommon (35%), rare (15%)
 */
export function generateAllArmorItems(): ArmorDefinition[] {
  const items: ArmorDefinition[] = []

  // ─── LIGHT TORSO (6 items) ────────────────────────────────────────────────
  const lightTorsoItems: ArmorItemConfig[] = [
    {
      id: 'armor-light-padded-vest',
      name: 'Padded Cotton Vest',
      layer: 'light-torso',
      armorClass: 'light',
      tier: 1,
      value: 20,
      weight: 1.5,
      rarity: 'common',
      description: 'A simple quilted vest offering minimal protection without hindering movement.',
      tags: ['basic', 'worker-wear'],
      soak: 2,
      evasionPenalty: 2,
      speedPenalty: 1,
    },
    {
      id: 'armor-light-leather-jacket',
      name: 'Reinforced Leather Jacket',
      layer: 'light-torso',
      armorClass: 'light',
      tier: 1,
      value: 35,
      weight: 2.0,
      rarity: 'common',
      description: 'A thick leather jacket with stitching that can deflect glancing blows.',
      tags: ['traveler-wear', 'practical'],
      soak: 3,
      evasionPenalty: 3,
      speedPenalty: 1,
    },
    {
      id: 'armor-light-chain-shirt',
      name: 'Chainmail Shirt',
      layer: 'light-torso',
      armorClass: 'light',
      tier: 2,
      value: 80,
      weight: 3.5,
      rarity: 'uncommon',
      description: 'A lightweight chainmail shirt that provides decent protection while remaining mobile.',
      tags: ['combat', 'traveler-wear'],
      soak: 5,
      evasionPenalty: 4,
      speedPenalty: 2,
    },
    {
      id: 'armor-light-bronze-breastplate',
      name: 'Bronze Breastplate',
      layer: 'light-torso',
      armorClass: 'light',
      tier: 2,
      value: 100,
      weight: 3.0,
      rarity: 'uncommon',
      description: 'A polished bronze breastplate that deflects blows while allowing freedom of movement.',
      tags: ['combat', 'formal'],
      soak: 6,
      evasionPenalty: 4,
      speedPenalty: 2,
    },
    {
      id: 'armor-light-silk-armor',
      name: 'Woven Silk Armor',
      layer: 'light-torso',
      armorClass: 'light',
      tier: 3,
      value: 180,
      weight: 1.2,
      rarity: 'rare',
      description: 'Layers of tightly woven silk that can catch and slow blades, favored by assassins.',
      tags: ['stealth', 'combat'],
      soak: 7,
      evasionPenalty: 2,
      speedPenalty: 1,
    },
    {
      id: 'armor-light-ring-mail',
      name: 'Ring-Imbricated Vest',
      layer: 'light-torso',
      armorClass: 'light',
      tier: 2,
      value: 90,
      weight: 2.8,
      rarity: 'uncommon',
      description: 'Leather reinforced with thousands of small metal rings, flexible yet protective.',
      tags: ['combat', 'traditional'],
      soak: 5,
      evasionPenalty: 3,
      speedPenalty: 2,
    },
  ]

  // ─── LIGHT LEGS (4 items) ─────────────────────────────────────────────────
  const lightLegItems: ArmorItemConfig[] = [
    {
      id: 'armor-light-leather-greaves',
      name: 'Leather Greaves',
      layer: 'light-legs',
      armorClass: 'light',
      tier: 1,
      value: 25,
      weight: 1.5,
      rarity: 'common',
      description: 'Thick leather guards for the thighs and knees.',
      tags: ['traveler-wear', 'practical'],
      soak: 2,
      evasionPenalty: 2,
      speedPenalty: 1,
    },
    {
      id: 'armor-light-padded-bracers',
      name: 'Padded Leg Wraps',
      layer: 'light-legs',
      armorClass: 'light',
      tier: 1,
      value: 15,
      weight: 0.8,
      rarity: 'common',
      description: 'Tightly wrapped cloth pads protecting the shins from scrapes and minor impacts.',
      tags: ['basic', 'traveler-wear'],
      soak: 2,
      evasionPenalty: 1,
      speedPenalty: 1,
    },
    {
      id: 'armor-light-chain-legs',
      name: 'Chainmail Chausses',
      layer: 'light-legs',
      armorClass: 'light',
      tier: 2,
      value: 70,
      weight: 2.5,
      rarity: 'uncommon',
      description: 'Chainmail leggings that protect the legs without restricting movement.',
      tags: ['combat', 'traveler-wear'],
      soak: 4,
      evasionPenalty: 3,
      speedPenalty: 2,
    },
    {
      id: 'armor-light-scaled-greaves',
      name: 'Scaled Greaves',
      layer: 'light-legs',
      armorClass: 'light',
      tier: 2,
      value: 85,
      weight: 2.2,
      rarity: 'uncommon',
      description: 'Leather greaves with overlapping metal scales, providing good protection with minimal weight.',
      tags: ['combat', 'practical'],
      soak: 5,
      evasionPenalty: 3,
      speedPenalty: 2,
    },
  ]

  // ─── HEAVY TORSO (5 items) ────────────────────────────────────────────────
  const heavyTorsoItems: ArmorItemConfig[] = [
    {
      id: 'armor-heavy-plate-breastplate',
      name: 'Full Steel Breastplate',
      layer: 'heavy-torso',
      armorClass: 'heavy',
      tier: 3,
      value: 200,
      weight: 8.0,
      rarity: 'rare',
      description: 'A full steel breastplate that provides excellent protection for the torso.',
      tags: ['combat', 'plate'],
      soak: 10,
      evasionPenalty: 8,
      speedPenalty: 4,
    },
    {
      id: 'armor-heavy-chain-hauberk',
      name: 'Chainmail Hauberk',
      layer: 'heavy-torso',
      armorClass: 'heavy',
      tier: 2,
      value: 150,
      weight: 6.5,
      rarity: 'uncommon',
      description: 'A long chainmail shirt extending to the thighs, offering comprehensive protection.',
      tags: ['combat', 'traditional'],
      soak: 8,
      evasionPenalty: 6,
      speedPenalty: 3,
    },
    {
      id: 'armor-heavy-brigandine',
      name: 'Brigandine Coat',
      layer: 'heavy-torso',
      armorClass: 'heavy',
      tier: 2,
      value: 130,
      weight: 5.5,
      rarity: 'uncommon',
      description: 'A coat of canvas or leather with small steel plates riveted inside.',
      tags: ['combat', 'practical'],
      soak: 7,
      evasionPenalty: 5,
      speedPenalty: 3,
    },
    {
      id: 'armor-heavy-gold-embossed',
      name: 'Gold-Embossed Plate',
      layer: 'heavy-torso',
      armorClass: 'heavy',
      tier: 3,
      value: 400,
      weight: 8.5,
      rarity: 'rare',
      description: 'An ornate plate breastplate with gold embossing, suitable for both combat and ceremony.',
      tags: ['combat', 'noble-wear', 'ceremonial'],
      soak: 11,
      evasionPenalty: 8,
      speedPenalty: 4,
    },
    {
      id: 'armor-heavy-full-plate',
      name: "Knight's Full Plate",
      layer: 'heavy-torso',
      armorClass: 'heavy',
      tier: 3,
      value: 500,
      weight: 9.0,
      rarity: 'rare',
      description: 'A masterfully crafted full plate torso armor, the pinnacle of protective equipment.',
      tags: ['combat', 'elite', 'plate'],
      soak: 12,
      evasionPenalty: 9,
      speedPenalty: 5,
    },
  ]

  // ─── HEAVY LEGS (4 items) ─────────────────────────────────────────────────
  const heavyLegItems: ArmorItemConfig[] = [
    {
      id: 'armor-heavy-plate-greaves',
      name: 'Full Plate Greaves',
      layer: 'heavy-legs',
      armorClass: 'heavy',
      tier: 3,
      value: 180,
      weight: 5.0,
      rarity: 'rare',
      description: 'Complete plate leg armor protecting from thigh to ankle.',
      tags: ['combat', 'plate'],
      soak: 9,
      evasionPenalty: 7,
      speedPenalty: 4,
    },
    {
      id: 'armor-heavy-chain-leggings',
      name: 'Chainmail Leggings',
      layer: 'heavy-legs',
      armorClass: 'heavy',
      tier: 2,
      value: 120,
      weight: 4.0,
      rarity: 'uncommon',
      description: 'Full chainmail coverage for the legs, providing solid protection.',
      tags: ['combat', 'traditional'],
      soak: 7,
      evasionPenalty: 5,
      speedPenalty: 3,
    },
    {
      id: 'armor-heavy-plate-knee',
      name: 'Reinforced Plate Kneecaps',
      layer: 'heavy-legs',
      armorClass: 'heavy',
      tier: 2,
      value: 100,
      weight: 3.0,
      rarity: 'uncommon',
      description: 'Heavy plate guards focused on protecting the knees and upper shins.',
      tags: ['combat', 'practical'],
      soak: 6,
      evasionPenalty: 4,
      speedPenalty: 2,
    },
    {
      id: 'armor-heavy-gold-greaves',
      name: 'Aurum Greaves of the Pale',
      layer: 'heavy-legs',
      armorClass: 'heavy',
      tier: 3,
      value: 350,
      weight: 5.5,
      rarity: 'rare',
      description: 'Gold-plated greaves worn by noble knights, combining protection with prestige.',
      tags: ['combat', 'noble-wear', 'elite'],
      soak: 10,
      evasionPenalty: 7,
      speedPenalty: 4,
    },
  ]

  // ─── SHIELDS (5 items) ────────────────────────────────────────────────────
  const shieldItems: ArmorItemConfig[] = [
    {
      id: 'armor-shield-wood-round',
      name: 'Round Wooden Shield',
      layer: 'shield',
      armorClass: 'light',
      tier: 1,
      value: 25,
      weight: 2.0,
      rarity: 'common',
      description: 'A simple round shield of layered wood, adequate for basic defense.',
      tags: ['basic', 'wooden'],
      soak: 5,
      evasionPenalty: 5,
      speedPenalty: 2,
    },
    {
      id: 'armor-shield-wood-kite',
      name: 'Kite Shield',
      layer: 'shield',
      armorClass: 'medium',
      tier: 2,
      value: 60,
      weight: 4.0,
      rarity: 'uncommon',
      description: 'A tall kite shield that protects most of the body when standing.',
      tags: ['combat', 'wooden'],
      soak: 8,
      evasionPenalty: 8,
      speedPenalty: 4,
    },
    {
      id: 'armor-shield-steel-buckler',
      name: 'Steel Buckler',
      layer: 'shield',
      armorClass: 'light',
      tier: 2,
      value: 50,
      weight: 1.5,
      rarity: 'uncommon',
      description: 'A small steel shield held in one hand, ideal for deflecting rather than blocking.',
      tags: ['combat', 'steel', 'finesse'],
      soak: 6,
      evasionPenalty: 3,
      speedPenalty: 1,
    },
    {
      id: 'armor-shield-steel-tower',
      name: 'Tower Shield',
      layer: 'shield',
      armorClass: 'heavy',
      tier: 3,
      value: 200,
      weight: 8.0,
      rarity: 'rare',
      description: 'A massive shield that can block almost any attack but severely limits mobility.',
      tags: ['combat', 'steel', 'defensive'],
      soak: 15,
      evasionPenalty: 12,
      speedPenalty: 6,
    },
    {
      id: 'armor-shield-embossed',
      name: 'Heraldic Embossed Shield',
      layer: 'shield',
      armorClass: 'medium',
      tier: 3,
      value: 180,
      weight: 5.0,
      rarity: 'rare',
      description: 'A steel shield embossed with noble heraldry, combining protection with status.',
      tags: ['combat', 'noble-wear', 'ceremonial'],
      soak: 10,
      evasionPenalty: 6,
      speedPenalty: 3,
    },
  ]

  // Combine all items
  const allConfigs = [
    ...lightTorsoItems,
    ...lightLegItems,
    ...heavyTorsoItems,
    ...heavyLegItems,
    ...shieldItems,
  ]

  // Generate items from configs
  for (const config of allConfigs) {
    items.push(generateArmorItem(config))
  }

  return items
}

// Export for testing
export const ARMOR_LAYERS = ['light-torso', 'light-legs', 'heavy-torso', 'heavy-legs', 'shield'] as const
export type ArmorLayer = typeof ARMOR_LAYERS[number]
