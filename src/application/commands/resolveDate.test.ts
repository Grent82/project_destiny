import { describe, expect, it } from 'vitest'

import type { GameState } from '../../domain/game/contracts'
import { resolveDate } from './resolveDate'

const baseGameState: GameState = {
  day: 10,
  timeSlot: 'evening',
  money: 500,
  protagonistName: 'Test Player',
  hasSeenOpening: true,
  isFirstRun: false,
  cityDials: {
    control: 60,
    prosperity: 50,
    unrest: 30,
    corruption: 20,
  },
  factionStandings: {
    'faction-civic-compact': 10,
    'faction-gilded-court': 0,
    'faction-foundry-league': 5,
    'faction-tallow-ring': -10,
    'faction-house-merrow': -20,
  },
  factionStates: [],
  districts: [],
  roster: [],
  inventory: [],
  ownedItems: [],
  cityResources: {
    foodSecurity: 70,
    foodStock: 100,
    foodCapacity: 200,
    waterAccess: 80,
    materialStock: 150,
    corridorStatus: 'open',
    corridorClearanceProgressDays: 0,
    activeCoalitions: [],
    coalitionHistory: [],
  },
  activityLog: [],
  selectedSquadNpcIds: [],
  activeCombat: null,
  lastEncounterSummary: null,
  lastResolvedEventSummary: null,
  pendingEvents: [],
  eventInstances: [],
  currentDistrictId: 'district-the-pale',
  availableForHire: [],
  availableQuestLeads: [],
  activeQuests: [],
  completedQuestIds: [],
  failedQuestIds: [],
  questHistory: [],
  councilSeats: {},
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
  expeditionState: {
    status: 'idle',
    destinationId: null,
    squadNpcIds: [],
    suppliesRemaining: 0,
    daysDeparted: 0,
    totalDays: 0,
    encounters: [],
    discoveries: [],
    cityDayAtDeparture: 0,
  },
  householdLore: {
    houseName: 'House Valdris',
    founderName: 'Edric Valdris',
    founderGeneration: 2,
    antagonistFactionId: 'faction-gilded-court',
    missingRelatives: [],
  },
  stash: {
    weapons: [],
    armors: [],
  },
  playerCharacter: {
    name: 'Test Player',
    attributes: {
      might: 50,
      agility: 50,
      endurance: 50,
      intellect: 50,
      perception: 50,
      presence: 50,
      resolve: 50,
    },
    skills: {
      melee: 40,
      ranged: 40,
      medicine: 40,
      administration: 40,
      engineering: 40,
      negotiation: 40,
      survival: 40,
      security: 40,
      crafting: 40,
      performance: 40,
      academics: 40,
      intrigue: 40,
    },
    traits: {
      discipline: 50,
      ambition: 60,
      empathy: 55,
      ruthlessness: 40,
      prudence: 50,
      curiosity: 50,
      dominance: 45,
      loyalty: 60,
      vanity: 30,
      zeal: 40,
    },
    level: 1,
    renown: 0,
  },
  mainQuest: {
    stage: 'searching',
    lastClue: '',
  },
  districtTension: {},
  activeDialogueId: null,
  activeDialogueNodeId: null,
  visitedDialogueNodes: {},
  resolvedDialogueChoices: {},
  house: {
    rooms: [],
    vaultUnlocked: false,
    rosterBonus: 0,
    exteriorState: 'ruined',
    fortificationLevel: 0,
    houseHeirs: [],
    npcPairingPolicy: 'open',
    lastDomesticRelationshipBeat: null,
    relationshipMilestones: [],
  },
  pendingDateProposals: [],
  scheduledDates: [],
  npcDateCooldowns: {},
  saveVersion: 2,
  rngSeed: 42,
  chronicle: {
    entriesByDay: {},
    version: 1,
  },
  rumors: [],
  bondVisibility: {},
  worldNpcStates: [],
  siteRuntimes: {},
  npcCaptivityStates: {},
  npcSitePresences: [],
  bondedPersonsRegistry: {},
  worldEvents: [],
  houseStorageCapacity: 40,
  installedHouseModules: [],
  debtAmount: 800,
  debtClaimantNpcId: 'npc-enemy-harlen-voss',
  debtEnforcementFactionId: 'faction-gilded-court',
  debtBeneficiaryFactionId: 'faction-house-merrow',
  debtDueDay: 30,
  debtPaid: false,
  debtCrisisTriggered: false,
  houseDistrictId: 'district-the-pale',
}

