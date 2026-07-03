import { describe, expect, it } from 'vitest'
import type { GameState } from '../../domain'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { applyCaptivityRestitution } from './applyCaptivityRestitution'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { NPC_IDS } from '../content/ids'

// Fixture: NPC with confiscated state (empty inventory, no money)
const createNpcWithConfiscatedState = (captivityStatus: 'rescued' | 'returned'): NpcRuntimeState => ({
  npcId: NPC_IDS.MARION_VALE,
  name: 'Marion Vale',
  status: 'mercenary',
  assignment: 'idle',
  assignedDistrictId: null,
  activeTitle: null,
  wagesOwedDays: 0,
  contractWagePerDay: 5,
  trainingFocus: null,
  roomAssignment: null,
  dutyPostRoomId: null,
  attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
  skills: { melee: 40, ranged: 30, medicine: 20, administration: 25, engineering: 15, negotiation: 35, survival: 25, security: 20, crafting: 15, performance: 10, academics: 20, intrigue: 30 },
  traits: { discipline: 50, ambition: 40, empathy: 60, ruthlessness: 30, prudence: 55, curiosity: 45, dominance: 35, loyalty: 70, vanity: 20, zeal: 25 },
  states: { health: 80, fatigue: 30, stress: 25, morale: 60, fear: 20, anger: 15, hunger: 30, injury: 10, intoxication: 0, hygiene: 70 },
  loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
  equipment: { weapon: null, armor: null, accessory: [] }, // No equipment (confiscated)
  personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 }, // No money (confiscated)
  clothing: { head: null, torso: 'item-basic-tunic', arms: null, legs: 'item-basic-trousers', feet: null, full: null, undergarments: null, accessories: [] }, // Basic clothes
  armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
  arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
  npcMemory: [],
  bondStatus: null,
  npcArc: null,
  currentDirectiveId: null,
  directiveDeadlineDay: null,
  currentIntention: null,
  currentEmployment: null,
  factionRelationships: [],
  wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
  captivityState: {
    status: captivityStatus,
    holderId: 'holder-001',
    siteId: null,
    roomId: null,
    regime: 'unknown',
    condition: 'healthy',
    compliance: 'resistant',
    bondType: 'none',
    timeHeldDays: 5,
    lastTransferDay: 1,
    questTag: null,
    confiscatedItems: [
      { uniqueId: 'item-weapon-001', itemId: 'item-iron-sword', quantity: 1, confiscatedDay: 1 },
      { uniqueId: 'item-potion-001', itemId: 'item-health-potion', quantity: 3, confiscatedDay: 1 },
      { uniqueId: 'item-gold-001', itemId: 'item-gold-coins', quantity: 10, confiscatedDay: 1 },
    ],
    confiscatedMoney: { savings: 100, carriedCash: 50 },
    confiscatedEquipment: { weapon: 'weapon-unique-001', armor: null, accessory: [] },
  },
})

// Fixture: GameState with confiscated items in captivityState
const createGameStateWithConfiscatedItems = (captivityStatus: 'rescued' | 'returned'): GameState => ({
  ...initialGameStateSnapshot,
  roster: [createNpcWithConfiscatedState(captivityStatus)],
  inventoryState: {
    player: {
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
      bagContainers: [],
      totalBagSlots: 40,
      usedBagSlots: 0,
    },
    npcInventories: {
      [NPC_IDS.MARION_VALE]: [
        {
          containerId: 'container-marion-backpack',
          containerType: 'backpack',
          ownerId: NPC_IDS.MARION_VALE,
          name: "Marion's Backpack",
          maxSlots: 20,
          slots: [
            { slotId: 'slot-1', itemInstanceId: null, quantity: 1 }, // Empty (confiscated)
            { slotId: 'slot-2', itemInstanceId: null, quantity: 1 }, // Empty (confiscated)
            { slotId: 'slot-3', itemInstanceId: null, quantity: 1 }, // Empty (confiscated)
          ],
          locked: false,
        },
      ],
    },
    sharedContainers: [],
    itemRegistry: {}, // NPC's inventory is empty
  },
})

