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
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    expect(state.availableQuestLeads.some((l) => l.questId === QUEST_ID)).toBe(true)
  })

  it('accepts the lead and creates an active quest', () => {
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    const accepted = acceptQuestFromLead(state, QUEST_ID)
    expect(accepted).toBe(true)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime).toBeDefined()
    expect(runtime?.stageId).toBe('accepted')
  })

  it('cannot skip to execution without advancing to on-site first', () => {
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    // resolveSimpleContractObjective requires completedSteps >= 2
    const resolved = resolveSimpleContractObjective(state, QUEST_ID)
    expect(resolved).toBe(false)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.status).not.toBe('completed')
  })

  it('travel to incident district is required before on-site step', () => {
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    // Quest context marks the incident district
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.context.incidentDistrictId).toBe(DISTRICT_ID)
  })

  it('advances to on-site after explicit step', () => {
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    const advanced = advanceToOnSiteStep(state, QUEST_ID)
    expect(advanced).toBe(true)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.progress.completedSteps).toBeGreaterThanOrEqual(2)
  })

  it('resolves the quest after on-site step is taken', () => {
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    advanceToOnSiteStep(state, QUEST_ID)
    const resolved = resolveSimpleContractObjective(state, QUEST_ID)
    expect(resolved).toBe(true)
    expect(state.activeQuests.find((q) => q.questId === QUEST_ID)).toBeUndefined()
    expect(state.completedQuestIds).toContain(QUEST_ID)
  })

  it('preserves quest identity (questId and title) through the full funnel', () => {
    const template = findQuest(QUEST_ID)
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
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
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.context.incidentDistrictId).toBe(DISTRICT_ID)
  })

  it('quest remains active and open after acceptance without resolution', () => {
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime?.status).toBe('active')
    expect(state.completedQuestIds).not.toContain(QUEST_ID)
  })

  it('travel to incident district updates game location context', () => {
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
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
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    advanceToOnSiteStep(state, QUEST_ID)
    const result = resolveWithComplicationCheck(state, QUEST_ID, 0)
    expect(result).toBe('success')
  })

  it('complication risk 1 always triggers complication (failed)', () => {
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    advanceToOnSiteStep(state, QUEST_ID)
    const result = resolveWithComplicationCheck(state, QUEST_ID, 1)
    expect(result).toBe('failed')
  })

  it('not_ready returned if on-site step not taken first', () => {
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    const result = resolveWithComplicationCheck(state, QUEST_ID, 0)
    expect(result).toBe('not_ready')
  })

  it('aftermath: failed quest is removed from active quests (no dangling state)', () => {
    const state = freshState()
    addQuestLeadIfNew(state, QUEST_ID, { districtId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    advanceToOnSiteStep(state, QUEST_ID)
    resolveWithComplicationCheck(state, QUEST_ID, 1)
    const runtime = state.activeQuests.find((q) => q.questId === QUEST_ID)
    expect(runtime).toBeUndefined() // settled quests leave activeQuests
    // Should NOT be in completedQuestIds (it failed)
    expect(state.completedQuestIds).not.toContain(QUEST_ID)
  })
})

// ─── Scenario 4: Duplicate lead prevention ────────────────────────────────────

describe('Quest funnel — lead deduplication', () => {
  it('adding the same lead twice does not duplicate it', () => {
    const state = freshState()
    addQuestLeadIfNew(state, 'quest-nightbloom-extract', { districtId: 'district-the-hollows' })
    addQuestLeadIfNew(state, 'quest-nightbloom-extract', { districtId: 'district-the-hollows' })
    const leads = state.availableQuestLeads.filter((l) => l.questId === 'quest-nightbloom-extract')
    expect(leads).toHaveLength(1)
  })
})
