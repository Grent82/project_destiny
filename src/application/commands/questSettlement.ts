import type { ActivityCategory, GameState } from '../../domain'
import { getRenownLevel } from '../../domain/progression/contracts'
import { formatMarks } from '../../domain/game/currency'
import type { QuestTemplate } from '../../domain/quests/contracts'
import { contentCatalog, getNpcDefinitions, getQuestTemplates } from '../content/contentCatalog'
import { MAX_ACTIVITY_ENTRIES } from './activityLog'
import { buildEventRumorEntry } from './spawnEventRumor'
import type { QuestEventParams } from './spawnEventRumor'
import { setNpcCaptivityState } from './captivityRegistry'

interface QuestSuccessOptions {
  completionMessage?: string
  completionCategory?: ActivityCategory
  journalEntry?: string
  rewardScale?: number
  applyStanding?: boolean
  applyCityDial?: boolean
  applyDebtReduction?: boolean
  applyUnlocksNpc?: boolean
  renownGainOverride?: number
  objectiveLabel?: string
}

interface QuestFailureOptions {
  failureMessage?: string
  failureCategory?: ActivityCategory
  journalEntry?: string
  objectiveLabel?: string
  applyStanding?: boolean
}

function pushActivityLog(state: GameState, category: ActivityCategory, message: string, key: string) {
  state.activityLog.unshift({
    id: `log-${state.day}-${state.timeSlot}-${key}`,
    day: state.day,
    timeSlot: state.timeSlot,
    category,
    message,
  })
  if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) {
    state.activityLog.pop()
  }
}

function findQuestSettlementTarget(state: GameState, questId: string) {
  const questIndex = state.activeQuests.findIndex((entry) => entry.questId === questId)
  if (questIndex === -1) {
    return null
  }

  const runtime = state.activeQuests[questIndex]
  const template = getQuestTemplates().find((entry) => entry.id === questId) ?? null

  return runtime ? { questIndex, runtime, template } : null
}

function getCanonicalRenownGain(template: QuestTemplate) {
  switch (template.riskLevel) {
    case 'extreme':
      return 20
    case 'high':
      return 15
    case 'medium':
      return 8
    default:
      return 4
  }
}

function applyMiraRescueResolution(state: GameState, questId: string) {
  if (questId !== QUEST_IDS.MIRA_RESCUE) return
  if (state.mainQuest.stage === 'rescued' || state.mainQuest.stage === 'epilogue') return

  state.mainQuest.stage = 'rescued'
  state.mainQuest.lastClue =
    'Mira is back. She walks under her own strength, but whatever held her still clings to the edges of her voice.'
  state.householdLore.missingRelatives = state.householdLore.missingRelatives.filter(
    (relative) => relative.name !== 'Mira Valdris',
  )

  pushActivityLog(
    state,
    'system',
    '◆ Mira is out. She is alive, and the house has changed with her return.',
    `mira-rescue-${questId}`,
  )
}

function applyOrrenRescueResolution(state: GameState, questId: string) {
  if (questId !== QUEST_IDS.ORREN_WEX_RESCUE) return

  setNpcCaptivityState(state, NPC_IDS.ORREN_WEX, null)
  state.npcSitePresences = state.npcSitePresences.filter(
    (presence) => !(presence.npcId === NPC_IDS.ORREN_WEX && presence.role === 'captive'),
  )

  state.mainQuest.stage = 'lead-found'
  state.mainQuest.lastClue =
    "Orren points you toward Tessaly Ash at the Wren Safe House in the Pale. She knows where Mira was moved and why the Court still keeps her breathing."

  pushActivityLog(
    state,
    'system',
    '◆ Orren names Tessaly Ash as the next living link in Mira’s trail. The Wren Safe House in the Pale is now your next stop.',
    `orren-lead-${questId}`,
  )
}

import type { QuestAftermath } from '../../domain/quests/contracts'
import { createQuestLeadRuntime } from '../../domain/quests/contracts'
import { DISTRICT_IDS, NPC_IDS, QUEST_IDS } from '../content/ids'

