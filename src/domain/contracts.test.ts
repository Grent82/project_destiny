import { describe, expect, it } from 'vitest'

import {
  activeCombatStateSchema,
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
    })

    expect(result.success).toBe(false)
  })

  it('accepts a bound-service runtime payload with a null-safe bondStatus', () => {
    const result = npcRuntimeStateSchema.safeParse({
      npcId: 'npc-bonded-1',
      name: 'Sera Flint',
      status: 'servant',
      assignment: 'working',
      assignedDistrictId: null,
      activeTitle: null,
      wagesOwedDays: 0,
      trainingFocus: null,
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
        primaryWeaponId: null,
        secondaryWeaponId: null,
        armorId: null,
        accessoryIds: [],
        consumableIds: [],
      },
      npcMemory: [],
      npcArc: null,
      bondStatus: {
        holderId: 'player',
        contractValue: 120,
        termDays: 30,
        entryReason: 'debt-settlement',
        alongsideFreeAssignmentDays: 5,
        lastEqualityNoticeDay: null,
      },
    })

    expect(result.success).toBe(true)
  })
})

describe('gameStateSchema', () => {
  it('accepts a valid runtime state without content definitions mixed into it', () => {
    const result = gameStateSchema.safeParse({
      day: 1,
      timeSlot: 'morning',
      money: 250,
      protagonistName: 'Valdris',
      hasSeenOpening: false,
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
      cityResources: {
        foodSecurity: 62,
        waterAccess: 70,
        materialStock: 50,
        corridorStatus: 'open',
      },
      factionStandings: {
        'faction-civic': 10,
      },
      cityDials: {
        control: 45,
        prosperity: 35,
        unrest: 55,
        corruption: 60,
      },
      activityLog: [],
      selectedSquadNpcIds: [],
      activeCombat: null,
      pendingEvents: [],
    })

    expect(result.success).toBe(true)
  })

  it('defaults richer quest runtime fields when loading an older active quest entry', () => {
    const result = gameStateSchema.safeParse({
      day: 3,
      timeSlot: 'afternoon',
      money: 120,
      protagonistName: 'Valdris',
      hasSeenOpening: true,
      factionStates: [],
      districts: [],
      roster: [],
      inventory: [],
      cityResources: {
        foodSecurity: 62,
        waterAccess: 70,
        materialStock: 50,
        corridorStatus: 'open',
      },
      factionStandings: {},
      cityDials: {
        control: 45,
        prosperity: 35,
        unrest: 55,
        corruption: 60,
      },
      activityLog: [],
      selectedSquadNpcIds: [],
      activeCombat: null,
      pendingEvents: [],
      availableQuestLeads: [],
      activeQuests: [
        {
          questId: 'quest-harborwatch',
          acceptedOnDay: 2,
          status: 'active',
          objectiveMet: false,
          acceptedTitle: 'Harborwatch',
        },
      ],
      completedQuestIds: [],
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    const runtime = result.data.activeQuests[0]
    expect(runtime.stageId).toBe('accepted')
    expect(runtime.currentObjectiveLabel).toBeNull()
    expect(runtime.progress.requiredSteps).toBe(1)
    expect(runtime.context.retryBehavior).toBe('fail')
    expect(runtime.journalEntries).toEqual([])
  })

  it('accepts tracked wards with bond service state', () => {
    const result = gameStateSchema.safeParse({
      day: 1,
      timeSlot: 'morning',
      money: 250,
      protagonistName: 'Valdris',
      hasSeenOpening: false,
      factionStates: [],
      districts: [],
      roster: [],
      inventory: [],
      cityResources: {
        foodSecurity: 62,
        waterAccess: 70,
        materialStock: 50,
        corridorStatus: 'open',
      },
      factionStandings: {},
      cityDials: {
        control: 45,
        prosperity: 35,
        unrest: 55,
        corruption: 60,
      },
      activityLog: [],
      selectedSquadNpcIds: [],
      activeCombat: null,
      pendingEvents: [],
      wards: [
        {
          wardId: 'ward-ash',
          name: 'Ash',
          parentNpcId: 'npc-marion-vale',
          freedOnDay: null,
          bondStatus: {
            holderId: 'compact',
            contractValue: 900,
            termDays: null,
            entryReason: 'compact-assessment',
            alongsideFreeAssignmentDays: 0,
            lastEqualityNoticeDay: null,
          },
        },
      ],
    })

    expect(result.success).toBe(true)
  })
})

describe('activeCombatStateSchema', () => {
  it('rejects a combatant whose health exceeds maxHealth', () => {
    const result = activeCombatStateSchema.safeParse({
      encounterId: 'encounter-1',
      round: 1,
      range: 'close',
      outcome: 'ongoing',
      activeCombatantId: 'ally-1',
      combatants: [
        {
          combatantId: 'ally-1',
          sourceNpcId: 'npc-1',
          name: 'Ally',
          side: 'allies',
          maxHealth: 40,
          health: 45,
          morale: 70,
          skill: 52,
          accuracy: 68,
          damageMin: 8,
          damageMax: 12,
          effectiveRange: 'close',
          soak: 12,
          speed: 4,
          guarding: false,
        },
        {
          combatantId: 'enemy-1',
          sourceNpcId: null,
          name: 'Enemy',
          side: 'enemies',
          maxHealth: 38,
          health: 38,
          morale: 55,
          skill: 44,
          accuracy: 62,
          damageMin: 7,
          damageMax: 11,
          effectiveRange: 'distant',
          soak: 8,
          speed: 3,
          guarding: false,
        },
      ],
      log: [],
    })

    expect(result.success).toBe(false)
  })
})
