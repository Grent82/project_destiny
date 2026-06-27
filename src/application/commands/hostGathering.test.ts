import { describe, expect, it } from 'vitest'
import { hostGathering } from './hostGathering'
import type { GameState, NpcRuntimeState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { idaRhysRosterEntry } from './testFixtures'

const PLAYER_ID = 'player'

const baseReceptionRoom = {
  roomId: 'room-reception',
  name: 'Reception Hall',
  state: 'intact' as const,
  repairCost: 0,
  repairDaysRemaining: 0,
  searched: false,
  roomFunction: 'reception' as const,
  upgradeTier: 'basic' as const,
  decorStyle: null,
}

const baseHouse = {
  rooms: [baseReceptionRoom],
  vaultUnlocked: false,
  rosterBonus: 0,
  exteriorState: 'ruined' as const,
  fortificationLevel: 0,
  houseHeirs: [],
  npcPairingPolicy: 'open' as const,
  lastDomesticRelationshipBeat: null,
  relationshipMilestones: [],
}

const createBaseState = (roster: NpcRuntimeState[] = [idaRhysRosterEntry]): GameState => ({
  day: 10,
  timeSlot: 'evening',
  money: 100,
  protagonistName: 'Test Player',
  hasSeenOpening: true,
  cityDials: { control: 50, prosperity: 50, unrest: 50, corruption: 50 },
  factionStandings: { 'faction-civic-compact': 10, 'faction-gilded-court': -65, 'faction-foundry-league': 5, 'faction-tallow-ring': 15, 'faction-restored': 0, 'faction-house-merrow': -15 },
  factionStates: [],
  districts: [],
  roster,
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
  timeSlotState: {
    currentSlot: 'morning',
    slotQueue: [],
    completedTasks: [],
    skippedTasks: [],
    slotHistory: [],
    lastProcessedSeed: 42,
  },
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
})

describe('hostGathering', () => {
  it('hosts a quiet conversation and grants relationship gains', () => {
    const state: GameState = {
      ...createBaseState(),
      money: 50,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = hostGathering(state, 'quietConversation', [idaRhysRosterEntry.npcId])

    expect(result.money).toBe(50) // no cost
    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.trust).toBe(29) // 25 + 4
    expect(result.relationships[key]?.affinity).toBe(22) // 20 + 2
    expect(result.activityLog.length).toBe(1)
  })

  it('hosts a music night with higher affinity gains', () => {
    const state: GameState = {
      ...createBaseState(),
      money: 100,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = hostGathering(state, 'musicNight', [idaRhysRosterEntry.npcId])

    expect(result.money).toBe(80) // -20 cost
    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.affinity).toBe(26) // 20 + 6
  })

  it('applies performance skill bonus for player', () => {
    const state: GameState = {
      ...createBaseState(),
      money: 100,
      playerCharacter: {
        ...createBaseState().playerCharacter,
        skills: { ...createBaseState().playerCharacter.skills, performance: 65 },
      },
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = hostGathering(state, 'musicNight', [idaRhysRosterEntry.npcId])

    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.affinity).toBe(28) // 20 + 8 (base 6 + performance bonus 2)
  })

  it('applies empathy bonus for player with quiet conversation', () => {
    const state: GameState = {
      ...createBaseState(),
      money: 50,
      playerCharacter: {
        ...createBaseState().playerCharacter,
        traits: { ...createBaseState().playerCharacter.traits, empathy: 60 },
      },
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = hostGathering(state, 'quietConversation', [idaRhysRosterEntry.npcId])

    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.trust).toBe(31) // 25 + 6 (base 4 + empathy bonus 2)
  })

  it('applies curiosity bonus for NPC with storytelling', () => {
    const state: GameState = {
      ...createBaseState([{ ...idaRhysRosterEntry, traits: { ...idaRhysRosterEntry.traits, curiosity: 55 } }]),
      money: 50,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = hostGathering(state, 'storytelling', [idaRhysRosterEntry.npcId])

    const key = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    expect(result.relationships[key]?.trust).toBe(28) // 25 + 3 (base 2 + curiosity bonus 1)
  })

  it('applies empathy bonus for NPC', () => {
    const state: GameState = {
      ...createBaseState([{ ...idaRhysRosterEntry, traits: { ...idaRhysRosterEntry.traits, empathy: 55 } }]),
      money: 50,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
      },
    }

    const result = hostGathering(state, 'sharedDrink', [idaRhysRosterEntry.npcId])

    const reverseKey = buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)
    expect(result.relationships[reverseKey]?.loyalty).toBe(22) // 20 + 2 (base 2)
  })

  it('hosts gathering with multiple NPCs', () => {
    const npc2: NpcRuntimeState = {
      ...idaRhysRosterEntry,
      npcId: 'npc-test-2',
      name: 'Test NPC 2',
    }

    const state: GameState = {
      ...createBaseState([idaRhysRosterEntry, npc2]),
      money: 100,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)]: { affinity: 20, respect: 30, fear: 10, trust: 25, loyalty: 15 },
        [buildRelationshipKey(idaRhysRosterEntry.npcId, PLAYER_ID)]: { affinity: 15, respect: 25, fear: 5, trust: 20, loyalty: 20 },
        [buildRelationshipKey(PLAYER_ID, npc2.npcId)]: { affinity: 10, respect: 20, fear: 5, trust: 15, loyalty: 10 },
        [buildRelationshipKey(npc2.npcId, PLAYER_ID)]: { affinity: 8, respect: 15, fear: 3, trust: 12, loyalty: 8 },
      },
    }

    const result = hostGathering(state, 'storytelling', [idaRhysRosterEntry.npcId, npc2.npcId])

    expect(result.money).toBe(95) // -5 cost
    const key1 = buildRelationshipKey(PLAYER_ID, idaRhysRosterEntry.npcId)
    const key2 = buildRelationshipKey(PLAYER_ID, npc2.npcId)
    expect(result.relationships[key1]?.affinity).toBe(25) // 20 + 5
    expect(result.relationships[key2]?.affinity).toBe(15) // 10 + 5
  })

  it('returns unchanged state when not at house', () => {
    const state: GameState = {
      ...createBaseState(),
      currentDistrictId: 'district-harbor',
      money: 50,
    }

    const result = hostGathering(state, 'quietConversation', [idaRhysRosterEntry.npcId])

    expect(result).toBe(state)
  })

  it('returns unchanged state when NPC is deployed', () => {
    const state: GameState = {
      ...createBaseState([{ ...idaRhysRosterEntry, assignment: 'deployed' }]),
      money: 50,
    }

    const result = hostGathering(state, 'quietConversation', [idaRhysRosterEntry.npcId])

    expect(result).toBe(state)
  })

  it('returns unchanged state when no suitable room', () => {
    const state: GameState = {
      ...createBaseState(),
      money: 50,
      house: {
        ...baseHouse,
        rooms: [],
      },
    }

    const result = hostGathering(state, 'quietConversation', [idaRhysRosterEntry.npcId])

    expect(result).toBe(state)
  })

  it('returns unchanged state when insufficient funds', () => {
    const state: GameState = {
      ...createBaseState(),
      money: 5,
    }

    const result = hostGathering(state, 'musicNight', [idaRhysRosterEntry.npcId])

    expect(result).toBe(state)
  })

  it('enforces cooldown', () => {
    const state: GameState = {
      ...createBaseState(),
      money: 50,
      lastFiredDay: {
        [`hostGathering-quietConversation-10`]: 10,
      },
    }

    const result = hostGathering(state, 'quietConversation', [idaRhysRosterEntry.npcId])

    expect(result).toBe(state)
  })

  it('allows different gathering types independently', () => {
    const state: GameState = {
      ...createBaseState(),
      money: 100,
      lastFiredDay: {
        [`hostGathering-quietConversation-10`]: 10,
      },
    }

    const result = hostGathering(state, 'musicNight', [idaRhysRosterEntry.npcId])

    expect(result).not.toBe(state)
    expect(result.money).toBe(80)
  })

  it('rejects more than 4 NPCs', () => {
    const extraNpcs = [
      { ...idaRhysRosterEntry, npcId: 'npc-test-2', name: 'Test NPC 2' },
      { ...idaRhysRosterEntry, npcId: 'npc-test-3', name: 'Test NPC 3' },
      { ...idaRhysRosterEntry, npcId: 'npc-test-4', name: 'Test NPC 4' },
      { ...idaRhysRosterEntry, npcId: 'npc-test-5', name: 'Test NPC 5' },
    ]

    const state: GameState = {
      ...createBaseState([idaRhysRosterEntry, ...extraNpcs]),
      money: 50,
    }

    const result = hostGathering(state, 'quietConversation', [
      idaRhysRosterEntry.npcId,
      ...extraNpcs.map((n) => n.npcId),
    ])

    expect(result).toBe(state)
  })
})
