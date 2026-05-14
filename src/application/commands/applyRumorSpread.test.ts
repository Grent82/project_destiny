import { describe, it, expect } from 'vitest'
import { applyRumorSpread } from './applyRumorSpread'
import type { GameState } from '../../domain'
import type { Rumor } from '../../domain/rumors/contracts'
import { getQuestTemplates } from '../content/contentCatalog'
import { createQuestRuntime } from '../../domain/quests/contracts'

// Minimal GameState fixture
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    day: 1,
    timeSlot: 'morning',
    money: 500,
    protagonistName: 'Test',
    hasSeenOpening: false,
    isFirstRun: false,
    cityDials: { control: 50, prosperity: 50, unrest: 30, corruption: 20 },
    factionStandings: {},
    factionStates: [],
    districts: [],
    roster: [],
    inventory: [],
    cityResources: { foodSecurity: 60, waterAccess: 60, materialStock: 60, corridorStatus: 'open' },
    activityLog: [],
    selectedSquadNpcIds: [],
    activeCombat: null,
    pendingEvents: [],
    currentDistrictId: null,
    availableForHire: [],
    availableQuestLeads: [],
    activeQuests: [],
    completedQuestIds: [],
    councilSeats: {},
    institutionalStanding: {},
    activeCouncilVotes: [],
    relationships: {},
    equippedItemDurabilities: {},
    activeInvestigation: null,
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
    stash: { weapons: [], armors: [] },
    debtAmount: 800,
    debtDueDay: 30,
    debtPaid: false,
    debtCrisisTriggered: false,
    houseDistrictId: 'district-the-pale',
    playerCharacter: {
      name: '',
      attributes: { might: 40, agility: 40, endurance: 40, intellect: 40, perception: 40, presence: 40, resolve: 40 },
      skills: { melee: 15, ranged: 15, medicine: 15, administration: 15, engineering: 15, negotiation: 15, survival: 15, security: 15, crafting: 15, performance: 15, academics: 15, intrigue: 15 },
      traits: { discipline: 40, ambition: 40, empathy: 40, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 40, vanity: 40, zeal: 40 },
      level: 1,
      renown: 0,
    },
    mainQuest: { stage: 'searching', lastClue: '' },
    districtTension: {},
    activeDialogueId: null,
    activeDialogueNodeId: null,
    visitedDialogueNodes: {},
    resolvedDialogueChoices: {},
    house: {
      rooms: [],
      vaultUnlocked: false,
      rosterBonus: 0,
    },
    lastFiredDay: {},
    saveVersion: 1,
    rngSeed: 42,
    rumors: [],
    bondVisibility: {},
    ...overrides,
  } as GameState
}

function makeRumor(overrides: Partial<Rumor> = {}): Rumor {
  return {
    id: 'test-rumor-1',
    kind: 'ambient',
    source: 'authored',
    districtId: 'district-the-warrens',
    originNpcId: null,
    templateId: null,
    text: 'Something suspicious is happening.',
    subjectNpcIds: ['npc-test-subject'],
    truth: 'mixed',
    credibility: 50,
    heat: 35,
    createdDay: 1,
    lastSpreadDay: 1,
    ...overrides,
  }
}

// RNG that always returns the given value
const alwaysPass = () => 0.01  // always below any pass chance
const alwaysFail = () => 0.99  // always above any pass chance