function applyQuestAftermath(state: GameState, aftermath: QuestAftermath | null, questTitle: string): void {
  if (!aftermath) return

  // Faction impacts from aftermath (in addition to template standing changes)
  for (const impact of aftermath.factionImpacts) {
    const current = state.factionStandings[impact.factionId] ?? 0
    state.factionStandings[impact.factionId] = Math.max(-100, Math.min(100, current + impact.delta))
    const factionName = contentCatalog.factionsById.get(impact.factionId)?.name ?? impact.factionId
    const direction = impact.delta > 0 ? 'improves' : 'worsens'
    pushActivityLog(state, 'system', `Aftermath of ${questTitle}: standing with ${factionName} ${direction}.`, `aftermath-faction-${impact.factionId}`)
  }

  // NPC unlocks from aftermath
  for (const npcId of aftermath.unlockNpcIds) {
    const alreadyHired = state.roster.some((e) => e.npcId === npcId)
    const alreadyAvailable = state.availableForHire.some((e) => e.npcId === npcId)
    if (!alreadyHired && !alreadyAvailable) {
      const npcDef = getNpcDefinitions().find((e) => e.id === npcId)
      if (npcDef) {
        state.availableForHire.push({
          npcId: npcDef.id,
          discoveredInDistrictId: null,
          wagePerDay: 0,
          signingBonus: 0,
          requiredFactionId: null,
          requiredFactionStanding: 0,
          turnsAvailable: 10,
        })
        pushActivityLog(state, 'system', `${npcDef.name} surfaces after the resolution of ${questTitle}.`, `aftermath-npc-${npcId}`)
      }
    }
  }

  // World consequence log entries
  for (const consequenceId of aftermath.worldConsequenceIds) {
    pushActivityLog(state, 'system', `World consequence: ${consequenceId}`, `aftermath-consequence-${consequenceId}`)
  }

  // Narrative summary
  if (aftermath.narrativeSummary) {
    pushActivityLog(state, 'system', aftermath.narrativeSummary, `aftermath-narrative-${questTitle}`)
  }
}

function activateSuccessorQuestLead(state: GameState, successorQuestId: string, fromQuestTitle: string): void {
  const alreadyHasLead = state.availableQuestLeads.some((l) => l.questId === successorQuestId)
  const alreadyCompleted = state.completedQuestIds.includes(successorQuestId)
  const alreadyActive = state.activeQuests.some((q) => q.questId === successorQuestId)
  if (alreadyHasLead || alreadyCompleted || alreadyActive) return

  const successorTemplate = getQuestTemplates().find((q) => q.id === successorQuestId)
  if (!successorTemplate) return

  const lead = createQuestLeadRuntime(successorTemplate, state.day, { discoverySource: 'npc' })
  state.availableQuestLeads.push(lead)
  pushActivityLog(
    state,
    'system',
    `A new lead emerged from ${fromQuestTitle}: "${successorTemplate.title}" — check the Work Board.`,
    `successor-${successorQuestId}`,
  )
}

function deriveQuestOutcomeType(questId: string): QuestEventParams['questOutcomeType'] {
  if (questId.includes('rescue') || questId.includes('captive')) return 'captive-freed'
  if (questId.includes('ledger') || questId.includes('evidence')) return 'evidence-secured'
  return 'quest-resolved'
}

