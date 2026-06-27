import { describe, expect, it } from 'vitest'
import type { GameState } from '../../domain'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { applyCaptivityConfiscation } from './applyCaptivityConfiscation'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { NPC_IDS } from '../content/ids'

// Fixture: NPC with items in inventory and equipment
const createNpcWithItems = (captivityStatus?: 'captive' | 'missing' | 'rescued' | 'returned'): NpcRuntimeState => ({
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
  attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
  skills: { melee: 40, ranged: 30, medicine: 20, administration: 25, engineering: 15, negotiation: 35, survival: 25, security: 20, crafting: 15, performance: 10, academics: 20, intrigue: 30 },
  traits: { discipline: 50, ambition: 40, empathy: 60, ruthlessness: 30, prudence: 55, curiosity: 45, dominance: 35, loyalty: 70, vanity: 20, zeal: 25 },
  states: { health: 80, fatigue: 30, stress: 25, morale: 60, fear: 20, anger: 15, hunger: 30, injury: 10, intoxication: 0, hygiene: 70 },
  loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
  equipment: { weapon: 'weapon-unique-001', armor: null, accessory: [] },
  personalFunds: { savings: 100, carriedCash: 50, lastWagePaymentDay: null, lastTipAmount: 0 },
  clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
  armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
  arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
  npcMemory: [],
  bondStatus: null,
  npcArc: null,
  currentDirectiveId: null,
  directiveDeadlineDay: null,
  currentIntention: null,
  factionRelationships: [],
  wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
  captivityState: captivityStatus ? { status: captivityStatus, holderId: 'holder-001', siteId: null, roomId: null, regime: 'unknown', condition: 'healthy', compliance: 'resistant', bondType: 'none', timeHeldDays: 0, lastTransferDay: null, questTag: null, confiscatedItems: [], confiscatedMoney: null, confiscatedEquipment: { weapon: null, armor: null, accessory: [] } } : undefined,
})

// Fixture: GameState with NPC and inventory items
const createGameStateWithNpcItems = (captivityStatus?: 'captive' | 'missing' | 'rescued' | 'returned'): GameState => {
  const npc = createNpcWithItems(captivityStatus)
  return {
    ...initialGameStateSnapshot,
    roster: [npc],
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
              { slotId: 'slot-1', itemInstanceId: 'item-weapon-001', quantity: 1 },
              { slotId: 'slot-2', itemInstanceId: 'item-potion-001', quantity: 3 },
              { slotId: 'slot-3', itemInstanceId: 'item-gold-001', quantity: 10 },
            ],
            locked: false,
          },
        ],
      },
      sharedContainers: [],
      itemRegistry: {
        'item-weapon-001': {
          uniqueId: 'item-weapon-001',
          itemId: 'item-iron-sword',
          quantity: 1,
          locationType: 'npc_inventory',
          locationId: NPC_IDS.MARION_VALE,
          acquiredDay: 1,
          acquiredFrom: 'loot',
          flags: [],
        },
        'item-potion-001': {
          uniqueId: 'item-potion-001',
          itemId: 'item-health-potion',
          quantity: 3,
          locationType: 'npc_inventory',
          locationId: NPC_IDS.MARION_VALE,
          acquiredDay: 1,
          acquiredFrom: 'shop',
          flags: [],
        },
        'item-gold-001': {
          uniqueId: 'item-gold-001',
          itemId: 'item-gold-coins',
          quantity: 10,
          locationType: 'npc_inventory',
          locationId: NPC_IDS.MARION_VALE,
          acquiredDay: 1,
          acquiredFrom: 'quest',
          flags: [],
        },
        'weapon-unique-001': {
          uniqueId: 'weapon-unique-001',
          itemId: 'item-steel-blade',
          quantity: 1,
          locationType: 'npc_equipment',
          locationId: NPC_IDS.MARION_VALE,
          equippedSlot: 'weapon',
          acquiredDay: 1,
          acquiredFrom: 'reward',
          flags: [],
        },
      },
    },
  }
}

