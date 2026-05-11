import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveCombatState, CombatantState, GameState } from '../../domain'

// Mock contentCatalog to avoid the pre-existing district schema validation error
vi.mock('../content/contentCatalog', () => ({
  contentCatalog: {
    npcsById: new Map([
      ['npc-1', { name: 'Mira' }],
      ['npc-2', { name: 'Vance' }],
    ]),
    districts: [],
    districtsById: new Map(),
    factions: [],
    factionsById: new Map(),
    items: [],
    itemsById: new Map(),
    npcs: [],
    shops: [],
    shopsById: new Map(),
  },
}))

import { getArmorProfile, getWeaponProfile, UNARMED_PROFILE } from '../content/equipmentCatalog'
import { performCombatAction, startCombatEncounter } from './combat'

const BASE_NPC_STATE = {
  npcId: 'npc-1',
  name: 'Mira',
  status: 'mercenary' as const,
  assignment: 'idle' as const,
  activeTitle: null,
  wagesOwedDays: 0,
  attributes: {
    might: 55,
    agility: 50,
    endurance: 48,
    intellect: 40,
    perception: 50,
    presence: 44,
    resolve: 60,
  },
  skills: {
    melee: 45,
    ranged: 30,
    medicine: 10,
    administration: 10,
    engineering: 10,
    negotiation: 10,
    survival: 20,
    security: 15,
    crafting: 10,
    performance: 5,
    academics: 10,
    intrigue: 15,
  },
  traits: {
    discipline: 60,
    ambition: 50,
    empathy: 40,
    ruthlessness: 30,
    prudence: 55,
    curiosity: 45,
    dominance: 35,
    loyalty: 65,
    vanity: 25,
    zeal: 40,
  },
  states: {
    health: 80,
    fatigue: 10,
    stress: 15,
    morale: 70,
    fear: 5,
    anger: 10,
    hunger: 20,
    injury: 0,
    intoxication: 0,
    hygiene: 80,
  },
  loadout: {
    primaryWeaponId: null as string | null,
    secondaryWeaponId: null as string | null,
    armorId: null as string | null,
    accessoryIds: [] as string[],
    consumableIds: [] as string[],
  },
  relationships: {},
  factionRelationships: [],
}

const BASE_GAME_STATE = {
  day: 1,
  timeSlot: 'morning' as const,
  money: 500,
  protagonistName: 'Valdric',
  hasSeenOpening: true,
  cityDials: { control: 45, prosperity: 35, unrest: 55, corruption: 60 },
  factionStandings: {},
  factionStates: [],
  districts: [],
  roster: [BASE_NPC_STATE, { ...BASE_NPC_STATE, npcId: 'npc-2' }],
  inventory: [],
  cityResources: { foodSecurity: 62, waterAccess: 70, materialStock: 50, corridorStatus: 'open' as const },
  activityLog: [],
  selectedSquadNpcIds: ['npc-1', 'npc-2'],
  activeCombat: null,
  rngSeed: 42,
  equippedItemDurabilities: {},
  playerCharacter: { name: 'Valdric', attributes: { might: 40, agility: 40, endurance: 40, intellect: 40, perception: 40, presence: 40, resolve: 40 }, skills: { melee: 15, ranged: 15, medicine: 15, administration: 15, engineering: 15, negotiation: 15, survival: 15, security: 15, crafting: 15, performance: 15, academics: 15, intrigue: 15 }, traits: { discipline: 40, ambition: 40, empathy: 40, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 40, vanity: 40, zeal: 40 }, level: 1 },
}

function makeCombatant(overrides: Partial<CombatantState> = {}): CombatantState {
  return {
    combatantId: 'ally-1',
    sourceNpcId: 'npc-1',
    name: 'Mira',
    side: 'allies',
    maxHealth: 50,
    health: 50,
    morale: 70,
    skill: 50,
    accuracy: 70,
    damageMin: 5,
    damageMax: 10,
    effectiveRange: 'close',
    soak: 0,
    speed: 4,
    guarding: false,
    staggered: false,
    guardCooldown: false,
    equippedWeaponId: null,
    equippedArmorId: null,
    ...overrides,
  }
}

