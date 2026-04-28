import { describe, it, expect } from 'vitest'
import { simulateRivalOrgs, applyRivalActions } from './simulateRivalOrgs'
import type { GameState } from '../../domain/game/contracts'

const baseState: GameState = {
  day: 5,
  timeSlot: 'morning',
  money: 500,
  protagonistName: 'Test',
  hasSeenOpening: false,
  cityDials: { control: 50, prosperity: 50, unrest: 30, corruption: 20 },
  factionStandings: {},
  factionStates: [],
  districts: [],
  roster: [],
  inventory: [],
  cityResources: { foodSecurity: 60, waterAccess: 60, materialStock: 60, corridorStatus: 'open' },
  activityLog: [],
  activeQuestIds: [],
  selectedSquadNpcIds: [],
  activeCombat: null,
  activeMissionId: null,
  pendingEvents: [],
  currentDistrictId: null,
  availableForHire: [],
  availableQuests: [],
  activeQuests: [],
  completedQuestIds: [],
  councilSeats: {},
  institutionalStanding: {},
  activeCouncilVotes: [],
  relationships: {},
  equippedItemDurabilities: {},
  activeInvestigation: null,
  firedEventIds: [],
  rivalOrgActions: [],
  cityStability: 60,
  householdLore: {
    houseName: 'House Test',
    founderName: 'Test Founder',
    founderGeneration: 1,
    antagonistFactionId: 'faction-gilded-court',
    missingRelatives: [],
  },
}

describe('simulateRivalOrgs', () => {
  it('returns expand action when random < 0.15', () => {
    const actions = simulateRivalOrgs(baseState, [0.05, 0.5])
    expect(actions.some((a) => a.actionType === 'expand')).toBe(true)
  })

  it('returns no actions when random > 0.40', () => {
    const actions = simulateRivalOrgs(baseState, [0.9, 0.9])
    expect(actions.length).toBe(0)
  })

  it('returns recruit action when 0.15 <= random < 0.30', () => {
    const actions = simulateRivalOrgs(baseState, [0.2, 0.9])
    expect(actions.some((a) => a.actionType === 'recruit')).toBe(true)
  })

  it('does not return pressure action when cityStability >= 40', () => {
    const highStabilityState = { ...baseState, cityStability: 60 }
    const actions = simulateRivalOrgs(highStabilityState, [0.35, 0.9])
    expect(actions.some((a) => a.actionType === 'pressure')).toBe(false)
  })

  it('returns pressure action when 0.30 <= random < 0.40 and cityStability < 40', () => {
    const lowStabilityState = { ...baseState, cityStability: 25 }
    const actions = simulateRivalOrgs(lowStabilityState, [0.35, 0.9])
    expect(actions.some((a) => a.actionType === 'pressure')).toBe(true)
  })

  it('tags actions with the current day', () => {
    const actions = simulateRivalOrgs(baseState, [0.05, 0.05])
    expect(actions.every((a) => a.day === 5)).toBe(true)
  })
})

describe('applyRivalActions', () => {
  it('reduces cityStability on expand', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-iron-covenant', actionType: 'expand', day: 5 },
    ])
    expect(result.cityStability).toBe(57)
  })

  it('logs activity on expand with Iron Covenant name', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-iron-covenant', actionType: 'expand', day: 5 },
    ])
    expect(result.activityLog[0]?.message).toContain('Iron Covenant')
  })

  it('logs activity on expand with Pale Sisters name', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-pale-sisters', actionType: 'expand', day: 5 },
    ])
    expect(result.activityLog[0]?.message).toContain('Pale Sisters')
  })

  it('reduces cityStability on pressure', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-pale-sisters', actionType: 'pressure', day: 5 },
    ])
    expect(result.cityStability).toBe(55)
  })

  it('increases cityStability by 1 when no pressure or expand actions', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-iron-covenant', actionType: 'recruit', day: 5 },
    ])
    expect(result.cityStability).toBe(61)
  })

  it('increases cityStability by 1 when actions list is empty', () => {
    const result = applyRivalActions(baseState, [])
    expect(result.cityStability).toBe(61)
  })

  it('appends action to rivalOrgActions', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-iron-covenant', actionType: 'expand', day: 5 },
    ])
    expect(result.rivalOrgActions).toHaveLength(1)
    expect(result.rivalOrgActions[0]?.actionType).toBe('expand')
  })

  it('keeps only last 20 rival actions', () => {
    const twentyActions = Array.from({ length: 20 }, (_, i) => ({
      orgId: 'org-iron-covenant',
      actionType: 'recruit' as const,
      day: i + 1,
    }))
    const stateWithActions = { ...baseState, rivalOrgActions: twentyActions }
    const result = applyRivalActions(stateWithActions, [
      { orgId: 'org-pale-sisters', actionType: 'recruit', day: 21 },
    ])
    expect(result.rivalOrgActions).toHaveLength(20)
    expect(result.rivalOrgActions[19]?.day).toBe(21)
  })

  it('does not go below 0 cityStability', () => {
    const lowState = { ...baseState, cityStability: 2 }
    const result = applyRivalActions(lowState, [
      { orgId: 'org-iron-covenant', actionType: 'expand', day: 5 },
    ])
    expect(result.cityStability).toBe(0)
  })

  it('does not exceed 100 cityStability on recovery', () => {
    const fullState = { ...baseState, cityStability: 100 }
    const result = applyRivalActions(fullState, [])
    expect(result.cityStability).toBe(100)
  })
})
