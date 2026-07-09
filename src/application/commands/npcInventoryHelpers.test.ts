import { describe, expect, it } from 'vitest'
import { resolveStartingArmorItemId, registerStartingArmorInstance, startingArmorInstanceId } from './npcInventoryHelpers'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { NpcArmor, NpcClothing } from '../../domain/npc/contracts'

const EMPTY_ARMOR: NpcArmor = { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null }
const EMPTY_CLOTHING: NpcClothing = { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] }

// Root-cause coverage for the user-reported live bug (2026-07-09): NpcDefinition.startingEquipment
// is authored on nearly every NPC in npcs.json, but nothing anywhere read it -- three independent
// roster-entry builders (recruitment.ts, applyEventOutcome.ts's addNpcToRoster, and
// createRuntimeStateFromDefinition.ts) all hardcoded loadout.armorId/equipment.armor to null. This
// resolver is the one shared piece of logic all three now use, so it needs its own direct coverage
// rather than relying only on each call site's integration tests.
describe('resolveStartingArmorItemId', () => {
  it('returns null when neither armor{} nor clothing{} has any populated slot', () => {
    expect(resolveStartingArmorItemId(EMPTY_ARMOR, EMPTY_CLOTHING)).toBeNull()
  })

  it('resolves an armor-category item from armor.lightTorso', () => {
    const armor: NpcArmor = { ...EMPTY_ARMOR, lightTorso: 'armor-medium-compact-chainmail' }
    expect(resolveStartingArmorItemId(armor, EMPTY_CLOTHING)).toBe('armor-medium-compact-chainmail')
  })

  it('resolves an armor-category item from armor.heavyTorso, preferring it over lightTorso', () => {
    const armor: NpcArmor = { ...EMPTY_ARMOR, lightTorso: 'armor-light-waste-runner-vest', heavyTorso: 'armor-medium-compact-chainmail' }
    expect(resolveStartingArmorItemId(armor, EMPTY_CLOTHING)).toBe('armor-medium-compact-chainmail')
  })

  // npc-sable-wrent's real authored data (npcs.json): armor{} is fully null, but clothing.torso
  // holds a genuine armor-category item id ('armor-light-tallow-work-coat') instead -- inconsistent
  // authoring the resolver must handle, not an invented edge case.
  it('resolves an armor-category item that was authored under clothing.torso instead of armor{}', () => {
    const clothing: NpcClothing = { ...EMPTY_CLOTHING, torso: 'armor-light-tallow-work-coat' }
    expect(resolveStartingArmorItemId(EMPTY_ARMOR, clothing)).toBe('armor-light-tallow-work-coat')
  })

  it('does not mistake a plain clothing item for armor', () => {
    const clothing: NpcClothing = { ...EMPTY_CLOTHING, torso: 'cloth-tunic-simple' }
    expect(resolveStartingArmorItemId(EMPTY_ARMOR, clothing)).toBeNull()
  })

  it('prefers armor{} over clothing{} when both resolve to real armor items', () => {
    const armor: NpcArmor = { ...EMPTY_ARMOR, lightTorso: 'armor-medium-compact-chainmail' }
    const clothing: NpcClothing = { ...EMPTY_CLOTHING, torso: 'armor-light-tallow-work-coat' }
    expect(resolveStartingArmorItemId(armor, clothing)).toBe('armor-medium-compact-chainmail')
  })
})

describe('registerStartingArmorInstance', () => {
  it('registers a fresh itemRegistry entry with the correct itemId, locationType, and locationId', () => {
    const next = registerStartingArmorInstance(initialGameStateSnapshot, 'npc-marion-vale', 'armor-light-tallow-work-coat')
    const entry = next.inventoryState.itemRegistry['npc-marion-vale:starting-armor']
    expect(entry).toBeDefined()
    expect(entry!.itemId).toBe('armor-light-tallow-work-coat')
    expect(entry!.locationType).toBe('equipment')
    expect(entry!.locationId).toBe('npc-marion-vale')
    expect(entry!.quantity).toBe(1)
  })

  it('is a no-op when armorItemId is null', () => {
    const next = registerStartingArmorInstance(initialGameStateSnapshot, 'npc-marion-vale', null)
    expect(next).toBe(initialGameStateSnapshot)
  })

  it('does not overwrite an already-registered instance for the same npcId (idempotent)', () => {
    const withExisting = {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        itemRegistry: {
          ...initialGameStateSnapshot.inventoryState.itemRegistry,
          'npc-marion-vale:starting-armor': {
            uniqueId: 'npc-marion-vale:starting-armor',
            itemId: 'armor-light-tallow-work-coat',
            quantity: 1,
            locationType: 'equipment' as const,
            locationId: 'npc-marion-vale',
            acquiredDay: 1,
            flags: ['pre-existing-marker'],
          },
        },
      },
    }
    const next = registerStartingArmorInstance(withExisting, 'npc-marion-vale', 'armor-medium-compact-chainmail')
    expect(next).toBe(withExisting)
    expect(next.inventoryState.itemRegistry['npc-marion-vale:starting-armor']?.flags).toEqual(['pre-existing-marker'])
  })
})

describe('startingArmorInstanceId', () => {
  it('is deterministic and namespaced per npcId', () => {
    expect(startingArmorInstanceId('npc-marion-vale')).toBe('npc-marion-vale:starting-armor')
    expect(startingArmorInstanceId('npc-elyn')).toBe('npc-elyn:starting-armor')
  })
})
