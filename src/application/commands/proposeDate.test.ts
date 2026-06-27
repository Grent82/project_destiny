import { describe, expect, it } from 'vitest'

import type { GameState } from '../../domain/game/contracts'
import { proposeDateWithPlayer } from './proposeDate'

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
  cityResources: {
    foodSecurity: 70,
    foodStock: 100,
    foodCapacity: 200,
    waterAccess: 80,
    materialStock: 150,
    corridorStatus: 'open',
    corridorClearanceProgressDays: 0,
    activeGroups: [],
    groupHistory: [],
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
  privateCorrespondence: [],
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
  timeSlotState: {
    currentSlot: 'morning',
    slotQueue: [],
    completedTasks: [],
    skippedTasks: [],
    slotHistory: [],
    lastProcessedSeed: 42,
  },
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
  activeDirectives: [],
  debtAmount: 800,
  debtClaimantNpcId: 'npc-enemy-harlen-voss',
  debtEnforcementFactionId: 'faction-gilded-court',
  debtBeneficiaryFactionId: 'faction-house-merrow',
  debtDueDay: 30,
  debtPaid: false,
  debtCrisisTriggered: false,
  houseDistrictId: 'district-the-pale',
}

function createRosterNpc(
  npcId: string,
  name: string,
  intimacyStage: 'none' | 'affinity' | 'attachment' | 'committed' = 'affinity',
  assignment: 'idle' | 'working' | 'deployed' = 'idle',
) {
  // intimacyStage reserved for future NPC intimacy tracking
  void intimacyStage
  return {
    npcId,
    name,
    status: 'citizen' as const,
    assignment,
    assignedDistrictId: null,
    roomAssignment: null,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
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
      ambition: 50,
      empathy: 50,
      ruthlessness: 40,
      prudence: 50,
      curiosity: 50,
      dominance: 45,
      loyalty: 60,
      vanity: 30,
      zeal: 40,
    },
    states: {
      health: 80,
      fatigue: 20,
      stress: 30,
      morale: 70,
      fear: 10,
      anger: 15,
      hunger: 20,
      injury: 0,
      intoxication: 0,
      hygiene: 60,
    },
    loadout: {
      primaryWeaponId: null,
      secondaryWeaponId: null,
      armorId: null,
      accessoryIds: [],
      consumableIds: [],
    },
    equipment: { weapon: null, armor: null, accessory: [] },
    personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
    clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
    npcMemory: [],
    npcArc: null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentIntention: null,
    factionRelationships: [],
    captivityState: undefined,
    pregnancyState: undefined,
    bondStatus: null,
    wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
  }
}

function createRelationshipWithIntimacy(
  npcId: string,
  intimacyStage: 'none' | 'affinity' | 'attachment' | 'committed',
) {
  const axes: { affinity: number; respect: number; fear: number; trust: number; loyalty: number; intimacyStage: 'none' | 'affinity' | 'attachment' | 'committed' } = {
    affinity: 50,
    respect: 40,
    fear: 10,
    trust: 30,
    loyalty: 50,
    intimacyStage: 'none',
  }

  switch (intimacyStage) {
    case 'affinity':
      axes.affinity = 35
      axes.trust = 25
      break
    case 'attachment':
      axes.affinity = 55
      axes.trust = 45
      break
    case 'committed':
      axes.affinity = 75
      axes.trust = 70
      axes.loyalty = 70
      break
    case 'none':
      axes.affinity = 15
      axes.trust = 10
      break
  }

  axes.intimacyStage = intimacyStage

  return {
    [`player→${npcId}`]: axes,
  }
}

