import { describe, expect, it } from 'vitest'

import {
  gameStateSchema,
  npcRuntimeStateSchema,
  weaponDefinitionSchema,
} from './index'

describe('weaponDefinitionSchema', () => {
  it('rejects a weapon with a damageMax below damageMin', () => {
    const result = weaponDefinitionSchema.safeParse({
      id: 'weapon-rifle-1',
      name: 'Cracked Rifle',
      category: 'weapon',
      tier: 1,
      value: 120,
      weight: 4.5,
      rarity: 'common',
      tags: ['starter'],
      weaponClass: 'rifle',
      effectiveRange: 'distant',
      damageMin: 12,
      damageMax: 6,
      accuracy: 72,
      armorPiercing: 18,
      speed: 5,
      rangeModifier: {
        close: -25,
        distant: 20,
      },
      critChance: 8,
      staggerChance: 12,
      ammoType: 'light_round',
      durability: 100,
    })

    expect(result.success).toBe(false)
  })
})

describe('npcRuntimeStateSchema', () => {
  it('rejects relationship axes outside the allowed bounds', () => {
    const result = npcRuntimeStateSchema.safeParse({
      npcId: 'npc-1',
      assignment: 'idle',
      attributes: {
        might: 40,
        agility: 55,
        endurance: 48,
        intellect: 62,
        perception: 50,
        presence: 44,
        resolve: 60,
      },
      skills: {
        melee: 25,
        ranged: 30,
        medicine: 18,
        administration: 10,
        engineering: 12,
        negotiation: 24,
        survival: 20,
        security: 22,
        crafting: 14,
        performance: 9,
        academics: 16,
        intrigue: 28,
      },
      traits: {
        discipline: 70,
        ambition: 52,
        empathy: 31,
        ruthlessness: 44,
        prudence: 66,
        curiosity: 48,
        dominance: 39,
        loyalty: 59,
        vanity: 27,
        zeal: 36,
      },
      states: {
        health: 90,
        fatigue: 12,
        stress: 20,
        morale: 64,
        fear: 10,
        anger: 8,
        hunger: 22,
        injury: 0,
        intoxication: 0,
        hygiene: 76,
      },
      loadout: {
        primaryWeaponId: 'weapon-rifle-1',
        secondaryWeaponId: null,
        armorId: null,
        accessoryIds: [],
        consumableIds: [],
      },
      relationships: {
        'npc-2': {
          affinity: 45,
          respect: 120,
          fear: 10,
          loyalty: 25,
          trust: 33,
        },
      },
      factionRelationships: [],
    })

    expect(result.success).toBe(false)
  })
})

describe('gameStateSchema', () => {
  it('accepts a valid runtime state without content definitions mixed into it', () => {
    const result = gameStateSchema.safeParse({
      day: 1,
      timeSlot: 'morning',
      money: 250,
      politicalDials: {
        control: 58,
        prosperity: 44,
        unrest: 22,
        corruption: 31,
      },
      factionStates: [
        {
          factionId: 'faction-civic',
          power: 63,
          wealth: 55,
          security: 70,
          standingWithPlayer: 10,
          activePressure: 18,
        },
      ],
      districts: [
        {
          districtId: 'district-docks',
          controllingFactionId: 'faction-civic',
          danger: 47,
          marketPressure: 58,
        },
      ],
      roster: [],
      inventory: [],
      activeQuestIds: [],
      selectedSquadNpcIds: [],
    })

    expect(result.success).toBe(true)
  })
})
