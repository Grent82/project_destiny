/**
 * Integration tests for contentCatalog itemsById.
 *
 * These tests verify that the fix for the "unknown" category bug is working:
 * - Weapons and armor are properly loaded into itemsById
 * - All item references (shop offers, etc.) resolve correctly
 */

import { describe, it, expect } from 'vitest'
import { contentCatalog } from './contentCatalog'

type WeaponLike = { id: string; weaponClass: string }
type ArmorLike = { id: string; armorClass: string }

function isWeaponDefinition(item: unknown): item is WeaponLike {
  return typeof item === 'object' && item !== null && 'weaponClass' in item
}

function isArmorDefinition(item: unknown): item is ArmorLike {
  return typeof item === 'object' && item !== null && 'armorClass' in item
}

describe('Content Catalog - Items by ID Integration', () => {
  describe('Weapon definitions in itemsById', () => {
    it('contains weapon-spear-ironworks-pike', () => {
      const item = contentCatalog.itemsById.get('weapon-spear-ironworks-pike')
      expect(item).toBeDefined()
      expect(item?.id).toBe('weapon-spear-ironworks-pike')
      expect(isWeaponDefinition(item)).toBe(true)
      if (isWeaponDefinition(item)) {
        expect(item.weaponClass).toBe('spear')
      }
    })

    it('contains weapon-dagger-wasterunner', () => {
      const item = contentCatalog.itemsById.get('weapon-dagger-wasterunner')
      expect(item).toBeDefined()
      expect(item?.id).toBe('weapon-dagger-wasterunner')
      expect(isWeaponDefinition(item)).toBe(true)
      if (isWeaponDefinition(item)) {
        expect(item.weaponClass).toBe('dagger')
      }
    })

    it('contains all 19 weapons', () => {
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
        const item = contentCatalog.itemsById.get(id)
        expect(item, `${id} should be in itemsById`).toBeDefined()
        expect(item?.id).toBe(id)
      }
    })

    it('weapon count matches weapons.json', () => {
      const weaponCount = Array.from(contentCatalog.itemsById.values()).filter(isWeaponDefinition).length
      expect(weaponCount).toBe(19)
    })
  })

  describe('Armor definitions in itemsById', () => {
    it('contains armor-light-waste-runner-vest', () => {
      const item = contentCatalog.itemsById.get('armor-light-waste-runner-vest')
      expect(item).toBeDefined()
      expect(item?.id).toBe('armor-light-waste-runner-vest')
      expect(isArmorDefinition(item)).toBe(true)
      if (isArmorDefinition(item)) {
        expect(item.armorClass).toBe('light')
      }
    })

    it('contains armor-light-tallow-work-coat', () => {
      const item = contentCatalog.itemsById.get('armor-light-tallow-work-coat')
      expect(item).toBeDefined()
      expect(item?.id).toBe('armor-light-tallow-work-coat')
      expect(isArmorDefinition(item)).toBe(true)
      if (isArmorDefinition(item)) {
        expect(item.armorClass).toBe('light')
      }
    })

    it('contains armor pieces from armor.json', () => {
      const armorIds = [
        'armor-light-tallow-work-coat',
        'armor-light-waste-runner-vest',
        'armor-light-apothecary-duster',
        'armor-medium-compact-chainmail',
        'armor-medium-league-foreman-halfplate',
        'armor-medium-harbor-boarding-coat',
        'armor-heavy-breach-plate-salvaged',
        'armor-heavy-league-armory-chest',
        'armor-specialized-ring-courier-leather',
        'armor-specialized-compact-assessor-coat',
      ]

      for (const id of armorIds) {
        const item = contentCatalog.itemsById.get(id)
        expect(item, `${id} should be in itemsById`).toBeDefined()
        expect(item?.id).toBe(id)
      }
    })

    it('armor count matches armor.json + armor-items.json', () => {
      const armorCount = Array.from(contentCatalog.itemsById.values()).filter(isArmorDefinition).length
      // armor.json has 30 armor pieces, armor-items.json has 24 more
      expect(armorCount).toBe(54)
    })
  })

  describe('Base item definitions in itemsById', () => {
    it('contains base items from items.json', () => {
      const medkitItem = contentCatalog.itemsById.get('item-medkit-field')
      expect(medkitItem).toBeDefined()
      expect(medkitItem?.id).toBe('item-medkit-field')
      // Base items don't have weaponClass or armorClass
      expect(isWeaponDefinition(medkitItem)).toBe(false)
      expect(isArmorDefinition(medkitItem)).toBe(false)
    })

    it('item count equals base items + weapons + armor', () => {
      const totalCount = contentCatalog.itemsById.size
      // items.json has ~30 items, weapons.json has 19, armor.json has 30
      // clothing-items.json has 34 items, armor-items.json has 24 items
      // Total should be around 159
      expect(totalCount).toBeGreaterThan(150)
    })
  })

  describe('Shop offer item references', () => {
    it('all shop offer itemIds resolve to valid items', () => {
      const shopIds = ['shop-supply-depot', 'shop-weapon-mart', 'shop-armorers-bench']

      for (const shopId of shopIds) {
        const shop = contentCatalog.shopsById.get(shopId)
        if (!shop) continue

        for (const offer of shop.offers) {
          const item = contentCatalog.itemsById.get(offer.itemId)
          expect(item, `Shop ${shopId} offer item ${offer.itemId} should exist`).toBeDefined()
        }
      }
    })
  })

  describe('Category display fix verification', () => {
    it('weapon-spear-ironworks-pike has valid weaponClass for category display', () => {
      const item = contentCatalog.itemsById.get('weapon-spear-ironworks-pike')
      expect(item).toBeDefined()
      expect(isWeaponDefinition(item)).toBe(true)
      if (isWeaponDefinition(item)) {
        expect(['spear', 'sword', 'dagger', 'hammer', 'crossbow', 'pistol', 'rifle', 'shotgun']).toContain(item.weaponClass)
      }
    })

    it('armor-light-waste-runner-vest has valid armorClass for category display', () => {
      const item = contentCatalog.itemsById.get('armor-light-waste-runner-vest')
      expect(item).toBeDefined()
      expect(isArmorDefinition(item)).toBe(true)
      if (isArmorDefinition(item)) {
        expect(['light', 'medium', 'heavy', 'specialized']).toContain(item.armorClass)
      }
    })
  })
})

describe('Content Catalog - District faction references (destiny-e9tt)', () => {
  it('every district controllingFactionId resolves to a real faction definition', () => {
    for (const district of contentCatalog.districts) {
      if (!district.controllingFactionId) continue
      expect(
        contentCatalog.factionsById.has(district.controllingFactionId),
        `${district.id} references controllingFactionId "${district.controllingFactionId}", which has no matching faction definition`,
      ).toBe(true)
    }
  })

  it('every district contestedByFactionIds entry resolves to a real faction definition', () => {
    for (const district of contentCatalog.districts) {
      for (const factionId of district.contestedByFactionIds ?? []) {
        expect(
          contentCatalog.factionsById.has(factionId),
          `${district.id} lists contesting faction "${factionId}", which has no matching faction definition`,
        ).toBe(true)
      }
    }
  })
})
