import { describe, expect, it } from 'vitest'
import { createRumorForNakedNpc, buildNakedNpcRumor } from './createRumorForNakedNpc'
import type { GameState } from '../../domain'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

// Minimal game state fixture
function createGameState(roster: NpcRuntimeState[]): GameState {
  return {
    day: 10,
    timeSlot: 'morning',
    money: 1000,
    protagonistName: 'Test Player',
    hasSeenOpening: false,
    cityDials: { control: 50, prosperity: 50, unrest: 50, corruption: 50 },
    currentDistrictId: 'the-pale',
    roster,
    house: {
      rooms: [],
      foodStock: 100,
      morale: 50,
    },
    cityResources: {
      foodSecurity: 70,
      foodStock: 500,
      foodCapacity: 1000,
      waterAccess: 80,
      materialStock: 60,
      corridorStatus: 'open',
      corridorClearanceProgressDays: 0,
      activeGroups: [],
      groupHistory: [],
    },
    rumors: [],
    factions: [],
    quests: [],
    events: [],
    pendingEvents: [],
    activeCombatState: null,
    expeditionState: null,
    councilSeats: [],
    councilVoteEvents: [],
    institutionalTier: 'basic',
    relationships: [],
    intimacyState: null,
    districtStates: [],
    chronicle: [],
    activityLog: [],
    worldNpcStates: [],
    siteStates: [],
    rngSeed: 12345,
   npcMemoryIndex: {},
    bondVisibilities: [],
  } as unknown as GameState
}

// Create a naked NPC fixture
function createNakedNpc(npcId: string, name: string): NpcRuntimeState {
  return {
    npcId,
    name,
    status: 'citizen',
    assignment: 'idle',
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
      melee: 50,
      ranged: 50,
      medicine: 50,
      administration: 50,
      engineering: 50,
      negotiation: 50,
      survival: 50,
      security: 50,
      crafting: 50,
      performance: 50,
      academics: 50,
      intrigue: 50,
    },
    traits: {
      discipline: 50,
      ambition: 50,
      empathy: 50,
      ruthlessness: 50,
      prudence: 50,
      curiosity: 50,
      dominance: 50,
      loyalty: 50,
      vanity: 50,
      zeal: 50,
    },
    states: {
      health: 100,
      fatigue: 0,
      stress: 0,
      morale: 100,
      fear: 0,
      anger: 0,
      hunger: 0,
      injury: 0,
      intoxication: 0,
      hygiene: 0,
    },
    loadout: {
      primaryWeaponId: null,
      secondaryWeaponId: null,
      armorId: null,
      accessoryIds: [],
      consumableIds: [],
    },
    equipment: {
      weapon: null,
      armor: null,
      accessory: [],
    },
    personalFunds: {
      savings: 0,
      carriedCash: 0,
      lastWagePaymentDay: null,
      lastTipAmount: 0,
    },
    clothing: {
      head: null,
      torso: null,
      arms: null,
      legs: null,
      feet: null,
      full: null,
      undergarments: null,
      accessories: [],
    },
    armor: {
      lightTorso: null,
      lightLegs: null,
      heavyTorso: null,
      heavyLegs: null,
      shield: null,
    },
    npcMemory: [],
    bondStatus: null,
    npcArc: null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentEmployment: null,
    currentIntention: null,
    factionRelationships: [],
    wardPersonalAllowance: {
      allowancePerWeek: 2,
      personalSavings: 0,
      lastAllowanceDay: null,
      allowedItems: [],
      restrictedItems: [],
    },
    arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
    bondStatus: null,
    npcArc: null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentIntention: null,
    captivityState: undefined,
    pregnancyState: undefined,
  }
}

// Create a clothed NPC fixture
function createClothedNpc(npcId: string, name: string): NpcRuntimeState {
  const npc = createNakedNpc(npcId, name)
  npc.clothing.torso = 'shirt-001'
  npc.clothing.legs = 'pants-001'
  return npc
}

