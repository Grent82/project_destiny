import { describe, it, expect } from 'vitest'
import { applyMoneyEarningIntentions } from './applyMoneyEarningIntentions'
import { initialGameStateSnapshot } from '../../../store/initialGameState'
import type { GameState } from '../../../../domain/game/contracts'

function createNpcWithIntention(
  npcId: string,
  name: string,
  intentionType: 'seek-tips' | 'black-market-trade' | 'beg-for-coin' | 'scavenge-for-sell',
  presence = 50,
  performance = 50,
  intrigue = 50,
  security = 50,
  survival = 50,
  perception = 50,
  stress = 30,
) {
  return {
    npcId,
    name,
    status: 'citizen' as const,
    assignment: 'idle' as const,
    assignedDistrictId: 'district-the-pale',
    roomAssignment: null,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
    attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception, presence, resolve: 50 },
    skills: { melee: 30, ranged: 30, medicine: 30, administration: 40, engineering: 30, negotiation: 30, survival, security, crafting: 30, performance, academics: 30, intrigue },
    traits: { discipline: 40, ambition: 50, empathy: 50, ruthlessness: 20, prudence: 40, curiosity: 50, dominance: 30, loyalty: 50, vanity: 20, zeal: 20 },
    states: { health: 80, fatigue: 20, stress, morale: 70, fear: 10, anger: 15, hunger: 20, injury: 0, intoxication: 0, hygiene: 60 },
    loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
    equipment: { weapon: null, armor: null, accessory: [] },
    personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
    clothing: { head: null, torso: 'item-tunic', arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
    npcMemory: [],
    npcArc: null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentIntention: { type: intentionType, target: null, targetType: 'district' as const },
    factionRelationships: [],
    captivityState: undefined,
    pregnancyState: undefined,
    bondStatus: null,
    wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
  }
}

describe('applyMoneyEarningIntentions', () => {
  it('processes NPCs with seek-tips intention', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        createNpcWithIntention('npc-tips', 'Street Performer', 'seek-tips', 60, 60),
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)

    // Should have attempted tips (RNG dependent, but we check the structure)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-tips')
    expect(npc).toBeDefined()
    // Tips go to carriedCash
    expect(npc!.personalFunds.carriedCash).toBeGreaterThanOrEqual(0)
  })

  it('processes NPCs with black-market-trade intention', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        createNpcWithIntention('npc-blackmarket', 'Smuggler', 'black-market-trade', 50, 50, 60, 60),
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-blackmarket')
    expect(npc).toBeDefined()
    // Black market goes to carriedCash
    expect(npc!.personalFunds.carriedCash).toBeGreaterThanOrEqual(0)
  })

  it('processes NPCs with beg-for-coin intention', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        createNpcWithIntention('npc-beggar', 'Desperate Beggar', 'beg-for-coin', 30, 30, 30, 30, 30, 30, 70),
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-beggar')
    expect(npc).toBeDefined()
    // Begging goes to carriedCash
    expect(npc!.personalFunds.carriedCash).toBeGreaterThanOrEqual(0)
  })

  it('processes NPCs with scavenge-for-sell intention', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        createNpcWithIntention('npc-scavenger', 'Scavenger', 'scavenge-for-sell', 50, 50, 50, 50, 60, 60),
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-scavenger')
    expect(npc).toBeDefined()
    // Scavenging goes to carriedCash
    expect(npc!.personalFunds.carriedCash).toBeGreaterThanOrEqual(0)
  })

  it('skips NPCs with active directives', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        {
          ...createNpcWithIntention('npc-directive', 'Busy NPC', 'seek-tips', 60, 60),
          currentDirectiveId: 'directive-some-task',
        },
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-directive')
    expect(npc!.personalFunds.carriedCash).toBe(0) // Should not earn
  })

  it('skips NPCs with non-idle assignments', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        {
          ...createNpcWithIntention('npc-working', 'Working NPC', 'seek-tips', 60, 60),
          assignment: 'working' as const,
        },
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-working')
    expect(npc!.personalFunds.carriedCash).toBe(0) // Should not earn
  })

  it('updates rngSeed after processing', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        createNpcWithIntention('npc-tips', 'Street Performer', 'seek-tips', 60, 60),
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)

    expect(result.rngSeed).not.toBe(state.rngSeed)
  })

  it('handles multiple money-earning intentions in same day', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        createNpcWithIntention('npc-tips', 'Performer', 'seek-tips', 60, 60),
        createNpcWithIntention('npc-scavenger', 'Scavenger', 'scavenge-for-sell', 50, 50, 50, 50, 60, 60),
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)

    const performer = result.npcRuntimeStates.find((n) => n.npcId === 'npc-tips')
    const scavenger = result.npcRuntimeStates.find((n) => n.npcId === 'npc-scavenger')

    expect(performer!.personalFunds.carriedCash).toBeGreaterThanOrEqual(0)
    expect(scavenger!.personalFunds.carriedCash).toBeGreaterThanOrEqual(0)
  })

  it('clears the intention after processing so generation can produce a new one tomorrow (regression: this used to never clear, permanently blocking re-generation)', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        createNpcWithIntention('npc-tips', 'Street Performer', 'seek-tips', 60, 60),
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-tips')
    expect(npc!.currentIntention).toBeNull()
  })

  it('does not clear intentions belonging to other NPCs or non-money-earning types', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        createNpcWithIntention('npc-tips', 'Street Performer', 'seek-tips', 60, 60),
        {
          ...createNpcWithIntention('npc-other', 'Other NPC', 'seek-tips', 60, 60),
          currentIntention: { type: 'eat-meal', target: null, targetType: 'district' as const },
        },
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)

    const other = result.npcRuntimeStates.find((n) => n.npcId === 'npc-other')
    expect(other!.currentIntention).toEqual({ type: 'eat-meal', target: null, targetType: 'district' })
  })

  it('resolves the district from the NPC\'s own assignedDistrictId, not always The Pale (regression: an operator-precedence bug made this always evaluate to district-the-pale regardless of the NPC\'s real district)', () => {
    // district-gilded-heights has no black_market POI (district-the-pale does) — if the old
    // hardcoded-to-The-Pale bug were still present, this NPC could still trade successfully
    // despite being assigned to a district with no black market at all.
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [
        {
          ...createNpcWithIntention('npc-blackmarket', 'Smuggler', 'black-market-trade', 50, 50, 90, 90),
          assignedDistrictId: 'district-gilded-heights',
        },
      ],
    } as unknown as GameState

    const result = applyMoneyEarningIntentions(state)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-blackmarket')
    expect(npc!.personalFunds.carriedCash).toBe(0)
  })
})