describe('resolveDate', () => {
  it('updates relationship axes when date is resolved', () => {
    const state: GameState = {
      ...baseGameState,
      scheduledDates: [
        {
          dateId: 'date-123',
          npcIds: ['player', 'npc-test'],
          dateTemplateId: 'date-quiet-walk',
          scheduledDay: 10,
          scheduledTimeSlot: 'evening',
          location: null,
          status: 'scheduled',
          outcomeId: null,
        },
      ],
      relationships: {
        'player→npc-test': {
          affinity: 40,
          respect: 30,
          fear: 10,
          trust: 25,
          loyalty: 45,
        },
      },
    }

    const result = resolveDate(state, { dateId: 'date-123', outcomeIndex: 0 })

    const relationship = result.relationships['player→npc-test']
    expect(relationship.affinity).toBe(43) // 40 + 3
    expect(relationship.trust).toBe(27) // 25 + 2
  })

  it('marks date as completed', () => {
    const state: GameState = {
      ...baseGameState,
      scheduledDates: [
        {
          dateId: 'date-123',
          npcIds: ['player', 'npc-test'],
          dateTemplateId: 'date-quiet-walk',
          scheduledDay: 10,
          scheduledTimeSlot: 'evening',
          location: null,
          status: 'scheduled',
          outcomeId: null,
        },
      ],
      relationships: {
        'player→npc-test': {
          affinity: 40,
          respect: 30,
          fear: 10,
          trust: 25,
          loyalty: 45,
        },
      },
    }

    const result = resolveDate(state, { dateId: 'date-123', outcomeIndex: 0 })

    expect(result.scheduledDates[0].status).toBe('completed')
    expect(result.scheduledDates[0].outcomeId).toBe('walk-silent-comfort')
  })

  it('adds activity log entry with outcome text', () => {
    const state: GameState = {
      ...baseGameState,
      scheduledDates: [
        {
          dateId: 'date-123',
          npcIds: ['player', 'npc-test'],
          dateTemplateId: 'date-quiet-walk',
          scheduledDay: 10,
          scheduledTimeSlot: 'evening',
          location: null,
          status: 'scheduled',
          outcomeId: null,
        },
      ],
      relationships: {
        'player→npc-test': {
          affinity: 40,
          respect: 30,
          fear: 10,
          trust: 25,
          loyalty: 45,
        },
      },
    }

    const result = resolveDate(state, { dateId: 'date-123', outcomeIndex: 0 })

    expect(result.activityLog).toHaveLength(1)
    expect(result.activityLog[0].message).toContain('walk together in comfortable silence')
  })

  it('clamps relationship values to 0-100 range', () => {
    const state: GameState = {
      ...baseGameState,
      scheduledDates: [
        {
          dateId: 'date-123',
          npcIds: ['player', 'npc-test'],
          dateTemplateId: 'date-private-ritual',
          scheduledDay: 10,
          scheduledTimeSlot: 'night',
          location: null,
          status: 'scheduled',
          outcomeId: null,
        },
      ],
      relationships: {
        'player→npc-test': {
          affinity: 98,
          respect: 95,
          fear: 5,
          trust: 97,
          loyalty: 96,
        },
      },
    }

    const result = resolveDate(state, { dateId: 'date-123', outcomeIndex: 0 })

    expect(result.relationships['player→npc-test'].affinity).toBe(100) // Would be 108, clamped
  })

  it('advances RNG seed after resolution', () => {
    const state: GameState = {
      ...baseGameState,
      scheduledDates: [
        {
          dateId: 'date-123',
          npcIds: ['player', 'npc-test'],
          dateTemplateId: 'date-quiet-walk',
          scheduledDay: 10,
          scheduledTimeSlot: 'evening',
          location: null,
          status: 'scheduled',
          outcomeId: null,
        },
      ],
      relationships: {
        'player→npc-test': {
          affinity: 40,
          respect: 30,
          fear: 10,
          trust: 25,
          loyalty: 45,
        },
      },
      rngSeed: 42,
    }

    const result = resolveDate(state, { dateId: 'date-123', outcomeIndex: 0 })

    expect(result.rngSeed).not.toBe(42)
  })

  it('handles missing scheduled date gracefully', () => {
    const state: GameState = {
      ...baseGameState,
      scheduledDates: [],
      relationships: {},
    }

    const result = resolveDate(state, { dateId: 'nonexistent', outcomeIndex: 0 })

    expect(result).toBe(state)
  })

  it('applies different outcome deltas based on index', () => {
    const state: GameState = {
      ...baseGameState,
      scheduledDates: [
        {
          dateId: 'date-123',
          npcIds: ['player', 'npc-test'],
          dateTemplateId: 'date-quiet-walk',
          scheduledDay: 10,
          scheduledTimeSlot: 'evening',
          location: null,
          status: 'scheduled',
          outcomeId: null,
        },
      ],
      relationships: {
        'player→npc-test': {
          affinity: 40,
          respect: 30,
          fear: 10,
          trust: 25,
          loyalty: 45,
        },
      },
    }

    const result1 = resolveDate(state, { dateId: 'date-123', outcomeIndex: 0 })
    const result2 = resolveDate(state, { dateId: 'date-123', outcomeIndex: 1 })

    expect(result1.relationships['player→npc-test'].affinity).toBe(43) // outcome 0: +3
    expect(result2.relationships['player→npc-test'].affinity).toBe(45) // outcome 1: +5
  })

  it('handles relationship axes that do not exist yet', () => {
    const state: GameState = {
      ...baseGameState,
      scheduledDates: [
        {
          dateId: 'date-123',
          npcIds: ['player', 'npc-test'],
          dateTemplateId: 'date-quiet-walk',
          scheduledDay: 10,
          scheduledTimeSlot: 'evening',
          location: null,
          status: 'scheduled',
          outcomeId: null,
        },
      ],
      relationships: {},
    }

    const result = resolveDate(state, { dateId: 'date-123', outcomeIndex: 0 })

    const relationship = result.relationships['player→npc-test']
    expect(relationship.affinity).toBe(3)
    expect(relationship.trust).toBe(2)
  })
})