describe('applyCaptivityConfiscation', () => {
  it('returns unchanged state if NPC has no captivityState', () => {
    const state = createGameStateWithNpcItems() // No captivity status

    const result = applyCaptivityConfiscation(state, { npcId: NPC_IDS.MARION_VALE, captivityType: 'kidnap' })

    expect(result).toEqual(state)
  })

  it('returns unchanged state if NPC is not captive', () => {
    const state = createGameStateWithNpcItems('rescued') // Already rescued

    const result = applyCaptivityConfiscation(state, { npcId: NPC_IDS.MARION_VALE, captivityType: 'kidnap' })

    expect(result).toEqual(state)
  })

  it('confiscates all items for kidnap type', () => {
    const state = createGameStateWithNpcItems('captive')

    const result = applyCaptivityConfiscation(state, { npcId: NPC_IDS.MARION_VALE, captivityType: 'kidnap' })

    // NPC inventory should be empty
    const npcInventory = result.inventoryState.npcInventories[NPC_IDS.MARION_VALE]
    expect(npcInventory).toBeDefined()
    expect(npcInventory[0].slots).toHaveLength(3)
    expect(npcInventory[0].slots[0].itemInstanceId).toBeNull()
    expect(npcInventory[0].slots[1].itemInstanceId).toBeNull()
    expect(npcInventory[0].slots[2].itemInstanceId).toBeNull()

    // Equipment should be removed
    expect(result.roster[0].equipment.weapon).toBeNull()

    // Personal funds should be confiscated
    expect(result.roster[0].personalFunds.savings).toBe(0)
    expect(result.roster[0].personalFunds.carriedCash).toBe(0)

    // Activity log should have confiscation entry
    const logEntry = result.activityLog.find((entry) => entry.message.includes('confiscated'))
    expect(logEntry).toBeDefined()
  })

  it('confiscates weapons and money for imprisonment type', () => {
    const state = createGameStateWithNpcItems('captive')

    const result = applyCaptivityConfiscation(state, { npcId: NPC_IDS.MARION_VALE, captivityType: 'imprisonment' })

    // Weapons should be confiscated from equipment
    expect(result.roster[0].equipment.weapon).toBeNull()

    // Money should be confiscated
    expect(result.roster[0].personalFunds.savings).toBe(0)
    expect(result.roster[0].personalFunds.carriedCash).toBe(0)

    // Non-weapon items should remain in inventory
    const npcInventory = result.inventoryState.npcInventories[NPC_IDS.MARION_VALE]
    const potionSlot = npcInventory[0].slots.find((slot) => slot.itemInstanceId === 'item-potion-001')
    expect(potionSlot?.itemInstanceId).toBe('item-potion-001')

    // The weapon item slot should now be empty (null)
    const weaponSlotIndex = npcInventory[0].slots.findIndex((slot) => slot.slotId === 'slot-1')
    expect(npcInventory[0].slots[weaponSlotIndex].itemInstanceId).toBeNull()
  })

  it('confiscates only weapons for arrest type', () => {
    const state = createGameStateWithNpcItems('captive')

    const result = applyCaptivityConfiscation(state, { npcId: NPC_IDS.MARION_VALE, captivityType: 'arrest' })

    // Equipment weapon should be removed
    expect(result.roster[0].equipment.weapon).toBeNull()

    // Money should remain
    expect(result.roster[0].personalFunds.savings).toBe(100)
    expect(result.roster[0].personalFunds.carriedCash).toBe(50)

    // Non-weapon items should remain
    const npcInventory = result.inventoryState.npcInventories[NPC_IDS.MARION_VALE]
    const potionSlot = npcInventory[0].slots.find((slot) => slot.itemInstanceId === 'item-potion-001')
    expect(potionSlot?.itemInstanceId).toBe('item-potion-001')
  })

  it('does not confiscate items for search type', () => {
    const state = createGameStateWithNpcItems('captive')

    const result = applyCaptivityConfiscation(state, { npcId: NPC_IDS.MARION_VALE, captivityType: 'search' })

    // All items should remain
    const npcInventory = result.inventoryState.npcInventories[NPC_IDS.MARION_VALE]
    expect(npcInventory[0].slots[0].itemInstanceId).toBe('item-weapon-001')
    expect(npcInventory[0].slots[1].itemInstanceId).toBe('item-potion-001')
    expect(npcInventory[0].slots[2].itemInstanceId).toBe('item-gold-001')

    // Equipment should remain
    expect(result.roster[0].equipment.weapon).toBe('weapon-unique-001')

    // Money should remain
    expect(result.roster[0].personalFunds.savings).toBe(100)
    expect(result.roster[0].personalFunds.carriedCash).toBe(50)
  })

  it('gives basic clothes when confiscating all items', () => {
    const state = createGameStateWithNpcItems('captive')

    const result = applyCaptivityConfiscation(state, { npcId: NPC_IDS.MARION_VALE, captivityType: 'kidnap' })

    // Clothing should be set to basic garments
    expect(result.roster[0].clothing.torso).toBeDefined()
    expect(result.roster[0].clothing.legs).toBeDefined()
  })

  it('updates captivityState with confiscation timestamp', () => {
    const state = createGameStateWithNpcItems('captive')

    const result = applyCaptivityConfiscation(state, { npcId: NPC_IDS.MARION_VALE, captivityType: 'kidnap' })

    expect(result.roster[0].captivityState?.lastTransferDay).toBe(state.day)
  })
})
