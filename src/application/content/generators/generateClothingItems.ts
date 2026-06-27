/**
 * Clothing Item Definition Generator
 *
 * Generates clothing item definitions for all clothing layers:
 * - head: Hats, caps, headscarves
 * - torso: Shirts, vests, coats
 * - arms: Gloves, bracers
 * - legs: Trousers, skirts
 * - feet: Boots, shoes, sandals
 * - full: Robes, jumpsuits, full-body garments
 * - undergarments: Underclothes, linens
 *
 * Rarity distribution: common (60%), uncommon (30%), rare (10%)
 */

import type { ItemDefinition } from '../../../domain/items/contracts'

export interface ClothingItemConfig {
  id: string
  name: string
  layer: 'head' | 'torso' | 'arms' | 'legs' | 'feet' | 'full' | 'undergarments'
  tier: number
  value: number
  weight: number
  rarity: 'common' | 'uncommon' | 'rare'
  description: string
  tags: string[]
}

/**
 * Generates clothing item definitions based on configuration.
 * Returns an array of ItemDefinition objects compatible with items.json.
 */
export function generateClothingItem(config: ClothingItemConfig): ItemDefinition {
  const baseValue = config.value
  const shopPrice = Math.floor(baseValue * 1.2) // 20% markup for shops

  return {
    id: config.id,
    name: config.name,
    category: 'consumable' as const, // Clothing uses consumable category for now
    tier: config.tier,
    value: baseValue,
    shopPrice,
    weight: config.weight,
    rarity: config.rarity,
    tags: [config.layer, ...config.tags],
    description: config.description,
    effects: [],
    typedEffects: [],
  }
}

/**
 * Generates a full set of clothing items for all layers.
 * Distribution: common (60%), uncommon (30%), rare (10%)
 */