function makeEncounter(overrides: Partial<ActiveCombatState> = {}): ActiveCombatState {
  return {
    encounterId: 'enc-test',
    round: 1,
    range: 'close',
    outcome: 'ongoing',
    activeCombatantId: 'ally-1',
    combatants: [
      makeCombatant({ combatantId: 'ally-1', side: 'allies' }),
      makeCombatant({
        combatantId: 'enemy-1',
        sourceNpcId: null,
        name: 'Fen Cutthroat',
        side: 'enemies',
      }),
    ],
    log: [],
    ...overrides,
  }
}

describe('equipment catalog', () => {
  it('returns unarmed profile when no weapon id is given', () => {
    expect(getWeaponProfile(null).id).toBe('unarmed')
    expect(getWeaponProfile(null).damageMin).toBe(1)
  })

  it('returns unarmored profile when no armor id is given', () => {
    expect(getArmorProfile(null).id).toBe('unarmored')
    expect(getArmorProfile(null).soak).toBe(0)
  })

  it('returns a real weapon profile by id', () => {
    const profile = getWeaponProfile('weapon-rifle-ring-longshot')
    expect(profile.id).toBe('weapon-rifle-ring-longshot')
    expect(profile.rangeTypePreference).toBe('distant')
  })

  it('returns a real armor profile by id', () => {
    const profile = getArmorProfile('armor-heavy-breach-plate-salvaged')
    expect(profile.soak).toBeGreaterThan(0)
  })
})

describe('weapon archetype range profiles', () => {
  it('rifle at distant range has better accuracy modifier than dagger at distant range', () => {
    const rifle = getWeaponProfile('weapon-rifle-ring-longshot')
    const dagger = getWeaponProfile('weapon-dagger-wasterunner')
    expect(rifle.rangeModifierDistant).toBeGreaterThan(dagger.rangeModifierDistant)
  })

  it('dagger at close range has better accuracy modifier than rifle at close range', () => {
    const dagger = getWeaponProfile('weapon-dagger-wasterunner')
    const rifle = getWeaponProfile('weapon-rifle-ring-longshot')
    expect(dagger.rangeModifierClose).toBeGreaterThan(rifle.rangeModifierClose)
  })

  it('dagger has higher critChance than a hammer', () => {
    const dagger = getWeaponProfile('weapon-dagger-compact-needlepoint')
    const hammer = getWeaponProfile('weapon-hammer-siege-breaker')
    expect(dagger.critChance).toBeGreaterThan(hammer.critChance)
  })

  it('heavy armor provides higher soak than light armor', () => {
    const heavy = getArmorProfile('armor-heavy-breach-plate-salvaged')
    const light = getArmorProfile('armor-light-tallow-work-coat')
    expect(heavy.soak).toBeGreaterThan(light.soak)
  })

  it('unarmed fallback has worse distant modifier than close modifier', () => {
    expect(UNARMED_PROFILE.rangeModifierDistant).toBeLessThan(UNARMED_PROFILE.rangeModifierClose)
  })

  it('all 19 weapons have rangeTypePreference set', () => {
    const ids = [
      'weapon-dagger-wasterunner', 'weapon-dagger-ring-flicker', 'weapon-dagger-compact-needlepoint',
      'weapon-sword-foundry-blade', 'weapon-sword-ward-captain-saber', 'weapon-sword-court-dueling-blade',
      'weapon-spear-ironworks-pike', 'weapon-spear-breach-era-halberd',
      'weapon-hammer-foundry-maul', 'weapon-hammer-league-enforcer-sledge', 'weapon-hammer-siege-breaker',
      'weapon-crossbow-harbor-boltcaster', 'weapon-crossbow-league-precision-frame',
      'weapon-pistol-compact-sidearm', 'weapon-pistol-court-calling-piece',
      'weapon-rifle-wall-post-carbine', 'weapon-rifle-ring-longshot',
      'weapon-shotgun-harbor-sweeper', 'weapon-shotgun-ironworks-scattergun',
    ]
    for (const id of ids) {
      const p = getWeaponProfile(id)
      expect(['close', 'medium', 'distant'], `${id} missing rangeTypePreference`).toContain(p.rangeTypePreference)
      expect(typeof p.rangeModifierMedium, `${id} missing rangeModifierMedium`).toBe('number')
    }
  })
})

