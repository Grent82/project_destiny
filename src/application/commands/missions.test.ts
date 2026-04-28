import { describe, expect, it } from 'vitest'

import { missionContractSchema, type MissionContract } from '../../domain/missions/contracts'
import missionsJson from '../../../data/definitions/missions.json'
import { contentCatalog } from '../content/contentCatalog'
import { gameSliceReducer, gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { concludeCombatEncounter, startCombatEncounter } from './combat'
import type { GameState } from '../../domain'

function makeVictoryState(base: GameState, missionId: string | null = null): GameState {
  const started = startCombatEncounter(base)
  return {
    ...started,
    activeMissionId: missionId,
    activeCombat: started.activeCombat
      ? { ...started.activeCombat, outcome: 'victory' as const, activeCombatantId: null }
      : null,
  }
}

function makeDefeatState(base: GameState, missionId: string | null = null): GameState {
  const started = startCombatEncounter(base)
  return {
    ...started,
    activeMissionId: missionId,
    activeCombat: started.activeCombat
      ? { ...started.activeCombat, outcome: 'defeat' as const, activeCombatantId: null }
      : null,
  }
}

describe('mission contracts', () => {
  it('parses all mission contracts from JSON without errors', () => {
    const result = missionContractSchema.array().safeParse(missionsJson)
    expect(result.success).toBe(true)
    expect(result.data!.length).toBeGreaterThanOrEqual(5)
  })

  it('missions are available in contentCatalog', () => {
    expect(contentCatalog.missions.length).toBeGreaterThanOrEqual(5)
    expect(contentCatalog.missionsById.has('mission-compact-patrol-suppression')).toBe(true)
  })

  it('each mission has required fields', () => {
    for (const mission of contentCatalog.missions) {
      expect(mission.id).toBeTruthy()
      expect(mission.title).toBeTruthy()
      expect(mission.employerFactionId).toBeTruthy()
      expect(mission.enemyFactionId).toBeTruthy()
      expect(mission.rewardCredits).toBeGreaterThanOrEqual(0)
      expect(mission.rewardStanding).toBeGreaterThan(0)
      expect(mission.penaltyStanding).toBeGreaterThan(0)
    }
  })
})

describe('selectMission action', () => {
  it('sets activeMissionId in state', () => {
    const missionId = 'mission-compact-patrol-suppression'
    const nextState = gameSliceReducer(
      initialGameStateSnapshot,
      gameActions.selectMission(missionId),
    )
    expect(nextState.activeMissionId).toBe(missionId)
  })

  it('clears activeMissionId when set to null', () => {
    const withMission = { ...initialGameStateSnapshot, activeMissionId: 'mission-compact-patrol-suppression' }
    const nextState = gameSliceReducer(withMission, gameActions.selectMission(null))
    expect(nextState.activeMissionId).toBeNull()
  })
})

describe('concludeCombatEncounter with active mission', () => {
  const mission = contentCatalog.missions[0] as MissionContract
  const missionId = mission.id

  it('victory: adds rewardCredits to money', () => {
    const state = makeVictoryState(initialGameStateSnapshot, missionId)
    const moneyBefore = state.money
    const nextState = concludeCombatEncounter(state)
    expect(nextState.money).toBe(moneyBefore + mission.rewardCredits)
  })

  it('victory: increases employer standing', () => {
    const state = makeVictoryState(initialGameStateSnapshot, missionId)
    const employerBefore = state.factionStandings[mission.employerFactionId] ?? 0
    const nextState = concludeCombatEncounter(state)
    expect(nextState.factionStandings[mission.employerFactionId]).toBe(
      Math.min(100, employerBefore + mission.rewardStanding),
    )
  })

  it('victory: decreases enemy faction standing', () => {
    const state = makeVictoryState(initialGameStateSnapshot, missionId)
    const enemyBefore = state.factionStandings[mission.enemyFactionId] ?? 0
    const nextState = concludeCombatEncounter(state)
    expect(nextState.factionStandings[mission.enemyFactionId]).toBe(
      Math.max(-100, enemyBefore - mission.penaltyStanding),
    )
  })

  it('victory: clears activeMissionId after conclusion', () => {
    const state = makeVictoryState(initialGameStateSnapshot, missionId)
    const nextState = concludeCombatEncounter(state)
    expect(nextState.activeMissionId).toBeNull()
  })

  it('victory: logs economy entry mentioning mission title and marks', () => {
    const state = makeVictoryState(initialGameStateSnapshot, missionId)
    const nextState = concludeCombatEncounter(state)
    const economyLog = nextState.activityLog.find((e) => e.category === 'economy')
    expect(economyLog?.message).toContain(mission.title)
    expect(economyLog?.message).toContain(`+${mission.rewardCredits}`)
  })

  it('defeat: decreases employer standing with penalty', () => {
    const state = makeDefeatState(initialGameStateSnapshot, missionId)
    const employerBefore = state.factionStandings[mission.employerFactionId] ?? 0
    const nextState = concludeCombatEncounter(state)
    expect(nextState.factionStandings[mission.employerFactionId]).toBe(
      Math.max(-100, employerBefore - mission.penaltyStanding),
    )
  })

  it('defeat: no credits awarded', () => {
    const state = makeDefeatState(initialGameStateSnapshot, missionId)
    const moneyBefore = state.money
    const nextState = concludeCombatEncounter(state)
    expect(nextState.money).toBe(moneyBefore)
  })

  it('defeat: clears activeMissionId', () => {
    const state = makeDefeatState(initialGameStateSnapshot, missionId)
    const nextState = concludeCombatEncounter(state)
    expect(nextState.activeMissionId).toBeNull()
  })
})

describe('concludeCombatEncounter without active mission (legacy path)', () => {
  it('victory with no mission: still concludes and logs system entry', () => {
    const state = makeVictoryState(initialGameStateSnapshot, null)
    const nextState = concludeCombatEncounter(state)
    expect(nextState.activeCombat).toBeNull()
    const systemLog = nextState.activityLog.find((e) =>
      e.message.match(/encounter is concluded/i),
    )
    expect(systemLog).toBeDefined()
  })

  it('victory with no mission and encounter factionId: improves that faction standing', () => {
    const state = makeVictoryState(initialGameStateSnapshot, null)
    const factionId = state.activeCombat?.factionId ?? 'faction-civic-compact'
    const before = state.factionStandings[factionId] ?? 0
    const nextState = concludeCombatEncounter(state)
    expect(nextState.factionStandings[factionId]).toBe(Math.min(100, before + 5))
  })
})
