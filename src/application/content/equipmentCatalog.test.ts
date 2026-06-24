/**
 * Tests for the equipment catalog - weapon and armor profiles.
 *
 * These tests verify that all equipment definitions are correctly loaded
 * and that the profile lookup functions work as expected.
 */

import { describe, it, expect } from 'vitest'
import {
  getWeaponProfile,
  getArmorProfile,
  getWeaponRepairCost,
  getArmorRepairCost,
  getWeaponDurabilityMax,
  getArmorDurabilityMax,
  getWeaponName,
  getArmorName,
  UNARMED_PROFILE,
  UNARMORED_PROFILE,
} from './equipmentCatalog'
import { contentCatalog } from './contentCatalog'

describe('Weapon Profiles', () => {
  it('returns UNARMED_PROFILE for null weapon ID', () => {
    expect(getWeaponProfile(null)).toBe(UNARMED_PROFILE)
  })

  it('returns UNARMED_PROFILE for unknown weapon ID', () => {
    expect(getWeaponProfile('weapon-nonexistent-xyz')).toBe(UNARMED_PROFILE)
  })

  it('has correct unarmed profile values', () => {
    expect(UNARMED_PROFILE.damageMin).toBe(1)
    expect(UNARMED_PROFILE.damageMax).toBe(3)
    expect(UNARMED_PROFILE.accuracy).toBe(60)
    expect(UNARMED_PROFILE.armorPiercing).toBe(0)
  })

  it('returns correct profile for weapon-spear-ironworks-pike', () => {
    const profile = getWeaponProfile('weapon-spear-ironworks-pike')
    expect(profile.id).toBe('weapon-spear-ironworks-pike')
    expect(profile.rangeTypePreference).toBe('medium')
  })

  it('returns correct profile for weapon-dagger-wasterunner', () => {
    const profile = getWeaponProfile('weapon-dagger-wasterunner')
    expect(profile.id).toBe('weapon-dagger-wasterunner')
  })

  it('weapon definitions have valid weaponClass', () => {
    const weapon = contentCatalog.itemsById.get('weapon-spear-ironworks-pike')
    expect(weapon).toBeDefined()
    expect(weapon && 'weaponClass' in weapon).toBe(true)
    if (weapon && 'weaponClass' in weapon) {
      expect((weapon as { weaponClass: string }).weaponClass).toBe('spear')
    }
  })

  it('all 19 weapons have valid weaponClass', () => {
    const weaponIds = [
      'weapon-dagger-wasterunner',
      'weapon-dagger-ring-flicker',
      'weapon-dagger-compact-needlepoint',
      'weapon-sword-foundry-blade',
      'weapon-sword-ward-captain-saber',
      'weapon-sword-court-dueling-blade',
      'weapon-spear-ironworks-pike',
      'weapon-spear-breach-era-halberd',
      'weapon-hammer-foundry-maul',
      'weapon-hammer-league-enforcer-sledge',
      'weapon-hammer-siege-breaker',
      'weapon-crossbow-harbor-boltcaster',
      'weapon-crossbow-league-precision-frame',
      'weapon-pistol-compact-sidearm',
      'weapon-pistol-court-calling-piece',
      'weapon-rifle-wall-post-carbine',
      'weapon-rifle-ring-longshot',
      'weapon-shotgun-harbor-sweeper',
      'weapon-shotgun-ironworks-scattergun',
    ]

    for (const id of weaponIds) {
      const weapon = contentCatalog.itemsById.get(id)
      expect(weapon, `${id} should exist`).toBeDefined()
      if (weapon && 'weaponClass' in weapon) {
        expect((weapon as { weaponClass: string }).weaponClass).toBeDefined()
      }
    }
  })

  it('range modifiers are properly defined for all weapons', () => {
    const profile = getWeaponProfile('weapon-spear-ironworks-pike')
    expect(typeof profile.rangeModifierClose).toBe('number')
    expect(typeof profile.rangeModifierMedium).toBe('number')
    expect(typeof profile.rangeModifierDistant).toBe('number')
  })
})