describe('proposeDate', () => {
  it('creates a date proposal when relationship is sufficient', () => {
    const state: GameState = {
      ...baseGameState,
      roster: [createRosterNpc('npc-test', 'Test NPC', 'affinity', 'idle')],
      relationships: createRelationshipWithIntimacy('npc-test', 'affinity'),
    }

    const result = proposeDateWithPlayer(state, {
      targetNpcId: 'npc-test',
      dateTemplateId: 'date-quiet-walk',
      proposedDay: 15,
      proposedTimeSlot: 'evening',
      proposedLocation: null,
    })

    expect(result.pendingDateProposals).toHaveLength(1)
    expect(result.pendingDateProposals[0].targetNpcId).toBe('npc-test')
    expect(result.pendingDateProposals[0].status).toBe('accepted')
    expect(result.activityLog).toHaveLength(1)
    expect(result.activityLog[0].message).toContain('Date planned')
  })

  it('rejects proposal when intimacy is too low', () => {
    const state: GameState = {
      ...baseGameState,
      roster: [createRosterNpc('npc-test', 'Test NPC', 'none', 'idle')],
      relationships: createRelationshipWithIntimacy('npc-test', 'none'),
    }

    const result = proposeDateWithPlayer(state, {
      targetNpcId: 'npc-test',
      dateTemplateId: 'date-private-ritual',
      proposedDay: 15,
      proposedTimeSlot: 'night',
      proposedLocation: null,
    })

    expect(result.pendingDateProposals).toHaveLength(0)
    expect(result.activityLog[0].message).toContain('declined')
  })

  it('rejects proposal when NPC is deployed', () => {
    const state: GameState = {
      ...baseGameState,
      roster: [createRosterNpc('npc-test', 'Test NPC', 'affinity', 'deployed')],
      relationships: createRelationshipWithIntimacy('npc-test', 'affinity'),
    }

    const result = proposeDateWithPlayer(state, {
      targetNpcId: 'npc-test',
      dateTemplateId: 'date-quiet-walk',
      proposedDay: 15,
      proposedTimeSlot: 'evening',
      proposedLocation: null,
    })

    expect(result.pendingDateProposals).toHaveLength(0)
    expect(result.activityLog[0].message).toContain('occupied')
  })

  it('respects date cooldown between same NPC', () => {
    const state: GameState = {
      ...baseGameState,
      roster: [createRosterNpc('npc-test', 'Test NPC', 'attachment', 'idle')],
      relationships: createRelationshipWithIntimacy('npc-test', 'attachment'),
      npcDateCooldowns: {
        'npc-test-15': 10,
      },
    }

    const result = proposeDateWithPlayer(state, {
      targetNpcId: 'npc-test',
      dateTemplateId: 'date-quiet-morning',
      proposedDay: 15,
      proposedTimeSlot: 'morning',
      proposedLocation: null,
    })

    expect(result.pendingDateProposals).toHaveLength(0)
    expect(result.activityLog[0].message).toContain('already have plans')
  })

  it('adds cooldown entry when date is accepted', () => {
    const state: GameState = {
      ...baseGameState,
      roster: [createRosterNpc('npc-test', 'Test NPC', 'attachment', 'idle')],
      relationships: createRelationshipWithIntimacy('npc-test', 'attachment'),
    }

    const result = proposeDateWithPlayer(state, {
      targetNpcId: 'npc-test',
      dateTemplateId: 'date-quiet-morning',
      proposedDay: 15,
      proposedTimeSlot: 'morning',
      proposedLocation: null,
    })

    expect(result.pendingDateProposals).toHaveLength(1)
    expect(result.npcDateCooldowns['npc-test-15']).toBe(15)
  })

  it('allows proposal when cooldown has expired', () => {
    const state: GameState = {
      ...baseGameState,
      roster: [createRosterNpc('npc-test', 'Test NPC', 'affinity', 'idle')],
      relationships: createRelationshipWithIntimacy('npc-test', 'affinity'),
      npcDateCooldowns: {
        'npc-test-10': 5,
      },
    }

    const result = proposeDateWithPlayer(state, {
      targetNpcId: 'npc-test',
      dateTemplateId: 'date-quiet-walk',
      proposedDay: 12,
      proposedTimeSlot: 'evening',
      proposedLocation: null,
    })

    expect(result.pendingDateProposals).toHaveLength(1)
  })

  it('rejects when affinity is below threshold', () => {
    const state: GameState = {
      ...baseGameState,
      roster: [createRosterNpc('npc-test', 'Test NPC', 'affinity', 'idle')],
      relationships: {
        ...createRelationshipWithIntimacy('npc-test', 'affinity'),
        ['player→npc-test']: {
          affinity: 20,
          respect: 30,
          fear: 10,
          trust: 15,
          loyalty: 40,
          intimacyStage: 'affinity',
        },
      },
    }

    const result = proposeDateWithPlayer(state, {
      targetNpcId: 'npc-test',
      dateTemplateId: 'date-quiet-walk',
      proposedDay: 15,
      proposedTimeSlot: 'evening',
      proposedLocation: null,
    })

    expect(result.pendingDateProposals).toHaveLength(0)
    expect(result.activityLog[0].message).toContain('hesitant')
  })
})

describe('proposeDateWithPlayer', () => {
  it('is an alias for proposeDate with player as proposer', () => {
    const state: GameState = {
      ...baseGameState,
      roster: [createRosterNpc('npc-test', 'Test NPC', 'affinity', 'idle')],
      relationships: createRelationshipWithIntimacy('npc-test', 'affinity'),
    }

    const result = proposeDateWithPlayer(state, {
      targetNpcId: 'npc-test',
      dateTemplateId: 'date-shared-meal',
      proposedDay: 20,
      proposedTimeSlot: 'evening',
      proposedLocation: null,
    })

    expect(result.pendingDateProposals[0].proposerNpcId).toBe('player')
  })
})
