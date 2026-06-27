import { describe, expect, it } from 'vitest'
import { decorateRoom } from './decorateRoom'
import type { GameState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { idaRhysRosterEntry } from './testFixtures'

const PLAYER_ID = 'player'

const baseStudyRoom = {
  roomId: 'room-study',
  name: 'Study',
  state: 'intact' as const,
  repairCost: 0,
  repairDaysRemaining: 0,
  searched: false,
  roomFunction: 'study' as const,
  upgradeTier: 'basic' as const,
  decorStyle: null,
}

const baseHouse = {
  rooms: [baseStudyRoom],
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
  activeDirectives: [],
  pendingDateProposals: [],
  scheduledDates: [],
  npcDateCooldowns: {},
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

describe('decorateRoom', () => {
  it('decorates a room and grants relationship gains', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'warm')

    expect(result.money).toBe(30) // -20 cost
    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.trust).toBe(29) // 25 + 4
    expect(result.relationships[key]?.affinity).toBe(25) // 20 + 5
    const room = result.house.rooms.find((r) => r.roomId === 'room-study')
    expect(room?.decorStyle).toBe('warm')
    expect(result.activityLog.length).toBe(1)
  })

  it('applies vanity bonus for player', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      playerCharacter: {
        ...baseState.playerCharacter,
        traits: { ...baseState.playerCharacter.traits, vanity: 60 },
      },
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'warm')

    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.affinity).toBe(27) // 20 + 7 (base 5 + vanity bonus 2)
  })

  it('applies ambition bonus for NPC with grand decor', () => {
    const state: GameState = {
      ...baseState,
      money: 80,
      roster: [{ ...idaRhysRosterEntry, traits: { ...idaRhysRosterEntry.traits, ambition: 65 } }],
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'grand')

    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.trust).toBe(32) // 25 + 7 (base 5 + ambition bonus 2)
  })

  it('applies prudence bonus for NPC with utilitarian decor', () => {
    const state: GameState = {
      ...baseState,
      money: 30,
      roster: [{ ...idaRhysRosterEntry, traits: { ...idaRhysRosterEntry.traits, prudence: 60 } }],
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'utilitarian')

    const reverseKey = buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)
    expect(result.relationships[reverseKey]?.loyalty).toBe(24) // 20 + 4 (base 3 + prudence bonus 1)
  })

  it('applies empathy bonus for NPC with warm decor', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      roster: [{ ...idaRhysRosterEntry, traits: { ...idaRhysRosterEntry.traits, empathy: 55 } }],
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'warm')

    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.affinity).toBe(27) // 20 + 7 (base 5 + empathy bonus 2)
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

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'warm')

    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.trust).toBe(27) // 25 + 2 (4 * 0.5 = 2, rounded = 2)
    expect(result.relationships[key]?.affinity).toBe(23) // 20 + 3 (5 * 0.5 = 2.5, rounded = 3)
  })

  it('returns unchanged state when not at house', () => {
    const state: GameState = {
      ...baseState,
      currentDistrictId: 'district-harbor',
      money: 50,
    }

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'warm')

    expect(result).toBe(state)
  })

  it('returns unchanged state when room is not intact', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      house: {
        ...baseHouse,
        rooms: [{ ...baseStudyRoom, state: 'damaged' }],
      },
    }

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'warm')

    expect(result).toBe(state)
  })

  it('returns unchanged state when room has no function', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      house: {
        ...baseHouse,
        rooms: [{ ...baseStudyRoom, roomFunction: null }],
      },
    }

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'warm')

    expect(result).toBe(state)
  })

  it('returns unchanged state when insufficient funds', () => {
    const state: GameState = {
      ...baseState,
      money: 10,
    }

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'grand')

    expect(result).toBe(state)
  })

  it('enforces cooldown', () => {
    const state: GameState = {
      ...baseState,
      money: 50,
      lastFiredDay: {
        [`decorateRoom-${idaRhysRosterEntry.npcId}-room-study-10`]: 10,
      },
    }

    const result = decorateRoom(state, 'room-study', idaRhysRosterEntry.npcId, 'warm')

    expect(result).toBe(state)
  })
})