export function settleQuestSuccess(state: GameState, questId: string, options: QuestSuccessOptions = {}) {
  const settlementTarget = findQuestSettlementTarget(state, questId)
  if (!settlementTarget) return false

  const { questIndex, runtime, template } = settlementTarget
  const rewardScale = options.rewardScale ?? 1
  const applyStanding = options.applyStanding ?? true
  const applyCityDial = options.applyCityDial ?? true
  const applyDebtReduction = options.applyDebtReduction ?? true
  const applyUnlocksNpc = options.applyUnlocksNpc ?? true
  const completionCategory = options.completionCategory ?? 'economy'
  const objectiveLabel =
    options.objectiveLabel ?? 'The contract is settled. Return to house business.'

  runtime.status = 'completed'
  runtime.stageId = 'resolved'
  runtime.objectiveMet = true
  runtime.currentObjectiveLabel = objectiveLabel
  runtime.progress.completedSteps = runtime.progress.requiredSteps
  runtime.progress.lastAdvancedDay = state.day

  const journalEntries = [...runtime.journalEntries]
  if (options.journalEntry) {
    journalEntries.push(options.journalEntry)
  }
  if (template?.aftermathText) {
    journalEntries.push(template.aftermathText)
  }
  runtime.journalEntries = journalEntries

  // Archive the completed quest before removing from active
  const archivedQuest = { ...runtime }
  state.activeQuests.splice(questIndex, 1)
  if (!state.completedQuestIds.includes(questId)) {
    state.completedQuestIds.push(questId)
  }
  state.questHistory.push(archivedQuest)

  const questTitle = template?.title ?? runtime.acceptedTitle
  if (!template) {
    pushActivityLog(
      state,
      completionCategory,
      options.completionMessage ?? `Contract complete: ${questTitle}.`,
      `complete-${questId}`,
    )
    applyQuestAftermath(state, runtime.aftermath, questTitle)
    return true
  }

  const corruption = state.cityDials.corruption
  const scaledBaseReward = Math.max(0, Math.floor(template.rewardMarks * rewardScale))
  const rewardMarks =
    corruption >= 70 ? Math.floor(scaledBaseReward * 0.9) : scaledBaseReward
  if (rewardMarks > 0) {
    state.money += rewardMarks
  }
  if (corruption >= 70 && scaledBaseReward > rewardMarks) {
    pushActivityLog(
      state,
      'economy',
      `Corruption in the city shaved ${formatMarks(scaledBaseReward - rewardMarks)} from the payout.`,
      `corruption-skim-${questId}`,
    )
  }

  if (applyStanding && template.rewardStandingFactionId && template.rewardStandingDelta !== 0) {
    state.factionStandings[template.rewardStandingFactionId] = Math.min(
      100,
      Math.max(
        -100,
        (state.factionStandings[template.rewardStandingFactionId] ?? 0) +
          template.rewardStandingDelta,
      ),
    )
    const factionName =
      contentCatalog.factionsById.get(template.rewardStandingFactionId)?.name ??
      template.rewardStandingFactionId
    pushActivityLog(
      state,
      'system',
      `Standing with ${factionName} shifts by ${template.rewardStandingDelta}.`,
      `standing-${questId}`,
    )
  }

  if (applyCityDial && template.rewardCityDialId && template.rewardCityDialDelta !== 0) {
    const dial = template.rewardCityDialId
    state.cityDials[dial] = Math.max(
      0,
      Math.min(100, state.cityDials[dial] + template.rewardCityDialDelta),
    )
    const direction = template.rewardCityDialDelta > 0 ? 'rises' : 'falls'
    pushActivityLog(
      state,
      'system',
      `City ${dial} ${direction} in the wake of ${questTitle}.`,
      `dial-${questId}`,
    )
  }

  if (applyDebtReduction && template.rewardDebtReduction > 0) {
    state.debtAmount = Math.max(0, state.debtAmount - template.rewardDebtReduction)
    pushActivityLog(
      state,
      'economy',
      `House debt reduced by ${formatMarks(template.rewardDebtReduction)} — obligations clarified by ${questTitle}.`,
      `debt-${questId}`,
    )
  }

  if (applyUnlocksNpc && template.unlocksNpcId) {
    const alreadyHired = state.roster.some((entry) => entry.npcId === template.unlocksNpcId)
    const alreadyAvailable = state.availableForHire.some(
      (entry) => entry.npcId === template.unlocksNpcId,
    )
    if (!alreadyHired && !alreadyAvailable) {
      const npcDef = getNpcDefinitions().find((entry) => entry.id === template.unlocksNpcId)
      if (npcDef) {
        state.availableForHire.push({
          npcId: npcDef.id,
          discoveredInDistrictId: template.districtId ?? null,
          wagePerDay: 0,
          signingBonus: 0,
          requiredFactionId: null,
          requiredFactionStanding: 0,
          turnsAvailable: 10,
        })
        pushActivityLog(
          state,
          'system',
          `${npcDef.name} is now available for house service.`,
          `npc-${npcDef.id}`,
        )
      }
    }
  }

  const ambitionBonus = state.playerCharacter.traits.ambition > 60 ? 2 : 0
  const renownGain = options.renownGainOverride ?? (getCanonicalRenownGain(template) + ambitionBonus)
  const oldLevel = getRenownLevel(state.playerCharacter.renown)
  state.playerCharacter.renown += renownGain
  const newLevel = getRenownLevel(state.playerCharacter.renown)

  const corruptionNote = corruption >= 70 ? ' (funds skimmed by corrupt hands)' : ''
  if (renownGain > 0) {
    pushActivityLog(
      state,
      'system',
      `The house gains ${renownGain} Renown from ${questTitle}.`,
      `renown-${questId}`,
    )
  }
  if (newLevel.level > oldLevel.level) {
    pushActivityLog(
      state,
      'system',
      `Your name carries further now. Renown rank: ${newLevel.label}.`,
      `renown-rank-${questId}`,
    )
  }

  pushActivityLog(
    state,
    completionCategory,
    options.completionMessage ??
      `Contract complete: ${questTitle}. ${formatMarks(rewardMarks)} received.${corruptionNote}`,
    `complete-${questId}`,
  )

  // Add inventory items authored in the quest template
  for (const itemId of template.rewardItemIds) {
    const itemDef = contentCatalog.itemsById.get(itemId)
    if (!itemDef) continue
    const existingOwned = state.ownedItems.find((o) => o.itemId === itemId && o.location === 'inventory')
    if (existingOwned) {
      existingOwned.quantity += 1
    } else {
      state.ownedItems.push({
        instanceId: `inst-${itemId}-${state.day}-reward`,
        itemId,
        location: 'inventory',
        quantity: 1,
      })
    }
    pushActivityLog(state, 'system', `${itemDef.name} added to inventory.`, `reward-item-${itemId}`)
  }

  // Apply relationship deltas authored in the quest template
  for (const delta of template.rewardRelationshipDeltas) {
    const key = `player→${delta.npcId}`
    const existing = state.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
    state.relationships[key] = {
      affinity: Math.max(-100, Math.min(100, (existing.affinity) + (delta.affinity ?? 0))),
      respect: Math.max(-100, Math.min(100, (existing.respect) + (delta.respect ?? 0))),
      fear: Math.max(-100, Math.min(100, (existing.fear) + (delta.fear ?? 0))),
      trust: Math.max(-100, Math.min(100, (existing.trust) + (delta.trust ?? 0))),
      loyalty: Math.max(-100, Math.min(100, (existing.loyalty) + (delta.loyalty ?? 0))),
    }
  }

  // Spawn successor rumors authored in the quest template (spawned fresh at heat 50)
  const activeTemplateIds = new Set(state.rumors.map((r) => r.templateId).filter(Boolean))
  for (const rumorTemplateId of template.successorRumorIds) {
    if (activeTemplateIds.has(rumorTemplateId)) continue
    const rumorTemplate = contentCatalog.rumors.find((r) => r.id === rumorTemplateId)
    if (!rumorTemplate) continue
    state.rumors.push({
      id: `${rumorTemplateId}-d${state.day}-quest`,
      kind: rumorTemplate.kind,
      source: 'authored' as const,
      districtId: rumorTemplate.districtId,
      originNpcId: rumorTemplate.originNpcId,
      templateId: rumorTemplate.id,
      text: rumorTemplate.text,
      subjectNpcIds: rumorTemplate.subjectNpcIds,
      truth: rumorTemplate.truth,
      credibility: rumorTemplate.credibility,
      heat: 50,
      createdDay: state.day,
      lastSpreadDay: state.day,
    })
  }

  applyMiraRescueResolution(state, questId)
  applyOrrenRescueResolution(state, questId)

  // Apply structured aftermath: faction impacts, NPC unlocks, world consequence log
  applyQuestAftermath(state, runtime.aftermath, questTitle)

  // Unlock successor quest lead if defined
  if (template?.successorQuestId) {
    activateSuccessorQuestLead(state, template.successorQuestId, questTitle)
  }

  // Spawn a world-reaction event rumor in the quest's district
  const outcomeType = deriveQuestOutcomeType(questId)
  const eventRumor = buildEventRumorEntry(
    contentCatalog.eventRumorTemplates,
    { eventType: 'quest-complete', questOutcomeType: outcomeType, districtId: template?.districtId ?? null } satisfies QuestEventParams,
    state.currentDistrictId ?? DISTRICT_IDS.THE_PALE,
    state.day,
  )
  if (eventRumor) {
    state.rumors.push(eventRumor)
  }

  return true
}

