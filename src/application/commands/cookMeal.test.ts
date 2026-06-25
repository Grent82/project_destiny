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
  cityResources: { foodSecurity: 62, foodStock: 620, foodCapacity: 1000, waterAccess: 70, materialStock: 50, corridorStatus: 'open', corridorClearanceProgressDays: 0, activeCoalitions: [], coalitionHistory: [] },
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
  houseWardSeats: 0,
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
  householdLore: { houseName: 'House Valdris', founderName: 'Test Founder', founderGeneration: 1, antagonistFactionId: 'faction-gilded-court', missingRelatives: [] },
  stash: { weapons: [], armors: [] },
  isFirstRun: false,
  debtAmount: 800,
  debtClaimantNpcId: 'npc-enemy-harlen-voss',
  debtEnforcementFactionId: 'faction-gilded-court',
  debtBeneficiaryFactionId: 'faction-house-merrow',
  debtDueDay: 30,
  debtPaid: false,
  debtCrisisTriggered: false,
  visitedDialogueNodes: {},
  saveVersion: 2,
  rngSeed: 42,
  chronicle: { version: 1, entriesByDay: {} },
  rumors: [],
  bondVisibility: {},
  worldNpcStates: [],
  siteRuntimes: {},
  npcCaptivityStates: {},
  npcSitePresences: [],
  bondedPersonsRegistry: {},
  worldEvents: [],
  mainQuest: { stage: 'searching', lastClue: '' },
  districtTension: {},
  activeDialogueId: null,
  activeDialogueNodeId: null,
  resolvedDialogueChoices: {},
  house: baseHouse,
  playerCharacter: {
    name: 'Test Player',
    attributes: { might: 40, agility: 40, endurance: 40, intellect: 40, perception: 40, presence: 40, resolve: 40 },
    skills: { melee: 15, ranged: 15, medicine: 15, administration: 15, engineering: 15, negotiation: 15, survival: 15, security: 15, crafting: 15, performance: 15, academics: 15, intrigue: 15 },
    traits: { discipline: 40, ambition: 40, empathy: 40, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 40, vanity: 40, zeal: 40 },
    level: 1,
    renown: 0,
  },
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
    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.trust).toBe(27) // 25 + 2
    expect(result.relationships[key]?.affinity).toBe(22) // 20 + 2
    expect(result.activityLog.length).toBe(1)
    expect(result.activityLog[0]!.message).toContain('cook')
    expect(result.activityLog[0]!.message).toContain(idaRhysRosterEntry.name)
  })

  it('cooks a feast with higher gains', () => {
    const state: GameState = {
      ...baseState,
      money: 100,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'feast')

    expect(result.money).toBe(70) // -30 cost
    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.trust).toBe(31) // 25 + 6
    expect(result.relationships[key]?.affinity).toBe(26) // 20 + 6
  })

  it('applies empathy bonus for player', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      playerCharacter: {
        ...baseState.playerCharacter,
        traits: { ...baseState.playerCharacter.traits, empathy: 65 },
      },
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')

    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.trust).toBe(28) // 25 + 3 (base 2 + empathy bonus 1)
  })

  it('applies prudence bonus for NPC', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      roster: [{ ...idaRhysRosterEntry, traits: { ...idaRhysRosterEntry.traits, prudence: 65 } }],
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')

    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.affinity).toBe(23) // 20 + 3 (base 2 + prudence bonus 1)
  })

  it('applies empathy bonus for NPC', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      roster: [{ ...idaRhysRosterEntry, traits: { ...idaRhysRosterEntry.traits, empathy: 55 } }],
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')

    const reverseKey = buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)
    expect(result.relationships[reverseKey]?.loyalty).toBe(22) // 20 + 2 (base 1 + empathy bonus 1)
  })

  it('reduces gains for strained relationship', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: -40, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: -35, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')

    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.trust).toBe(26) // 25 + 1 (2 * 0.5 rounded)
    expect(result.relationships[key]?.affinity).toBe(21) // 20 + 1 (2 * 0.5 rounded)
    expect(result.activityLog[0]!.message).toContain('strained')
  })

  it('returns unchanged state when not at house', () => {
    const state: GameState = {
      ...baseState,
      currentDistrictId: 'district-harbor',
      money: 50,
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')

    expect(result).toBe(state)
  })

  it('returns unchanged state when NPC is deployed', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      roster: [{ ...idaRhysRosterEntry, assignment: 'deployed' }],
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')

    expect(result).toBe(state)
  })

  it('returns unchanged state when kitchen is not intact', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      house: {
        ...baseHouse,
        rooms: [{ ...baseKitchenRoom, state: 'damaged' }],
      },
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')

    expect(result).toBe(state)
  })

  it('returns unchanged state when insufficient funds', () => {
    const state: GameState = {
      ...baseState,
      money: 3,
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')

    expect(result).toBe(state)
  })

  it('enforces cooldown', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      lastFiredDay: {
        [`cookMeal-${idaRhysRosterEntry.npcId}-simple-10`]: 10,
      },
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'simple')

    expect(result).toBe(state)
  })

  it('allows different meal types independently', () => {
    const state: GameState = {
      ...baseState,
      money: 100,
      lastFiredDay: {
        [`cookMeal-${idaRhysRosterEntry.npcId}-simple-10`]: 10,
      },
    }

    const result = cookMeal(state, idaRhysRosterEntry.npcId, 'feast')

    expect(result).not.toBe(state)
    expect(result.money).toBe(70)
  })
})
