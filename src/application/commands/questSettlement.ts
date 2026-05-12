import type { ActivityCategory, GameState } from '../../domain'
import { getRenownLevel } from '../../domain/progression/contracts'
import type { QuestTemplate } from '../../domain/quests/contracts'
import { contentCatalog, getNpcDefinitions, getQuestTemplates } from '../content/contentCatalog'
import { MAX_ACTIVITY_ENTRIES } from './activityLog'

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
  if (questId !== 'quest-mira-rescue') return
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
  if (questId !== 'quest-orren-wex-rescue') return

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

  state.activeQuests.splice(questIndex, 1)
  if (!state.completedQuestIds.includes(questId)) {
    state.completedQuestIds.push(questId)
  }

  const questTitle = template?.title ?? runtime.acceptedTitle
  if (!template) {
    pushActivityLog(
      state,
      completionCategory,
      options.completionMessage ?? `Contract complete: ${questTitle}.`,
      `complete-${questId}`,
    )
    return true
  }

  const corruption = state.cityDials.corruption
  const scaledBaseReward = Math.max(0, Math.floor(template.rewardMarks * rewardScale))
  const rewardMarks =
    corruption >= 70 ? Math.floor(scaledBaseReward * 0.9) : scaledBaseReward
  if (rewardMarks > 0) {
    state.money += rewardMarks
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
      `House debt reduced by ${template.rewardDebtReduction} Marks — obligations clarified by ${questTitle}.`,
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
      `Contract complete: ${questTitle}. ${rewardMarks} Marks received.${corruptionNote}`,
    `complete-${questId}`,
  )

  applyMiraRescueResolution(state, questId)
  applyOrrenRescueResolution(state, questId)
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

  state.activeQuests.splice(questIndex, 1)

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

  return true
}