/**
 * Partial success: reduced rewards, aftermath with failure-flavoured world consequences.
 * Used for contracts where the objective was partially met — guards passed, but the price was higher.
 */
export function settleQuestPartialSuccess(state: GameState, questId: string, options: Omit<QuestSuccessOptions, 'rewardScale'> & { partialReason?: string } = {}) {
  const settlementTarget = findQuestSettlementTarget(state, questId)
  if (!settlementTarget) return false

  const { questIndex, runtime, template } = settlementTarget
  runtime.status = 'completed'
  runtime.stageId = 'resolved-partial'
  runtime.objectiveMet = true
  runtime.currentObjectiveLabel = options.objectiveLabel ?? 'Objective met under strain. A messy resolution.'
  runtime.progress.completedSteps = runtime.progress.requiredSteps
  runtime.progress.lastAdvancedDay = state.day
  if (options.partialReason) {
    runtime.journalEntries = [...runtime.journalEntries, options.partialReason]
  }
  if (template?.aftermathText) {
    runtime.journalEntries = [...runtime.journalEntries, template.aftermathText]
  }

  // Archive the completed quest before removing from active
  const archivedQuest = { ...runtime }
  state.activeQuests.splice(questIndex, 1)
  if (!state.completedQuestIds.includes(questId)) {
    state.completedQuestIds.push(questId)
  }
  state.questHistory.push(archivedQuest)

  const questTitle = template?.title ?? runtime.acceptedTitle
  const halfReward = template ? Math.floor(template.rewardMarks * 0.5) : 0
  if (halfReward > 0) {
    state.money += halfReward
  }

  // Half standing on partial
  if (template?.rewardStandingFactionId && template.rewardStandingDelta !== 0) {
    const delta = Math.floor(template.rewardStandingDelta / 2)
    state.factionStandings[template.rewardStandingFactionId] = Math.min(
      100,
      Math.max(-100, (state.factionStandings[template.rewardStandingFactionId] ?? 0) + delta),
    )
  }

  applyMiraRescueResolution(state, questId)
  applyOrrenRescueResolution(state, questId)
  applyQuestAftermath(state, runtime.aftermath, questTitle)

  pushActivityLog(
    state,
    options.completionCategory ?? 'system',
    options.completionMessage ?? `${questTitle} — partial resolution. ${formatMarks(halfReward)} recovered. The cost was higher than expected.`,
    `partial-${questId}`,
  )

  return true
}