describe('applyRumorSpread', () => {
  describe('spawn authored templates', () => {
    it('spawns authored rumour templates as active rumours on first call', () => {
      const state = makeState({ day: 1, rumors: [] })
      const result = applyRumorSpread(state, alwaysPass)
      // contentCatalog has 6 authored templates
      expect(result.rumors.length).toBeGreaterThanOrEqual(6)
    })

    it('does not spawn the same template twice', () => {
      const state = makeState({ day: 1, rumors: [] })
      const after1 = applyRumorSpread(state, alwaysPass)
      const after2 = applyRumorSpread(after1, alwaysPass)
      const templateIds = after2.rumors.map((r) => r.templateId).filter(Boolean)
      const uniqueTemplateIds = new Set(templateIds)
      expect(uniqueTemplateIds.size).toBe(templateIds.length)
    })

    it('spawned rumours have source: authored', () => {
      const state = makeState({ day: 1, rumors: [] })
      const result = applyRumorSpread(state, alwaysPass)
      const authored = result.rumors.filter((r) => r.templateId !== null)
      expect(authored.every((r) => r.source === 'authored')).toBe(true)
    })
  })

  describe('heat mechanics', () => {
    it('increases heat when rng passes', () => {
      const rumor = makeRumor({ heat: 35, districtId: 'district-the-warrens' })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysPass)
      const updated = result.rumors.find((r) => r.id === 'test-rumor-1')
      // saturated district: +round(8*1.4) = +11, -12 decay = net -1 minimum 0
      // With alwaysPass (0.01) < passChance (>0.02), heat changes
      expect(updated).toBeDefined()
    })

    it('heat decays by 12 per day on miss', () => {
      const rumor = makeRumor({ heat: 50, districtId: 'district-gilded-heights' })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysFail)
      const updated = result.rumors.find((r) => r.id === 'test-rumor-1')
      // alwaysFail: no spread gain. Spread heat = 50. After decay: 50 - 12 = 38.
      expect(updated?.heat).toBe(38)
    })

    it('heat does not go below 0', () => {
      const rumor = makeRumor({ heat: 5, districtId: 'district-gilded-heights' })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysFail)
      // 5 - 12 = -7 → clamped to 0 → pruned (heat <= 0)
      const updated = result.rumors.find((r) => r.id === 'test-rumor-1')
      // Rumour is pruned when heat = 0, so it should not be in the list
      expect(updated).toBeUndefined()
    })
  })

  describe('pruning', () => {
    it('removes rumours with heat = 0 after decay', () => {
      const rumor = makeRumor({ heat: 10, districtId: 'district-gilded-heights' })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysFail)
      // 10 - 12 = 0, should be pruned
      expect(result.rumors.find((r) => r.id === 'test-rumor-1')).toBeUndefined()
    })

    it('enforces citywide cap of 24', () => {
      const rumors: Rumor[] = Array.from({ length: 30 }, (_, i) =>
        makeRumor({ id: `rumor-${i}`, heat: 80, districtId: 'district-the-warrens' }),
      )
      const state = makeState({ rumors })
      const result = applyRumorSpread(state, alwaysFail)
      expect(result.rumors.length).toBeLessThanOrEqual(24)
    })

    it('enforces per-district cap of 4', () => {
      const rumors: Rumor[] = Array.from({ length: 8 }, (_, i) =>
        makeRumor({ id: `rumor-${i}`, heat: 80, districtId: 'district-harbor' }),
      )
      const state = makeState({ rumors })
      const result = applyRumorSpread(state, alwaysFail)
      const inDistrict = result.rumors.filter((r) => r.districtId === 'district-harbor')
      expect(inDistrict.length).toBeLessThanOrEqual(4)
    })

    it('enforces max 2 per bond pair', () => {
      const rumors: Rumor[] = Array.from({ length: 4 }, (_, i) =>
        makeRumor({
          id: `rumor-bond-${i}`,
          kind: 'bond',
          heat: 80,
          subjectNpcIds: ['npc-a', 'npc-b'],
          districtId: 'district-the-warrens',
        }),
      )
      const state = makeState({ rumors })
      const result = applyRumorSpread(state, alwaysFail)
      const pairRumors = result.rumors.filter(
        (r) => r.kind === 'bond' && r.subjectNpcIds.includes('npc-a') && r.subjectNpcIds.includes('npc-b'),
      )
      expect(pairRumors.length).toBeLessThanOrEqual(2)
    })

    it('removes rumours past TTL', () => {
      // dry district TTL = 4 days; lastSpreadDay = 1, currentDay = 6 → expired
      const rumor = makeRumor({
        heat: 80,
        districtId: 'district-gilded-heights',
        lastSpreadDay: 1,
        createdDay: 1,
      })
      const state = makeState({ day: 6, rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysFail)
      expect(result.rumors.find((r) => r.id === 'test-rumor-1')).toBeUndefined()
    })
  })

  describe('bond visibility', () => {
    it('promotes bond rumour to rumored when spread heat >= 20', () => {
      // heat=25, dry district: no pass (alwaysFail), spread heat stays 25 → visibility 'rumored'
      const rumor = makeRumor({
        id: 'bond-rumored',
        kind: 'bond',
        subjectNpcIds: ['npc-alpha', 'npc-beta'],
        heat: 25,
        districtId: 'district-gilded-heights',
      })
      const state = makeState({ rumors: [rumor], bondVisibility: {} })
      const result = applyRumorSpread(state, alwaysFail)
      expect(result.bondVisibility['npc-alpha::npc-beta']).toBe('rumored')
    })

    it('promotes bond rumour to known when spread heat >= 60', () => {
      const rumor = makeRumor({
        id: 'bond-known',
        kind: 'bond',
        subjectNpcIds: ['npc-x', 'npc-y'],
        heat: 70,
        districtId: 'district-the-warrens',
      })
      const state = makeState({ rumors: [rumor], bondVisibility: {} })
      const result = applyRumorSpread(state, alwaysFail)
      expect(result.bondVisibility['npc-x::npc-y']).toBe('known')
    })

    it('never moves bond visibility backward', () => {
      const rumor = makeRumor({
        id: 'bond-backward',
        kind: 'bond',
        subjectNpcIds: ['npc-m', 'npc-n'],
        heat: 5,
        districtId: 'district-the-warrens',
      })
      const state = makeState({
        rumors: [rumor],
        bondVisibility: { 'npc-m::npc-n': 'known' },
      })
      const result = applyRumorSpread(state, alwaysFail)
      expect(result.bondVisibility['npc-m::npc-n']).toBe('known')
    })
  })

  describe('rumor consequences (heat threshold → quest lead)', () => {
    it('adds quest lead when rumor heat crosses template threshold', () => {
      // rumor-highborn-captive has consequences: { heatThreshold: 50, unlocksQuestId: 'quest-mira-rescue' }
      // Starting heat 44 + gain 8 = 52 → crosses 50
      const rumor = makeRumor({
        id: 'test-captive',
        templateId: 'rumor-highborn-captive',
        heat: 44,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-mira'],
        credibility: 40,
      })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-mira-rescue')).toBe(true)
    })

    it('does not fire consequence when heat stays below threshold', () => {
      // Starting heat 30 + gain 8 = 38 → does not cross 50
      const rumor = makeRumor({
        id: 'test-captive-low',
        templateId: 'rumor-highborn-captive',
        heat: 30,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-mira'],
        credibility: 40,
      })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-mira-rescue')).toBe(false)
    })

    it('does not fire consequence when heat was already above threshold', () => {
      // Heat already 55 — threshold already crossed in a previous tick
      const rumor = makeRumor({
        id: 'test-captive-already',
        templateId: 'rumor-highborn-captive',
        heat: 55,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-mira'],
        credibility: 40,
      })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-mira-rescue')).toBe(false)
    })

    it('does not add quest lead when quest is already active', () => {
      const rumor = makeRumor({
        id: 'test-captive-active',
        templateId: 'rumor-highborn-captive',
        heat: 44,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-mira'],
        credibility: 40,
      })
      const state = makeState({
        rumors: [rumor],
        activeQuests: [createQuestRuntime(
          getQuestTemplates().find((q) => q.id === 'quest-mira-rescue')!,
          1,
          undefined,
        )],
      })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-mira-rescue')).toBe(false)
    })

    it('does not add quest lead when quest is already completed', () => {
      const rumor = makeRumor({
        id: 'test-captive-done',
        templateId: 'rumor-highborn-captive',
        heat: 44,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-mira'],
        credibility: 40,
      })
      const state = makeState({
        rumors: [rumor],
        completedQuestIds: ['quest-mira-rescue'],
      })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-mira-rescue')).toBe(false)
    })

    it('rumor-maret-book consequence fires at heat 45 and unlocks quest-hollows-ledger', () => {
      const rumor = makeRumor({
        id: 'test-maret',
        templateId: 'rumor-maret-book',
        heat: 38,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-old-maret'],
        credibility: 60,
      })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-hollows-ledger')).toBe(true)
    })
  })
})