describe('combat resolution with equipment', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('unarmed fallback: combat starts and produces log entries', () => {
    const state = startCombatEncounter(BASE_GAME_STATE as unknown as GameState)
    expect(state.activeCombat).not.toBeNull()
    const nextState = performCombatAction(state, 'attack')
    expect(nextState.activeCombat?.log.length).toBeGreaterThan(
      state.activeCombat?.log.length ?? 0,
    )
  })

  it('attack deals damage to the target', () => {
    const encounter = makeEncounter()
    const state = {
      ...BASE_GAME_STATE,
      rngSeed: 0,
      activeCombat: encounter,
    }
    const nextState = performCombatAction(state as unknown as GameState, 'attack')
    const enemy = nextState.activeCombat?.combatants.find((c) => c.combatantId === 'enemy-1')
    expect(enemy?.health).toBeLessThan(50)
  })

  it('respects actor accuracy when resolving attacks', () => {
    const highAccuracyState = {
      ...BASE_GAME_STATE,
      rngSeed: 42,
      activeCombat: makeEncounter({
        combatants: [
          makeCombatant({ combatantId: 'ally-1', side: 'allies', accuracy: 80 }),
          makeCombatant({
            combatantId: 'enemy-1',
            sourceNpcId: null,
            name: 'Fen Cutthroat',
            side: 'enemies',
          }),
        ],
      }),
    }
    const lowAccuracyState = {
      ...BASE_GAME_STATE,
      rngSeed: 42,
      activeCombat: makeEncounter({
        combatants: [
          makeCombatant({ combatantId: 'ally-1', side: 'allies', accuracy: 40 }),
          makeCombatant({
            combatantId: 'enemy-1',
            sourceNpcId: null,
            name: 'Fen Cutthroat',
            side: 'enemies',
          }),
        ],
      }),
    }

    const hitState = performCombatAction(highAccuracyState as unknown as GameState, 'attack')
    const missState = performCombatAction(lowAccuracyState as unknown as GameState, 'attack')

    const hitEnemy = hitState.activeCombat?.combatants.find((c) => c.combatantId === 'enemy-1')
    const missEnemy = missState.activeCombat?.combatants.find((c) => c.combatantId === 'enemy-1')

    expect(hitEnemy?.health).toBeLessThan(50)
    expect(missEnemy?.health).toBe(50)
  })

  it('keeps another ally guarding until that ally acts again or gets hit', () => {
    const encounter = makeEncounter({
      activeCombatantId: 'ally-1',
      combatants: [
        makeCombatant({
          combatantId: 'ally-1',
          sourceNpcId: 'npc-1',
          side: 'allies',
          speed: 6,
          health: 50,
          morale: 75,
        }),
        makeCombatant({
          combatantId: 'ally-2',
          sourceNpcId: 'npc-2',
          name: 'Vance',
          side: 'allies',
          speed: 5,
          health: 18,
          morale: 60,
        }),
        makeCombatant({
          combatantId: 'enemy-1',
          sourceNpcId: null,
          name: 'Fen Cutthroat',
          side: 'enemies',
          speed: 4,
          health: 50,
          morale: 65,
        }),
      ],
    })
    const guardedState = performCombatAction(
      {
        ...BASE_GAME_STATE,
        rngSeed: 42,
        activeCombat: encounter,
      } as unknown as GameState,
      'guard',
    )

    expect(
      guardedState.activeCombat?.combatants.find((c) => c.combatantId === 'ally-1')?.guarding,
    ).toBe(true)
    expect(guardedState.activeCombat?.activeCombatantId).toBe('ally-2')

    const afterSecondAllyActs = performCombatAction(guardedState, 'attack')
    const firstAlly = afterSecondAllyActs.activeCombat?.combatants.find((c) => c.combatantId === 'ally-1')

    expect(firstAlly?.guarding).toBe(true)
    expect(
      afterSecondAllyActs.activeCombat?.log.some((entry) => entry.actorId === 'enemy-1'),
    ).toBe(true)
  })

  it('drops guarding when the same combatant attempts to guard again on cooldown', () => {
    const state = {
      ...BASE_GAME_STATE,
      activeCombat: makeEncounter({
        activeCombatantId: 'ally-1',
        combatants: [
          makeCombatant({
            combatantId: 'ally-1',
            side: 'allies',
            guarding: true,
            guardCooldown: true,
          }),
          makeCombatant({
            combatantId: 'enemy-1',
            sourceNpcId: null,
            name: 'Fen Cutthroat',
            side: 'enemies',
          }),
        ],
      }),
    }

    const nextState = performCombatAction(state as unknown as GameState, 'guard')
    const ally = nextState.activeCombat?.combatants.find((c) => c.combatantId === 'ally-1')

    expect(ally?.guarding).toBe(false)
  })

  it('stagger status is applied and consumed: staggered enemy loses their next turn', () => {
    const encounter = makeEncounter({
      combatants: [
        makeCombatant({
          combatantId: 'ally-1',
          side: 'allies',
          equippedWeaponId: 'weapon-hammer-siege-breaker',
        }),
        makeCombatant({
          combatantId: 'enemy-1',
          sourceNpcId: null,
          name: 'Target',
          side: 'enemies',
        }),
      ],
    })

    const nextState = performCombatAction(
      { ...BASE_GAME_STATE, rngSeed: 0, activeCombat: encounter } as unknown as GameState,
      'attack',
    )
    // Stagger is consumed in the same round: enemy loses their turn and staggered resets to false
    const target = nextState.activeCombat?.combatants.find((c) => c.combatantId === 'enemy-1')
    expect(target?.staggered).toBe(false)
    // The log should contain the "still reeling" message proving the turn was skipped
    const reelingLog = nextState.activeCombat?.log.find((l) => l.summary.includes('still reeling'))
    expect(reelingLog).toBeDefined()
  })

  it('crit doubles damage — log contains "telling blow"', () => {
    const encounter = makeEncounter()
    const nextState = performCombatAction(
      { ...BASE_GAME_STATE, rngSeed: 118, activeCombat: encounter } as unknown as GameState,
      'attack',
    )
    // Find ally's attack log entry
    const allyLog = nextState.activeCombat?.log.find(
      (l) => l.actorId === 'ally-1' && l.summary.toLowerCase().includes('damage'),
    )
    expect(allyLog?.summary.toLowerCase()).toContain('telling blow')
  })

  it('log uses Valdenmoor vocabulary (strikes/lands a blow/connects)', () => {
    const encounter = makeEncounter()
    const nextState = performCombatAction(
      { ...BASE_GAME_STATE, rngSeed: 0, activeCombat: encounter } as unknown as GameState,
      'attack',
    )
    // Find the ally's attack log entry specifically (last log may be stagger/reeling message)
    const allyAttackLog = nextState.activeCombat?.log.find(
      (l) => l.actorId === 'ally-1' && l.summary.match(/strikes|lands a blow|connects/),
    )?.summary ?? ''
    expect(allyAttackLog).toMatch(/strikes|lands a blow|connects/)
  })

  it('miss log uses Valdenmoor miss vocabulary', () => {
    const encounter = makeEncounter()
    const nextState = performCombatAction(
      { ...BASE_GAME_STATE, rngSeed: 2, activeCombat: encounter } as unknown as GameState,
      'attack',
    )
    const allyMissLog = nextState.activeCombat?.log.find(
      (entry) => entry.actorId === 'ally-1' && /misses|goes wide|deflected/i.test(entry.summary),
    )?.summary ?? ''
    expect(allyMissLog).toMatch(/misses|goes wide|deflected/i)
  })
})