export function settleQuestFailure(state: GameState, questId: string, options: QuestFailureOptions = {}) {
  const settlementTarget = findQuestSettlementTarget(state, questId)
  if (!settlementTarget) return false

  const { questIndex, runtime, template } = settlementTarget
  runtime.status = 'failed'
  runtime.stageId = 'failed'
  runtime.currentObjectiveLabel = options.objectiveLabel ?? 'The contract is lost.'
  runtime.progress.lastAdvancedDay = state.day
  runtime.journalEntries = [
    ...runtime.journalEntries,
    options.journalEntry ?? 'The contract failed before the house could settle it.',
  ]

  // Archive the failed quest before removing from active
  const archivedQuest = { ...runtime }
  state.activeQuests.splice(questIndex, 1)
  state.failedQuestIds.push(questId)
  state.questHistory.push(archivedQuest)

  const questTitle = template?.title ?? runtime.acceptedTitle
  const applyStanding = options.applyStanding ?? true
  if (applyStanding && template?.rewardStandingFactionId && template.penaltyStandingDelta !== 0) {
    state.factionStandings[template.rewardStandingFactionId] = Math.max(
      -100,
      Math.min(
        100,
        (state.factionStandings[template.rewardStandingFactionId] ?? 0) +
          template.penaltyStandingDelta,
      ),
    )
  }

  pushActivityLog(
    state,
    options.failureCategory ?? 'system',
    options.failureMessage ?? `Contract failed: ${questTitle}. The house bears the cost.`,
    `fail-${questId}`,
  )

  // Apply aftermath (failure aftermath may have different world consequences than success)
  applyQuestAftermath(state, runtime.aftermath, questTitle)

  // Unlock fail-branch successor quest lead
  if (template?.successorOnFailQuestId) {
    activateSuccessorQuestLead(state, template.successorOnFailQuestId, questTitle)
  }

  return true
}