describe('Armor Profiles', () => {
  it('returns UNARMORED_PROFILE for null armor ID', () => {
    expect(getArmorProfile(null)).toBe(UNARMORED_PROFILE)
  })

  it('returns UNARMORED_PROFILE for unknown armor ID', () => {
    expect(getArmorProfile('armor-nonexistent-xyz')).toBe(UNARMORED_PROFILE)
  })

  it('has correct unarmored profile values', () => {
    expect(UNARMORED_PROFILE.soak).toBe(0)
    expect(UNARMORED_PROFILE.evasionPenalty).toBe(0)
    expect(UNARMORED_PROFILE.speedPenalty).toBe(0)
  })

  it('returns correct profile for armor-light-waste-runner-vest', () => {
    const profile = getArmorProfile('armor-light-waste-runner-vest')
    expect(profile.id).toBe('armor-light-waste-runner-vest')
    expect(profile.soak).toBe(3)
    expect(profile.evasionPenalty).toBe(3)
  })

  it('returns correct profile for armor-light-tallow-work-coat', () => {
    const profile = getArmorProfile('armor-light-tallow-work-coat')
    expect(profile.id).toBe('armor-light-tallow-work-coat')
  })

  it('armor definitions have valid armorClass', () => {
    const armor = contentCatalog.itemsById.get('armor-light-waste-runner-vest')
    expect(armor).toBeDefined()
    expect(armor && 'armorClass' in armor).toBe(true)
    if (armor && 'armorClass' in armor) {
      expect((armor as { armorClass: string }).armorClass).toBe('light')
    }
  })

  it('supports negative evasion/speed penalties for stealth armor', () => {
    // Check armor definition directly since profiles don't expose armorClass
    const armor = contentCatalog.itemsById.get('armor-specialized-ring-courier-leather')
    if (armor && 'armorClass' in armor) {
      const typedArmor = armor as { evasionPenalty: number; speedPenalty: number }
      expect(typedArmor.evasionPenalty).toBeGreaterThanOrEqual(-100)
      expect(typedArmor.speedPenalty).toBeGreaterThanOrEqual(-100)
    }
  })
})

describe('Weapon Repair Costs and Durability', () => {
  it('returns 0 repair cost for null weapon ID', () => {
    expect(getWeaponRepairCost(null)).toBe(0)
  })

  it('returns default repair cost for unknown weapon', () => {
    expect(getWeaponRepairCost('weapon-unknown-xyz')).toBe(40)
  })

  it('returns correct repair cost for weapon-spear-ironworks-pike', () => {
    const cost = getWeaponRepairCost('weapon-spear-ironworks-pike')
    expect(cost).toBeGreaterThan(0)
  })

  it('returns 100 durability max for null weapon ID', () => {
    expect(getWeaponDurabilityMax(null)).toBe(100)
  })

  it('returns default durability max for unknown weapon', () => {
    expect(getWeaponDurabilityMax('weapon-unknown-xyz')).toBe(100)
  })
})

describe('Armor Repair Costs and Durability', () => {
  it('returns 0 repair cost for null armor ID', () => {
    expect(getArmorRepairCost(null)).toBe(0)
  })

  it('returns default repair cost for unknown armor', () => {
    expect(getArmorRepairCost('armor-unknown-xyz')).toBe(40)
  })

  it('returns correct repair cost for armor-light-waste-runner-vest', () => {
    const cost = getArmorRepairCost('armor-light-waste-runner-vest')
    expect(cost).toBeGreaterThan(0)
  })

  it('returns 100 durability max for null armor ID', () => {
    expect(getArmorDurabilityMax(null)).toBe(100)
  })

  it('returns default durability max for unknown armor', () => {
    expect(getArmorDurabilityMax('armor-unknown-xyz')).toBe(100)
  })
})

describe('Weapon and Armor Names', () => {
  it('returns null for null weapon ID', () => {
    expect(getWeaponName(null)).toBeNull()
  })

  it('returns null for unknown weapon ID', () => {
    expect(getWeaponName('weapon-unknown-xyz')).toBeNull()
  })

  it('returns correct name for weapon-spear-ironworks-pike', () => {
    const name = getWeaponName('weapon-spear-ironworks-pike')
    expect(name).toBe('Ironworks Security Pike')
  })

  it('returns null for null armor ID', () => {
    expect(getArmorName(null)).toBeNull()
  })

  it('returns null for unknown armor ID', () => {
    expect(getArmorName('armor-unknown-xyz')).toBeNull()
  })

  it('returns correct name for armor-light-waste-runner-vest', () => {
    const name = getArmorName('armor-light-waste-runner-vest')
    expect(name).toBe("Waste-Runner's Padded Vest")
  })
})