describe('applyCaptivityRestitution', () => {
  it('returns unchanged state if NPC is not rescued/returned', () => {
    const state = createGameStateWithConfiscatedItems('rescued')
    // Change status back to captive to test the guard
    state.roster[0].captivityState = { ...state.roster[0].captivityState!, status: 'captive' }

    const result = applyCaptivityRestitution(state, { npcId: NPC_IDS.MARION_VALE })

    expect(result).toEqual(state)
  })

  it('returns unchanged state if NPC has no confiscated items', () => {
    const state = createGameStateWithConfiscatedItems('rescued')
    // Clear confiscated items
    state.roster[0].captivityState = { ...state.roster[0].captivityState!, confiscatedItems: [], confiscatedMoney: null, confiscatedEquipment: { weapon: null, armor: null, accessory: [] } }

    const result = applyCaptivityRestitution(state, { npcId: NPC_IDS.MARION_VALE })

    expect(result).toEqual(state)
  })

  it('returns all items on rescue', () => {
    const state = createGameStateWithConfiscatedItems('rescued')

    const result = applyCaptivityRestitution(state, { npcId: NPC_IDS.MARION_VALE })

    // Items should be returned to inventory
    const npcInventory = result.inventoryState.npcInventories[NPC_IDS.MARION_VALE]
    expect(npcInventory[0].slots[0].itemInstanceId).toBe('item-weapon-001')
    expect(npcInventory[0].slots[1].itemInstanceId).toBe('item-potion-001')
    expect(npcInventory[0].slots[2].itemInstanceId).toBe('item-gold-001')

    // Money should be returned
    expect(result.roster[0].personalFunds.savings).toBe(100)
    expect(result.roster[0].personalFunds.carriedCash).toBe(50)

    // Equipment should be returned
    expect(result.roster[0].equipment.weapon).toBe('weapon-unique-001')

    // Captivity state should be updated
    expect(result.roster[0].captivityState?.lastTransferDay).toBe(state.day)
  })

  it('returns items on return', () => {
    const state = createGameStateWithConfiscatedItems('returned')

    const result = applyCaptivityRestitution(state, { npcId: NPC_IDS.MARION_VALE })

    // Items should be returned
    const npcInventory = result.inventoryState.npcInventories[NPC_IDS.MARION_VALE]
    expect(npcInventory[0].slots[0].itemInstanceId).toBe('item-weapon-001')
    expect(result.roster[0].personalFunds.savings).toBe(100)
  })

  it('returns all items on returned', () => {
    const state = createGameStateWithConfiscatedItems('returned')

    const result = applyCaptivityRestitution(state, { npcId: NPC_IDS.MARION_VALE })

    // All items should be returned
    expect(result.roster[0].equipment.weapon).toBe('weapon-unique-001')
    expect(result.roster[0].personalFunds.savings).toBe(100)
    expect(result.roster[0].personalFunds.carriedCash).toBe(50)
  })

  it('does not return items if marked as retained', () => {
    const state = createGameStateWithConfiscatedItems('rescued')
    // Mark weapon as retained by removing it from confiscated items
    state.roster[0].captivityState!.confiscatedItems = state.roster[0].captivityState!.confiscatedItems.filter(i => i.uniqueId !== 'item-weapon-001')

    const result = applyCaptivityRestitution(state, { npcId: NPC_IDS.MARION_VALE })

    // Weapon should NOT be returned (not in confiscated items, so not restored)
    const npcInventory = result.inventoryState.npcInventories[NPC_IDS.MARION_VALE]
    expect(npcInventory[0].slots.find(s => s.itemInstanceId === 'item-weapon-001')).toBeUndefined()
    // Other items should be returned (check by existence, not position)
    expect(npcInventory[0].slots.find(s => s.itemInstanceId === 'item-potion-001')).toBeDefined()
    expect(npcInventory[0].slots.find(s => s.itemInstanceId === 'item-gold-001')).toBeDefined()
  })

  it('adds item registry entries for returned items', () => {
    const state = createGameStateWithConfiscatedItems('rescued')

    const result = applyCaptivityRestitution(state, { npcId: NPC_IDS.MARION_VALE })

    const returnedItem = result.inventoryState.itemRegistry['item-weapon-001']
    expect(returnedItem).toBeDefined()
    expect(returnedItem?.locationType).toBe('npc_inventory')
    expect(returnedItem?.locationId).toBe(NPC_IDS.MARION_VALE)
  })

  it('adds activity log entry for restitution', () => {
    const state = createGameStateWithConfiscatedItems('rescued')

    const result = applyCaptivityRestitution(state, { npcId: NPC_IDS.MARION_VALE })

    const logEntry = result.activityLog.find((entry) => entry.message.includes('belongings returned'))
    expect(logEntry).toBeDefined()
    expect(logEntry?.category).toBe('system')
  })
})