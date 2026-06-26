import { describe, expect, it } from 'vitest'
import { cookMeal } from './cookMeal'
import type { GameState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { idaRhysRosterEntry } from './testFixtures'

const PLAYER_ID = 'player'

const baseKitchenRoom = {
  roomId: 'room-kitchen',
  name: 'Kitchen',
  state: 'intact' as const,
  repairCost: 0,
  repairDaysRemaining: 0,
  searched: false,
  roomFunction: 'kitchen' as const,
  upgradeTier: 'basic' as const,
  decorStyle: null,
}

const baseHouse = {
  rooms: [baseKitchenRoom],
  vaultUnlocked: false,
  rosterBonus: 0,
  exteriorState: 'ruined' as const,
  fortificationLevel: 0,
  houseHeirs: [],
  npcPairingPolicy: 'open' as const,
  lastDomesticRelationshipBeat: null,
  relationshipMilestones: [],
}

const baseState: GameState = {
  day: 10,
  timeSlot: 'evening',
  money: 100,
  protagonistName: 'Test Player',
  hasSeenOpening: true,
  cityDials: { control: 50, prosperity: 50, unrest: 50, corruption: 50 },
  factionStandings: { 'faction-civic-compact': 10, 'faction-gilded-court': -65, 'faction-foundry-league': 5, 'faction-tallow-ring': 15, 'faction-restored': 0, 'faction-house-merrow': -15 },
  factionStates: [],
  districts: [],
  roster: [idaRhysRosterEntry],
  inventory: [],
  ownedItems: [],
  houseStorageCapacity: 40,
  installedHouseModules: [],
  inventoryState: {
    player: {
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
      bagContainers: [],
      totalBagSlots: 40,
      usedBagSlots: 0,
    },
    npcInventories: {},
    sharedContainers: [],
    itemRegistry: {},
  },
  cityResources: { foodSecurity: 62, foodStock: 620, foodCapacity: 1000, waterAccess: 70, materialStock: 50, corridorStatus: 'open', corridorClearanceProgressDays: 0, activeGroups: [], groupHistory: [] },
  activityLog: [],
  selectedSquadNpcIds: [],
  activeCombat: null,
  lastEncounterSummary: null,
  lastResolvedEventSummary: null,
  pendingEvents: [],
  eventInstances: [],
  currentDistrictId: 'district-the-pale',
  houseDistrictId: 'district-the-pale',
  availableForHire: [],
  availableQuestLeads: [],
  activeQuests: [],
  completedQuestIds: [],
  failedQuestIds: [],
  questHistory: [],
  councilSeats: { 'faction-civic-compact': 3, 'faction-gilded-court': 2, 'faction-foundry-league': 2, 'faction-tallow-ring': 0, 'faction-restored': 0 },
  institutionalStanding: {},
  activeCouncilVotes: [],
  relationships: {},
  equippedItemDurabilities: {},
  activeInvestigation: null,
  lastInvestigationResult: null,
  pendingConsumableDecision: null,
  lastFiredDay: {},
  rivalOrgActions: [],
  cityStability: 60,
  expeditionState: { status: 'idle', destinationId: null, squadNpcIds: [], suppliesRemaining: 0, daysDeparted: 0, totalDays: 0, encounters: [], discoveries: [], cityDayAtDeparture: 0 },
  householdLore: { houseName: 'House Test', founderName: 'Test Founder', founderGeneration: 1, antagonistFactionId: 'faction-gilded-court', missingRelatives: [] },
  stash: { weapons: [], armors: [] },
  playerCharacter: { name: 'Test', attributes: { might: 40, agility: 40, endurance: 40, intellect: 40, perception: 40, presence: 40, resolve: 40 }, skills: { melee: 15, ranged: 15, medicine: 15, administration: 15, engineering: 15, negotiation: 15, survival: 15, security: 15, crafting: 15, performance: 15, academics: 15, intrigue: 15 }, traits: { discipline: 40, ambition: 40, empathy: 40, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 40, vanity: 40, zeal: 40 }, level: 1, renown: 0 },
  mainQuest: { stage: 'searching', lastClue: '' },
  districtTension: {},
  activeDialogueId: null,
  activeDialogueNodeId: null,
  visitedDialogueNodes: {},
  resolvedDialogueChoices: {},
  house: baseHouse,
  saveVersion: 2,
  rngSeed: 42,
  chronicle: { entriesByDay: {}, version: 1 },
  rumors: [],
  bondVisibility: {},
  worldNpcStates: [],
  siteRuntimes: {},
  npcCaptivityStates: {},
  npcSitePresences: [],
  bondedPersonsRegistry: {},
  worldEvents: [],
  activeDirectives: [],
  pendingDateProposals: [],
  scheduledDates: [],
  npcDateCooldowns: {},
  houseWardSeats: 0,
  debtAmount: 800,
  debtClaimantNpcId: 'npc-enemy-harlen-voss',
  debtEnforcementFactionId: 'faction-gilded-court',
  debtBeneficiaryFactionId: 'faction-house-merrow',
  debtDueDay: 30,
  debtPaid: false,
  debtCrisisTriggered: false,
  isFirstRun: false,
}

describe('cookMeal', () => {
  it('cooks a simple meal and grants relationship gains', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')

    expect(result.money).toBe(45) // -5 cost
    expect(result.activityLog).toHaveLength(1)
    expect(result.activityLog[0]!.message).toContain('a simple meal')
  })

  it('requires the NPC to be in the house', () => {
    const state: GameState = {
      ...baseState,
      roster: [
        { ...idaRhysRosterEntry, roomAssignment: null },
      ],
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')
    expect(result.roster[0]!.roomAssignment).toBeNull() // NPC still not in house
  })

  it('cooks a lavish meal for higher cost and better relationship gains', () => {
    const state: GameState = {
      ...baseState,
      money: 100,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'hearty')

    expect(result.money).toBe(85) // -15 cost
    expect(result.activityLog[0]!.message).toContain('hearty meal')
  })
})
