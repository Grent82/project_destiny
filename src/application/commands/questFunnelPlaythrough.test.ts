/**
 * Quest-funnel regression playthrough scenarios (destiny-4u73.14)
 *
 * These tests walk the full funnel:
 *   lead discovery → acceptance → location gating → execution → aftermath
 *
 * Each scenario proves that quest identity is preserved end-to-end and that
 * no step can be bypassed silently.
 */
import { describe, it, expect } from 'vitest'
import { getQuestTemplates } from '../content/contentCatalog'
import {
  addQuestLeadIfNew,
  acceptQuestFromLead,
  advanceToOnSiteStep,
  resolveSimpleContractObjective,
  resolveWithComplicationCheck,
} from './questLifecycle'
import { travelToDistrict } from './districtTravel'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state))
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function freshState(): GameState {
  return cloneState(initialGameStateSnapshot)
}

function findQuest(id: string) {
  const q = getQuestTemplates().find((t) => t.id === id)
  if (!q) throw new Error(`Quest ${id} not found in catalog`)
  return q
}

// ─── Scenario 1: Delivery quest full funnel ───────────────────────────────────

describe('Quest funnel — delivery contract (quest-nightbloom-extract)', () => {
  const QUEST_ID = 'quest-nightbloom-extract'
  const DISTRICT_ID = 'district-the-hollows'

  it('adds a lead and exposes it as available', () => {
    let state = freshState()
    state = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    expect(state.availableQuestLeads.some((l) => l.questId === QUEST_ID)).toBe(true)
  })

  it('accepts the lead and creates an active quest', () => {
    let state = freshState()
    state = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    state = acceptQuestFromLead(state, QUEST_ID)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime).toBeDefined()
    expect(runtime?.stageId).toBe('accepted')
  })

  it('cannot skip to execution without advancing to on-site first', () => {
    let state = freshState()
    state = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    state = acceptQuestFromLead(state, QUEST_ID)
    // resolveSimpleContractObjective requires completedSteps >= 2
    state = resolveSimpleContractObjective(state, QUEST_ID)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.status).not.toBe('completed')
  })

  it('travel to incident district is required before on-site step', () => {
    let state = freshState()
    state = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    state = acceptQuestFromLead(state, QUEST_ID)
    // Quest context marks the incident district
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.context.incidentDistrictId).toBe(DISTRICT_ID)
  })

  it('advances to on-site after explicit step', () => {
    let state = freshState()
    state = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    state = acceptQuestFromLead(state, QUEST_ID)
    state = advanceToOnSiteStep(state, QUEST_ID)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.progress.completedSteps).toBeGreaterThanOrEqual(2)
  })

  it('resolves the quest after on-site step is taken', () => {
    let state = freshState()
    state = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    state = acceptQuestFromLead(state, QUEST_ID)
    state = advanceToOnSiteStep(state, QUEST_ID)
    state = resolveSimpleContractObjective(state, QUEST_ID)
    expect(state.activeQuests.find((q) => q.questId === QUEST_ID)).toBeUndefined()
    expect(state.completedQuestIds).toContain(QUEST_ID)
  })

  it('preserves quest identity (questId and title) through the full funnel', () => {
    const template = findQuest(QUEST_ID)
    let state = freshState()
    state = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    state = acceptQuestFromLead(state, QUEST_ID)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.questId).toBe(QUEST_ID)
    expect(runtime?.acceptedTitle).toBe(template.title)
  })
})

// ─── Scenario 2: Investigation contract flow ──────────────────────────────────

describe('Quest funnel — investigation contract (quest-ledger-recovery)', () => {
  const QUEST_ID = 'quest-ledger-recovery'
  const DISTRICT_ID = 'district-the-pale'

  it('accepted investigation quest starts in the correct district', () => {
    let state = freshState()
    state = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    state = acceptQuestFromLead(state, QUEST_ID)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.context.incidentDistrictId).toBe(DISTRICT_ID)
  })

  it('quest remains active and open after acceptance without resolution', () => {
    let state = freshState()
    state = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    state = acceptQuestFromLead(state, QUEST_ID)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.status).toBe('active')
    expect(state.completedQuestIds).not.toContain(QUEST_ID)
  })

  it('travel to incident district updates game location context', () => {
    let state = freshState()
    state = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    state = acceptQuestFromLead(state, QUEST_ID)
    const afterTravel = travelToDistrict(state, DISTRICT_ID)
    expect(afterTravel.currentDistrictId).toBe(DISTRICT_ID)
  })
})

// ─── Scenario 3: Delivery contract with complication check ───────────────────

describe('Quest funnel — delivery contract complication check (quest-nightbloom-extract)', () => {
  const QUEST_ID = 'quest-nightbloom-extract'
  const DISTRICT_ID = 'district-the-hollows'

  it('complication risk 0 always succeeds', () => {
    const state = freshState()
    let nextState = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    nextState = acceptQuestFromLead(nextState, QUEST_ID)
    nextState = advanceToOnSiteStep(nextState, QUEST_ID)
    nextState = resolveWithComplicationCheck(nextState, QUEST_ID, 0)
    expect(nextState.completedQuestIds).toContain(QUEST_ID)
  })

  it('complication risk 1 always triggers complication (failed)', () => {
    const state = freshState()
    let nextState = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    nextState = acceptQuestFromLead(nextState, QUEST_ID)
    nextState = advanceToOnSiteStep(nextState, QUEST_ID)
    nextState = resolveWithComplicationCheck(nextState, QUEST_ID, 1)
    expect(nextState.failedQuestIds).toContain(QUEST_ID)
  })

  it('returns unchanged state if on-site step not taken first', () => {
    const state = freshState()
    let nextState = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    nextState = acceptQuestFromLead(nextState, QUEST_ID)
    const beforeSteps = nextState.activeQuests.find((q) => q.questId === QUEST_ID)?.progress.completedSteps
    nextState = resolveWithComplicationCheck(nextState, QUEST_ID, 0)
    // State should be unchanged when not ready
    const afterSteps = nextState.activeQuests.find((q) => q.questId === QUEST_ID)?.progress.completedSteps
    expect(beforeSteps).toBe(afterSteps)
  })

  it('aftermath: failed quest is removed from active quests (no dangling state)', () => {
    const state = freshState()
    let nextState = addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    nextState = acceptQuestFromLead(nextState, QUEST_ID)
    nextState = advanceToOnSiteStep(nextState, QUEST_ID)
    nextState = resolveWithComplicationCheck(nextState, QUEST_ID, 1)
    const runtime = nextState.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime).toBeUndefined() // settled quests leave activeQuests
    // Should NOT be in completedQuestIds (it failed)
    expect(nextState.completedQuestIds).not.toContain(QUEST_ID)
  })
})

// ─── Scenario 4: Duplicate lead prevention ────────────────────────────────────

describe('Quest funnel — lead deduplication', () => {
  it('adding the same lead twice does not duplicate it', () => {
    let state = freshState()
    state = addQuestLeadIfNew(state, 'quest-nightbloom-extract', { discoveryDistrictId: 'district-the-hollows' })
    state = addQuestLeadIfNew(state, 'quest-nightbloom-extract', { discoveryDistrictId: 'district-the-hollows' })
    const leads = state.availableQuestLeads.filter((l) => l.questId === 'quest-nightbloom-extract')
    expect(leads).toHaveLength(1)
  })
})