describe('createRumorForNakedNpc', () => {
  it('creates a rumor when NPC is naked', () => {
    const nakedNpc = createNakedNpc('npc-test-1', 'Test NPC')
    const state = createGameState([nakedNpc])

    const result = createRumorForNakedNpc(state, {
      npcId: 'npc-test-1',
      districtId: 'the-pale',
      day: 10,
    })

    expect(result.rumors).toHaveLength(1)
    expect(result.rumors[0].text).toContain('wurde nackt auf der Strasse gesehen')
    expect(result.rumors[0].subjectNpcIds).toContain('npc-test-1')
    expect(result.rumors[0].heat).toBe(50)
    expect(result.rumors[0].credibility).toBe(80)
  })

  it('returns state unchanged when NPC is not naked', () => {
    const clothedNpc = createClothedNpc('npc-test-2', 'Clothed NPC')
    const state = createGameState([clothedNpc])

    const result = createRumorForNakedNpc(state, {
      npcId: 'npc-test-2',
      districtId: 'the-pale',
      day: 10,
    })

    expect(result.rumors).toHaveLength(0)
  })

  it('returns state unchanged when NPC is not found in roster', () => {
    const state = createGameState([])

    const result = createRumorForNakedNpc(state, {
      npcId: 'non-existent-npc',
      districtId: 'the-pale',
      day: 10,
    })

    expect(result.rumors).toHaveLength(0)
  })

  it('deduplicates existing rumors', () => {
    const nakedNpc = createNakedNpc('npc-test-3', 'Test NPC 3')
    const existingRumor = {
      id: 'naked-npc-npc-test-3-the-pale-d10',
      kind: 'ambient' as const,
      source: 'generated' as const,
      districtId: 'the-pale',
      originNpcId: null,
      templateId: null,
      text: 'Test NPC 3 wurde nackt auf der Strasse gesehen',
      subjectNpcIds: ['npc-test-3'],
      truth: 'true' as const,
      credibility: 80,
      heat: 50,
      createdDay: 10,
      lastSpreadDay: 10,
    }
    const state = createGameState([nakedNpc])
    state.rumors = [existingRumor]

    const result = createRumorForNakedNpc(state, {
      npcId: 'npc-test-3',
      districtId: 'the-pale',
      day: 10,
    })

    expect(result.rumors).toHaveLength(1) // Should not add duplicate
  })

  it('uses NPC id as fallback when name not in catalog', () => {
    const nakedNpc = createNakedNpc('npc-ida', 'Ida Rhys')
    const state = createGameState([nakedNpc])

    const result = createRumorForNakedNpc(state, {
      npcId: 'npc-ida',
      districtId: 'merchant-quarter',
      day: 15,
    })

    // Without content catalog setup, falls back to npcId
    expect(result.rumors[0].text).toBe('npc-ida wurde nackt auf der Strasse gesehen')
  })

  it('creates rumor with correct district ID', () => {
    const nakedNpc = createNakedNpc('npc-test-4', 'Test NPC 4')
    const state = createGameState([nakedNpc])

    const result = createRumorForNakedNpc(state, {
      npcId: 'npc-test-4',
      districtId: 'undercity',
      day: 20,
    })

    expect(result.rumors[0].districtId).toBe('undercity')
  })

  it('creates rumor with correct day', () => {
    const nakedNpc = createNakedNpc('npc-test-5', 'Test NPC 5')
    const state = createGameState([nakedNpc])

    const result = createRumorForNakedNpc(state, {
      npcId: 'npc-test-5',
      districtId: 'the-pale',
      day: 25,
    })

    expect(result.rumors[0].createdDay).toBe(25)
    expect(result.rumors[0].lastSpreadDay).toBe(25)
  })
})

describe('buildNakedNpcRumor', () => {
  it('returns null when NPC is not naked', () => {
    const clothedNpc = createClothedNpc('npc-test-6', 'Clothed NPC 6')
    const roster = [clothedNpc]

    const result = buildNakedNpcRumor('npc-test-6', 'the-pale', 10, roster)

    expect(result).toBeNull()
  })

  it('returns null when NPC is not found', () => {
    const roster: NpcRuntimeState[] = []

    const result = buildNakedNpcRumor('non-existent', 'the-pale', 10, roster)

    expect(result).toBeNull()
  })

  it('generates correct rumor ID', () => {
    const nakedNpc = createNakedNpc('npc-mira', 'Mira')
    const roster = [nakedNpc]

    const result = buildNakedNpcRumor('npc-mira', 'sewers', 42, roster)

    expect(result?.id).toBe('naked-npc-npc-mira-sewers-d42')
  })
})