export function generateAllClothingItems(): ItemDefinition[] {
  const items: ItemDefinition[] = []

  // ─── HEAD WEAR (7 items) ──────────────────────────────────────────────────
  const headItems: ClothingItemConfig[] = [
    {
      id: 'cloth-headscarf-ragged',
      name: 'Ragged Headscarf',
      layer: 'head',
      tier: 1,
      value: 3,
      weight: 0.2,
      rarity: 'common',
      description: 'A dirty scrap of cloth wrapped around the head for dust protection or to hide identity.',
      tags: ['street-wear', 'concealment'],
    },
    {
      id: 'cloth-cap-workers',
      name: "Worker's Cap",
      layer: 'head',
      tier: 1,
      value: 8,
      weight: 0.3,
      rarity: 'common',
      description: 'Standard issue cap for ring workers, faded and oil-stained from long shifts.',
      tags: ['worker-wear', 'uniform'],
    },
    {
      id: 'cloth-hood-leather',
      name: 'Leather-Bound Hood',
      layer: 'head',
      tier: 2,
      value: 25,
      weight: 0.5,
      rarity: 'uncommon',
      description: 'A reinforced hood with leather trim, favored by those who work in hazardous conditions.',
      tags: ['protection', 'worker-wear'],
    },
    {
      id: 'cloth-bandit-mask',
      name: 'Bandit Half-Mask',
      layer: 'head',
      tier: 2,
      value: 35,
      weight: 0.4,
      rarity: 'uncommon',
      description: 'A leather mask covering the lower face, popular with those who prefer anonymity.',
      tags: ['concealment', 'street-wear'],
    },
    {
      id: 'cloth-veil-noble',
      name: 'Silk Veil of the Pale',
      layer: 'head',
      tier: 3,
      value: 120,
      weight: 0.2,
      rarity: 'rare',
      description: 'An elegant silk veil embroidered with silver thread, worn by nobles of the Pale district.',
      tags: ['noble-wear', 'fancy'],
    },
    {
      id: 'cloth-hat-steward',
      name: "Steward's Tricorne",
      layer: 'head',
      tier: 2,
      value: 45,
      weight: 0.4,
      rarity: 'uncommon',
      description: 'A formal three-cornered hat marking the wearer as a house steward or administrator.',
      tags: ['uniform', 'formal'],
    },
    {
      id: 'cloth-crown-rust',
      name: 'Rust-Crown circlet',
      layer: 'head',
      tier: 3,
      value: 200,
      weight: 0.3,
      rarity: 'rare',
      description: 'A tarnished metal circlet once worn by a minor noble, now a symbol of forgotten authority.',
      tags: ['noble-wear', 'relic'],
    },
  ]

  // ─── TORSO (8 items) ──────────────────────────────────────────────────────
  const torsoItems: ClothingItemConfig[] = [
    {
      id: 'cloth-shirt-burlap',
      name: 'Burlap Work Shirt',
      layer: 'torso',
      tier: 1,
      value: 5,
      weight: 0.8,
      rarity: 'common',
      description: 'A rough-spun shirt for hard labor, already stiff with grime.',
      tags: ['worker-wear', 'basic'],
    },
    {
      id: 'cloth-tunic-simple',
      name: 'Simple Linen Tunic',
      layer: 'torso',
      tier: 1,
      value: 12,
      weight: 0.6,
      rarity: 'common',
      description: 'A plain tunic of undyed linen, serviceable and easily replaced.',
      tags: ['basic', 'citizen-wear'],
    },
    {
      id: 'cloth-vest-leather',
      name: 'Patchwork Leather Vest',
      layer: 'torso',
      tier: 2,
      value: 30,
      weight: 1.2,
      rarity: 'uncommon',
      description: 'A vest made from salvaged leather scraps, stitched together with surprising care.',
      tags: ['salvage', 'worker-wear'],
    },
    {
      id: 'cloth-coat-duster',
      name: 'Oil-Stained Duster',
      layer: 'torso',
      tier: 2,
      value: 45,
      weight: 1.8,
      rarity: 'uncommon',
      description: 'A long coat treated with oil to repel water and grime, essential for ring work.',
      tags: ['worker-wear', 'protection'],
    },
    {
      id: 'cloth-blouse-silk',
      name: 'Faded Silk Blouse',
      layer: 'torso',
      tier: 2,
      value: 60,
      weight: 0.5,
      rarity: 'uncommon',
      description: 'Once fine silk, now showing its age but still bearing traces of elegance.',
      tags: ['citizen-wear', 'fancy'],
    },
    {
      id: 'cloth-doublet-noble',
      name: 'Embroidered Noble Doublet',
      layer: 'torso',
      tier: 3,
      value: 150,
      weight: 1.0,
      rarity: 'rare',
      description: 'A richly embroidered doublet displaying the colors and sigil of a noble house.',
      tags: ['noble-wear', 'formal'],
    },
    {
      id: 'cloth-robe-acolyte',
      name: "Acolyte's Grey Robe",
      layer: 'torso',
      tier: 2,
      value: 40,
      weight: 1.5,
      rarity: 'uncommon',
      description: 'A simple grey robe worn by religious acolytes and seekers of contemplation.',
      tags: ['religious', 'uniform'],
    },
    {
      id: 'cloth-jacket-officers',
      name: "Officer's Service Jacket",
      layer: 'torso',
      tier: 3,
      value: 100,
      weight: 1.6,
      rarity: 'rare',
      description: 'A formal jacket with brass buttons, marking the wearer as a League officer.',
      tags: ['uniform', 'authority'],
    },
  ]

  // ─── ARMS (5 items) ───────────────────────────────────────────────────────
  const armItems: ClothingItemConfig[] = [
    {
      id: 'cloth-sleeves-rolled',
      name: 'Rolled Canvas Sleeves',
      layer: 'arms',
      tier: 1,
      value: 4,
      weight: 0.2,
      rarity: 'common',
      description: 'Detachable canvas sleeves, rolled up for hot work and tied down for protection.',
      tags: ['worker-wear', 'practical'],
    },
    {
      id: 'cloth-gloves-work',
      name: 'Calloused Work Gloves',
      layer: 'arms',
      tier: 1,
      value: 6,
      weight: 0.2,
      rarity: 'common',
      description: 'Thick gloves worn soft at the fingertips, protecting hands without sacrificing dexterity.',
      tags: ['worker-wear', 'protection'],
    },
    {
      id: 'cloth-bracers-leather',
      name: 'Stitched Leather Bracers',
      layer: 'arms',
      tier: 2,
      value: 25,
      weight: 0.4,
      rarity: 'uncommon',
      description: 'Leather bracers with reinforced stitching, offering minor protection for travelers.',
      tags: ['traveler-wear', 'protection'],
    },
    {
      id: 'cloth-gloves-fine',
      name: 'Fine Kid Gloves',
      layer: 'arms',
      tier: 2,
      value: 50,
      weight: 0.1,
      rarity: 'uncommon',
      description: 'Soft kid leather gloves, worn by those who value their hands and their appearance.',
      tags: ['noble-wear', 'fancy'],
    },
    {
      id: 'cloth-sleeve-armband',
      name: 'House Armband',
      layer: 'arms',
      tier: 2,
      value: 15,
      weight: 0.1,
      rarity: 'common',
      description: 'A cloth armband displaying house colors, worn to show loyalty or affiliation.',
      tags: ['uniform', 'symbol'],
    },
  ]

  // ─── LEGS (5 items) ───────────────────────────────────────────────────────
  const legItems: ClothingItemConfig[] = [
    {
      id: 'cloth-trousers-burlap',
      name: 'Burlap Trousers',
      layer: 'legs',
      tier: 1,
      value: 6,
      weight: 0.6,
      rarity: 'common',
      description: 'Rough trousers that chafe but are cheap to replace.',
      tags: ['worker-wear', 'basic'],
    },
    {
      id: 'cloth-skirt-simple',
      name: 'Plain Wool Skirt',
      layer: 'legs',
      tier: 1,
      value: 10,
      weight: 0.5,
      rarity: 'common',
      description: 'A simple wool skirt in a neutral color, practical for daily work.',
      tags: ['citizen-wear', 'basic'],
    },
    {
      id: 'cloth-pants-leather',
      name: 'Reinforced Leather Pants',
      layer: 'legs',
      tier: 2,
      value: 35,
      weight: 1.0,
      rarity: 'uncommon',
      description: 'Leather-reinforced trousers for those who climb, crawl, or ride frequently.',
      tags: ['traveler-wear', 'protection'],
    },
    {
      id: 'cloth-trousers-noble',
      name: 'Velvet Breeches',
      layer: 'legs',
      tier: 3,
      value: 120,
      weight: 0.7,
      rarity: 'rare',
      description: 'Rich velvet breeches trimmed with gold thread, for formal occasions only.',
      tags: ['noble-wear', 'fancy'],
    },
    {
      id: 'cloth-skirt-layered',
      name: 'Layered Merchant Skirt',
      layer: 'legs',
      tier: 2,
      value: 40,
      weight: 0.8,
      rarity: 'uncommon',
      description: 'A multi-layered skirt with hidden pockets, favored by traveling merchants.',
      tags: ['merchant-wear', 'practical'],
    },
  ]

  // ─── FEET (5 items) ───────────────────────────────────────────────────────
  const footItems: ClothingItemConfig[] = [
    {
      id: 'cloth-sandals-strapped',
      name: 'Strapped Leather Sandals',
      layer: 'feet',
      tier: 1,
      value: 8,
      weight: 0.4,
      rarity: 'common',
      description: 'Simple sandals with multiple straps, adequate for warm weather.',
      tags: ['basic', 'summer'],
    },
    {
      id: 'cloth-boots-work',
      name: 'Steel-Toed Work Boots',
      layer: 'feet',
      tier: 2,
      value: 40,
      weight: 1.2,
      rarity: 'uncommon',
      description: 'Heavy boots with steel reinforcement, essential for ring workers.',
      tags: ['worker-wear', 'protection'],
    },
    {
      id: 'cloth-boots-travel',
      name: 'Worn Travel Boots',
      layer: 'feet',
      tier: 2,
      value: 30,
      weight: 1.0,
      rarity: 'uncommon',
      description: 'Boots that have seen many miles, broken in and comfortable despite their scars.',
      tags: ['traveler-wear', 'practical'],
    },
    {
      id: 'cloth-shoes-elegant',
      name: 'Polished Court Shoes',
      layer: 'feet',
      tier: 3,
      value: 90,
      weight: 0.6,
      rarity: 'rare',
      description: 'Immaculately polished shoes with silver buckles, for court appearances.',
      tags: ['noble-wear', 'formal'],
    },
    {
      id: 'cloth-boots-rain',
      name: 'Waterproof Rain Boots',
      layer: 'feet',
      tier: 2,
      value: 35,
      weight: 0.9,
      rarity: 'uncommon',
      description: "Treated leather boots that keep feet dry through the worst of the city's runoff.",
      tags: ['practical', 'protection'],
    },
  ]

  // ─── FULL BODY (4 items) ──────────────────────────────────────────────────
  const fullItems: ClothingItemConfig[] = [
    {
      id: 'cloth-robe-simple',
      name: 'Simple Grey Robe',
      layer: 'full',
      tier: 1,
      value: 15,
      weight: 1.2,
      rarity: 'common',
      description: 'A full-length robe of undyed wool, worn by laborers and the poor.',
      tags: ['basic', 'citizen-wear'],
    },
    {
      id: 'cloth-jumpsuit-worker',
      name: 'League Worker Jumpsuit',
      layer: 'full',
      tier: 2,
      value: 50,
      weight: 1.5,
      rarity: 'uncommon',
      description: 'A one-piece jumpsuit with multiple pockets, standard issue for League maintenance crews.',
      tags: ['uniform', 'worker-wear'],
    },
    {
      id: 'cloth-robe-noble',
      name: 'Ceremonial Noble Robe',
      layer: 'full',
      tier: 3,
      value: 250,
      weight: 2.0,
      rarity: 'rare',
      description: 'An elaborate robe of deep crimson silk, embroidered with family sigils and worn only for state occasions.',
      tags: ['noble-wear', 'formal', 'ceremonial'],
    },
    {
      id: 'cloth-gown-evening',
      name: 'Evening Gown of the Pale',
      layer: 'full',
      tier: 3,
      value: 300,
      weight: 1.8,
      rarity: 'rare',
      description: 'An elegant evening gown in pale blue silk, designed for the finest balls of the noble district.',
      tags: ['noble-wear', 'fancy', 'evening'],
    },
  ]

  // ─── UNDERGARMENTS (4 items) ──────────────────────────────────────────────
  const undergarmentItems: ClothingItemConfig[] = [
    {
      id: 'cloth-underclothes-simple',
      name: 'Simple Underclothes',
      layer: 'undergarments',
      tier: 1,
      value: 4,
      weight: 0.3,
      rarity: 'common',
      description: 'Basic linen undergarments, washed regularly and mended when needed.',
      tags: ['basic', 'essential'],
    },
    {
      id: 'cloth-shift-linen',
      name: 'Fine Linen Shift',
      layer: 'undergarments',
      tier: 2,
      value: 15,
      weight: 0.4,
      rarity: 'common',
      description: 'A well-made shift of fine linen, comfortable against the skin.',
      tags: ['citizen-wear', 'comfort'],
    },
    {
      id: 'cloth-corset-simple',
      name: 'Light Support Corset',
      layer: 'undergarments',
      tier: 2,
      value: 25,
      weight: 0.5,
      rarity: 'uncommon',
      description: 'A lightly boned corset for posture support, not for dramatic shaping.',
      tags: ['practical', 'support'],
    },
    {
      id: 'cloth-underclothes-silk',
      name: 'Silk Undergarments',
      layer: 'undergarments',
      tier: 3,
      value: 80,
      weight: 0.2,
      rarity: 'rare',
      description: 'Delicate silk undergarments, a luxury reserved for the wealthy.',
      tags: ['noble-wear', 'luxury'],
    },
  ]

  // Combine all items
  const allConfigs = [
    ...headItems,
    ...torsoItems,
    ...armItems,
    ...legItems,
    ...footItems,
    ...fullItems,
    ...undergarmentItems,
  ]

  // Generate items from configs
  for (const config of allConfigs) {
    items.push(generateClothingItem(config))
  }

  return items
}

// Export for testing
export const CLOTHING_LAYERS = ['head', 'torso', 'arms', 'legs', 'feet', 'full', 'undergarments'] as const
export type ClothingLayer = typeof CLOTHING_LAYERS[number]
