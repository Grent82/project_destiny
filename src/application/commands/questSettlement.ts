import type { ActivityCategory, GameState } from '../../domain'
import { getRenownLevel } from '../../domain/progression/contracts'
import { formatMarks } from '../../domain/game/currency'
import type { QuestTemplate } from '../../domain/quests/contracts'
import { contentCatalog, getNpcDefinitions, getQuestTemplates } from '../content/contentCatalog'
import { MAX_ACTIVITY_ENTRIES } from './activityLog'
import { buildEventRumorEntry } from './spawnEventRumor'
import type { QuestEventParams } from './spawnEventRumor'
import type { QuestAftermath } from '../../domain/quests/contracts'
import { createQuestLeadRuntime } from '../../domain/quests/contracts'
import { DISTRICT_IDS, NPC_IDS, QUEST_IDS } from '../content/ids'
import { deriveFoodSecurityFromStock } from './foodFlow'

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

/**
 * Immutable helper: adds an entry to activityLog and returns new state.
 */
function pushActivityLog(state: GameState, category: ActivityCategory, message: string, key: string): GameState {
  const newEntry = {
    id: `log-${state.day}-${state.timeSlot}-${key}`,
    day: state.day,
    timeSlot: state.timeSlot,
    category,
    message,
  }

  let newLog = [newEntry, ...state.activityLog]
  if (newLog.length >= MAX_ACTIVITY_ENTRIES) {
    newLog = newLog.slice(0, MAX_ACTIVITY_ENTRIES)
  }

  return {
    ...state,
    activityLog: newLog,
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

/**
 * Immutable helper: applies Mira rescue resolution and returns new state.
 */
function applyMiraRescueResolution(state: GameState, questId: string): GameState {
  if (questId !== QUEST_IDS.MIRA_RESCUE) return state
  if (state.mainQuest.stage === 'rescued' || state.mainQuest.stage === 'epilogue') return state

  let nextState: GameState = {
    ...state,
    mainQuest: {
      ...state.mainQuest,
      stage: 'rescued',
      lastClue:
        'Mira is back. She walks under her own strength, but whatever held her still clings to the edges of her voice.',
    },
    householdLore: {
      ...state.householdLore,
      missingRelatives: state.householdLore.missingRelatives.filter(
        (relative) => relative.name !== 'Mira Valdris',
      ),
    },
  }

  return pushActivityLog(
    nextState,
    'system',
    '◆ Mira is out. She is alive, and the house has changed with her return.',
    `mira-rescue-${questId}`,
  )
}

/**
 * Immutable helper: applies Orren rescue resolution and returns new state.
 */
function applyOrrenRescueResolution(state: GameState, questId: string): GameState {
  if (questId !== QUEST_IDS.ORREN_WEX_RESCUE) return state

  // Handle captivity state removal immutably
  let nextState: GameState = {
    ...state,
    npcCaptivityStates: { ...state.npcCaptivityStates },
  }
  delete nextState.npcCaptivityStates[NPC_IDS.ORREN_WEX]

  // Update roster if applicable
  const rosterIndex = nextState.roster.findIndex((npc) => npc.npcId === NPC_IDS.ORREN_WEX)
  if (rosterIndex >= 0) {
    const updatedRoster = [...nextState.roster]
    updatedRoster[rosterIndex] = { ...updatedRoster[rosterIndex] }
    delete (updatedRoster[rosterIndex] as any).captivityState
    nextState = { ...nextState, roster: updatedRoster }
  }

  // Filter out the captive presence
  nextState = {
    ...nextState,
    npcSitePresences: (nextState.npcSitePresences ?? []).filter(
      (presence) => !(presence.npcId === NPC_IDS.ORREN_WEX && presence.role === 'captive'),
    ),
  }

  nextState = {
    ...nextState,
    mainQuest: {
      ...nextState.mainQuest,
      stage: 'lead-found',
      lastClue:
        "Orren points you toward Tessaly Ash at the Wren Safe House in the Pale. She knows where Mira was moved and why the Court still keeps her breathing.",
    },
  }

  return pushActivityLog(
    nextState,
    'system',
    '◆ Orren names Tessaly Ash as the next living link in Mira’s trail. The Wren Safe House in the Pale is now your next stop.',
    `orren-lead-${questId}`,
  )
}

/**
 * Immutable helper: applies quest aftermath effects and returns new state.
 */
function applyQuestAftermath(state: GameState, aftermath: QuestAftermath | null, questTitle: string): GameState {
  if (!aftermath) return state

  let nextState: GameState = state

  // Faction impacts from aftermath
  for (const impact of aftermath.factionImpacts) {
    const current = nextState.factionStandings[impact.factionId] ?? 0
    const newStanding = Math.max(-100, Math.min(100, current + impact.delta))
    const factionName = contentCatalog.factionsById.get(impact.factionId)?.name ?? impact.factionId
    const direction = impact.delta > 0 ? 'improves' : 'worsens'

    nextState = {
      ...nextState,
      factionStandings: {
        ...nextState.factionStandings,
        [impact.factionId]: newStanding,
      },
    }

    nextState = pushActivityLog(
      nextState,
      'system',
      `Aftermath of ${questTitle}: standing with ${factionName} ${direction}.`,
      `aftermath-faction-${impact.factionId}`,
    )
  }

  // NPC unlocks from aftermath
  for (const npcId of aftermath.unlockNpcIds) {
    const alreadyHired = nextState.roster.some((e) => e.npcId === npcId)
    const alreadyAvailable = nextState.availableForHire.some((e) => e.npcId === npcId)
    if (!alreadyHired && !alreadyAvailable) {
      const npcDef = getNpcDefinitions().find((e) => e.id === npcId)
      if (npcDef) {
        nextState = {
          ...nextState,
          availableForHire: [
            ...nextState.availableForHire,
            {
              npcId: npcDef.id,
              discoveredInDistrictId: null,
              wagePerDay: 0,
              signingBonus: 0,
              requiredFactionId: null,
              requiredFactionStanding: 0,
              turnsAvailable: 10,
            },
          ],
        }
        nextState = pushActivityLog(
          nextState,
          'system',
          `${npcDef.name} surfaces after the resolution of ${questTitle}.`,
          `aftermath-npc-${npcId}`,
        )
      }
    }
  }

  // World consequence log entries
  for (const consequenceId of aftermath.worldConsequenceIds) {
    nextState = pushActivityLog(
      nextState,
      'system',
      `World consequence: ${consequenceId}`,
      `aftermath-consequence-${consequenceId}`,
    )
  }

  // Narrative summary
  if (aftermath.narrativeSummary) {
    nextState = pushActivityLog(
      nextState,
      'system',
      aftermath.narrativeSummary,
      `aftermath-narrative-${questTitle}`,
    )
  }

  return nextState
}

/**
 * Immutable helper: activates a successor quest lead and returns new state.
 */
function activateSuccessorQuestLead(state: GameState, successorQuestId: string, fromQuestTitle: string): GameState {
  const alreadyHasLead = state.availableQuestLeads.some((l) => l.questId === successorQuestId)
  const alreadyCompleted = state.completedQuestIds.includes(successorQuestId)
  const alreadyActive = state.activeQuests.some((q) => q.questId === successorQuestId)
  if (alreadyHasLead || alreadyCompleted || alreadyActive) return state

  const successorTemplate = getQuestTemplates().find((q) => q.id === successorQuestId)
  if (!successorTemplate) return state

  const lead = createQuestLeadRuntime(successorTemplate, state.day, { discoverySource: 'npc' })

  return pushActivityLog(
    {
      ...state,
      availableQuestLeads: [...state.availableQuestLeads, lead],
    },
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

export function settleQuestSuccess(state: GameState, questId: string, options: QuestSuccessOptions = {}): GameState {
  const settlementTarget = findQuestSettlementTarget(state, questId)
  if (!settlementTarget) return state

  const { questIndex, runtime, template } = settlementTarget
  const rewardScale = options.rewardScale ?? 1
  const applyStanding = options.applyStanding ?? true
  const applyCityDial = options.applyCityDial ?? true
  const applyDebtReduction = options.applyDebtReduction ?? true
  const applyUnlocksNpc = options.applyUnlocksNpc ?? true
  const completionCategory = options.completionCategory ?? 'economy'
  const objectiveLabel =
    options.objectiveLabel ?? 'The contract is settled. Return to house business.'

  let nextState: GameState = state

  // Update runtime quest status - create new runtime object
  const updatedRuntime = {
    ...runtime,
    status: 'completed' as const,
    stageId: 'resolved',
    objectiveMet: true,
    currentObjectiveLabel: objectiveLabel,
    progress: {
      ...runtime.progress,
      completedSteps: runtime.progress.requiredSteps,
      lastAdvancedDay: state.day,
    },
    journalEntries: [
      ...runtime.journalEntries,
      ...(options.journalEntry ? [options.journalEntry] : []),
      ...(template?.aftermathText ? [template.aftermathText] : []),
    ],
  }

  nextState = {
    ...nextState,
    activeQuests: [
      ...nextState.activeQuests.slice(0, questIndex),
      ...nextState.activeQuests.slice(questIndex + 1),
    ],
    completedQuestIds: [...new Set([...nextState.completedQuestIds, questId])],
    questHistory: [...nextState.questHistory, updatedRuntime],
  }

  const questTitle = template?.title ?? runtime.acceptedTitle

  if (!template) {
    nextState = pushActivityLog(
      nextState,
      completionCategory,
      options.completionMessage ?? `Contract complete: ${questTitle}.`,
      `complete-${questId}`,
    )
    nextState = applyQuestAftermath(nextState, runtime.aftermath, questTitle)
    return nextState
  }

  const corruption = state.cityDials.corruption
  const scaledBaseReward = Math.max(0, Math.floor(template.rewardMarks * rewardScale))
  const rewardMarks = corruption >= 70 ? Math.floor(scaledBaseReward * 0.9) : scaledBaseReward

  if (rewardMarks > 0) {
    nextState = { ...nextState, money: nextState.money + rewardMarks }
  }

  if (corruption >= 70 && scaledBaseReward > rewardMarks) {
    nextState = pushActivityLog(
      nextState,
      'economy',
      `Corruption in the city shaved ${formatMarks(scaledBaseReward - rewardMarks)} from the payout.`,
      `corruption-skim-${questId}`,
    )
  }

  if (applyStanding && template.rewardStandingFactionId && template.rewardStandingDelta !== 0) {
    const currentStanding = nextState.factionStandings[template.rewardStandingFactionId] ?? 0
    const newStanding = Math.max(-100, Math.min(100, currentStanding + template.rewardStandingDelta))
    const factionName =
      contentCatalog.factionsById.get(template.rewardStandingFactionId)?.name ??
      template.rewardStandingFactionId

    nextState = {
      ...nextState,
      factionStandings: {
        ...nextState.factionStandings,
        [template.rewardStandingFactionId]: newStanding,
      },
    }

    nextState = pushActivityLog(
      nextState,
      'system',
      `Standing with ${factionName} shifts by ${template.rewardStandingDelta}.`,
      `standing-${questId}`,
    )
  }

  if (applyCityDial && template.rewardCityDialId && template.rewardCityDialDelta !== 0) {
    const dial = template.rewardCityDialId
    const newDialValue = Math.max(0, Math.min(100, nextState.cityDials[dial] + template.rewardCityDialDelta))
    const direction = template.rewardCityDialDelta > 0 ? 'rises' : 'falls'

    nextState = {
      ...nextState,
      cityDials: {
        ...nextState.cityDials,
        [dial]: newDialValue,
      },
    }

    nextState = pushActivityLog(
      nextState,
      'system',
      `City ${dial} ${direction} in the wake of ${questTitle}.`,
      `dial-${questId}`,
    )
  }

  if (applyDebtReduction && template.rewardDebtReduction > 0) {
    nextState = {
      ...nextState,
      debtAmount: Math.max(0, nextState.debtAmount - template.rewardDebtReduction),
    }

    nextState = pushActivityLog(
      nextState,
      'economy',
      `House debt reduced by ${formatMarks(template.rewardDebtReduction)} — obligations clarified by ${questTitle}.`,
      `debt-${questId}`,
    )
  }

  if (applyUnlocksNpc && template.unlocksNpcId) {
    const alreadyHired = nextState.roster.some((entry) => entry.npcId === template.unlocksNpcId)
    const alreadyAvailable = nextState.availableForHire.some(
      (entry) => entry.npcId === template.unlocksNpcId,
    )
    if (!alreadyHired && !alreadyAvailable) {
      const npcDef = getNpcDefinitions().find((entry) => entry.id === template.unlocksNpcId)
      if (npcDef) {
        nextState = {
          ...nextState,
          availableForHire: [
            ...nextState.availableForHire,
            {
              npcId: npcDef.id,
              discoveredInDistrictId: template.districtId ?? null,
              wagePerDay: 0,
              signingBonus: 0,
              requiredFactionId: null,
              requiredFactionStanding: 0,
              turnsAvailable: 10,
            },
          ],
        }
        nextState = pushActivityLog(
          nextState,
          'system',
          `${npcDef.name} is now available for house service.`,
          `npc-${npcDef.id}`,
        )
      }
    }
  }

  const ambitionBonus = nextState.playerCharacter.traits.ambition > 60 ? 2 : 0
  const renownGain = options.renownGainOverride ?? (getCanonicalRenownGain(template) + ambitionBonus)
  const oldLevel = getRenownLevel(nextState.playerCharacter.renown)
  const newRenown = nextState.playerCharacter.renown + renownGain
  const newLevel = getRenownLevel(newRenown)

  nextState = {
    ...nextState,
    playerCharacter: {
      ...nextState.playerCharacter,
      renown: newRenown,
    },
  }

  const corruptionNote = corruption >= 70 ? ' (funds skimmed by corrupt hands)' : ''

  if (renownGain > 0) {
    nextState = pushActivityLog(
      nextState,
      'system',
      `The house gains ${renownGain} Renown from ${questTitle}.`,
      `renown-${questId}`,
    )
  }
  if (newLevel.level > oldLevel.level) {
    nextState = pushActivityLog(
      nextState,
      'system',
      `Your name carries further now. Renown rank: ${newLevel.label}.`,
      `renown-rank-${questId}`,
    )
  }

  nextState = pushActivityLog(
    nextState,
    completionCategory,
    options.completionMessage ??
      `Contract complete: ${questTitle}. ${formatMarks(rewardMarks)} received.${corruptionNote}`,
    `complete-${questId}`,
  )

  // Add inventory items authored in the quest template
  for (const itemId of template.rewardItemIds ?? []) {
    const itemDef = contentCatalog.itemsById.get(itemId)
    if (!itemDef) continue

    const uniqueId = `${itemId}-reward-${nextState.day}`

    // Ensure we have at least one bag container
    let bagContainers = [...nextState.inventoryState.player.bagContainers]
    if (bagContainers.length === 0) {
      bagContainers = [
        {
          containerId: `bag-player-start`,
          containerType: 'backpack',
          ownerId: 'player',
          maxSlots: 20,
          slots: [],
          locked: false,
        },
      ]
    }

    const container = bagContainers[0]
    if (container && container.slots.length < container.maxSlots) {
      const newSlots = [...container.slots, { slotId: `slot-${uniqueId}`, itemInstanceId: uniqueId, quantity: 1 }]
      bagContainers = [{ ...container, slots: newSlots }]
      const usedBagSlots = bagContainers.reduce((sum, c) => sum + c.slots.length, 0)

      nextState = {
        ...nextState,
        inventoryState: {
          ...nextState.inventoryState,
          player: {
            ...nextState.inventoryState.player,
            bagContainers,
            usedBagSlots,
          },
        },
      }
    }

    nextState = pushActivityLog(nextState, 'system', `${itemDef.name} added to inventory.`, `reward-item-${itemId}`)
  }

  // Apply relationship deltas authored in the quest template
  let relationships = { ...nextState.relationships }
  for (const delta of template.rewardRelationshipDeltas) {
    const key = `player→${delta.npcId}`
    const existing = relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
    relationships[key] = {
      affinity: Math.max(-100, Math.min(100, existing.affinity + (delta.affinity ?? 0))),
      respect: Math.max(-100, Math.min(100, existing.respect + (delta.respect ?? 0))),
      fear: Math.max(-100, Math.min(100, existing.fear + (delta.fear ?? 0))),
      trust: Math.max(-100, Math.min(100, existing.trust + (delta.trust ?? 0))),
      loyalty: Math.max(-100, Math.min(100, existing.loyalty + (delta.loyalty ?? 0))),
    }
  }
  nextState = { ...nextState, relationships }

  // Spawn successor rumors authored in the quest template
  const activeTemplateIds = new Set(nextState.rumors.map((r) => r.templateId).filter(Boolean))
  let rumors = [...nextState.rumors]
  for (const rumorTemplateId of template.successorRumorIds) {
    if (activeTemplateIds.has(rumorTemplateId)) continue
    const rumorTemplate = contentCatalog.rumors.find((r) => r.id === rumorTemplateId)
    if (!rumorTemplate) continue
    rumors.push({
      id: `${rumorTemplateId}-d${nextState.day}-quest`,
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
      createdDay: nextState.day,
      lastSpreadDay: nextState.day,
    })
  }
  nextState = { ...nextState, rumors }

  nextState = applyMiraRescueResolution(nextState, questId)
  nextState = applyOrrenRescueResolution(nextState, questId)

  // Apply structured aftermath
  nextState = applyQuestAftermath(nextState, runtime.aftermath, questTitle)

  // Corridor-run: import food to city stock
  if (template.objectiveType === 'corridorRun' && template.foodImportAmount > 0) {
    const importAmount = Math.round(template.foodImportAmount * rewardScale)
    const oldStock = nextState.cityResources.foodStock
    const newStock = oldStock + importAmount
    const tollIncome = Math.round(importAmount * template.corridorTollRate)

    const newFoodSecurity = deriveFoodSecurityFromStock(newStock, nextState.cityResources.foodCapacity)

    nextState = {
      ...nextState,
      cityResources: {
        ...nextState.cityResources,
        foodStock: newStock,
        foodSecurity: newFoodSecurity,
      },
    }

    if (tollIncome > 0) {
      nextState = { ...nextState, money: nextState.money + tollIncome }
      nextState = pushActivityLog(
        nextState,
        'economy',
        `Corridor run toll collected: ${formatMarks(tollIncome)}.`,
        `corridor-toll-${questId}`,
      )
    }
    nextState = pushActivityLog(
      nextState,
      'economy',
      `Corridor run successful: ${importAmount} rations imported to city stock.`,
      `corridor-import-${questId}`,
    )
  }

  // Unlock successor quest lead if defined
  if (template?.successorQuestId) {
    nextState = activateSuccessorQuestLead(nextState, template.successorQuestId, questTitle)
  }

  // Spawn a world-reaction event rumor
  const outcomeType = deriveQuestOutcomeType(questId)
  const eventRumor = buildEventRumorEntry(
    contentCatalog.eventRumorTemplates,
    { eventType: 'quest-complete', questOutcomeType: outcomeType, districtId: template?.districtId ?? null } satisfies QuestEventParams,
    nextState.currentDistrictId ?? DISTRICT_IDS.THE_PALE,
    nextState.day,
  )
  if (eventRumor) {
    nextState = { ...nextState, rumors: [...nextState.rumors, eventRumor] }
  }

  return nextState
}

/**
 * Partial success: reduced rewards, aftermath with failure-flavoured world consequences.
 * Used for contracts where the objective was partially met — guards passed, but the price was higher.
 */
export function settleQuestPartialSuccess(state: GameState, questId: string, options: Omit<QuestSuccessOptions, 'rewardScale'> & { partialReason?: string } = {}): GameState {
  const settlementTarget = findQuestSettlementTarget(state, questId)
  if (!settlementTarget) return state

  const { questIndex, runtime, template } = settlementTarget

  let nextState: GameState = state

  // Update runtime quest status
  const updatedRuntime = {
    ...runtime,
    status: 'completed' as const,
    stageId: 'resolved-partial',
    objectiveMet: true,
    currentObjectiveLabel: options.objectiveLabel ?? 'Objective met under strain. A messy resolution.',
    progress: {
      ...runtime.progress,
      completedSteps: runtime.progress.requiredSteps,
      lastAdvancedDay: state.day,
    },
    journalEntries: [
      ...runtime.journalEntries,
      ...(options.partialReason ? [options.partialReason] : []),
      ...(template?.aftermathText ? [template.aftermathText] : []),
    ],
  }

  nextState = {
    ...nextState,
    activeQuests: [
      ...nextState.activeQuests.slice(0, questIndex),
      ...nextState.activeQuests.slice(questIndex + 1),
    ],
    completedQuestIds: [...new Set([...nextState.completedQuestIds, questId])],
    questHistory: [...nextState.questHistory, updatedRuntime],
  }

  const questTitle = template?.title ?? runtime.acceptedTitle
  const halfReward = template ? Math.floor(template.rewardMarks * 0.5) : 0

  if (halfReward > 0) {
    nextState = { ...nextState, money: nextState.money + halfReward }
  }

  // Half standing on partial
  if (template?.rewardStandingFactionId && template.rewardStandingDelta !== 0) {
    const delta = Math.floor(template.rewardStandingDelta / 2)
    const currentStanding = nextState.factionStandings[template.rewardStandingFactionId] ?? 0
    const newStanding = Math.max(-100, Math.min(100, currentStanding + delta))

    nextState = {
      ...nextState,
      factionStandings: {
        ...nextState.factionStandings,
        [template.rewardStandingFactionId]: newStanding,
      },
    }
  }

  nextState = applyMiraRescueResolution(nextState, questId)
  nextState = applyOrrenRescueResolution(nextState, questId)
  nextState = applyQuestAftermath(nextState, runtime.aftermath, questTitle)

  return pushActivityLog(
    nextState,
    options.completionCategory ?? 'system',
    options.completionMessage ?? `${questTitle} — partial resolution. ${formatMarks(halfReward)} recovered. The cost was higher than expected.`,
    `partial-${questId}`,
  )
}

export function settleQuestFailure(state: GameState, questId: string, options: QuestFailureOptions = {}): GameState {
  const settlementTarget = findQuestSettlementTarget(state, questId)
  if (!settlementTarget) return state

  const { questIndex, runtime, template } = settlementTarget

  let nextState: GameState = state

  // Update runtime quest status
  const updatedRuntime = {
    ...runtime,
    status: 'failed' as const,
    stageId: 'failed',
    objectiveMet: false,
    currentObjectiveLabel: options.objectiveLabel ?? 'The contract is lost.',
    progress: {
      ...runtime.progress,
      lastAdvancedDay: state.day,
    },
    journalEntries: [
      ...runtime.journalEntries,
      options.journalEntry ?? 'The contract failed before the house could settle it.',
    ],
  }

  nextState = {
    ...nextState,
    activeQuests: [
      ...nextState.activeQuests.slice(0, questIndex),
      ...nextState.activeQuests.slice(questIndex + 1),
    ],
    failedQuestIds: [...nextState.failedQuestIds, questId],
    questHistory: [...nextState.questHistory, updatedRuntime],
  }

  const questTitle = template?.title ?? runtime.acceptedTitle
  const applyStanding = options.applyStanding ?? true

  if (applyStanding && template?.rewardStandingFactionId && template.penaltyStandingDelta !== 0) {
    const currentStanding = nextState.factionStandings[template.rewardStandingFactionId] ?? 0
    const newStanding = Math.max(-100, Math.min(100, currentStanding + template.penaltyStandingDelta))

    nextState = {
      ...nextState,
      factionStandings: {
        ...nextState.factionStandings,
        [template.rewardStandingFactionId]: newStanding,
      },
    }
  }

  nextState = pushActivityLog(
    nextState,
    options.failureCategory ?? 'system',
    options.failureMessage ?? `Contract failed: ${questTitle}. The house bears the cost.`,
    `fail-${questId}`,
  )

  // Apply aftermath
  nextState = applyQuestAftermath(nextState, runtime.aftermath, questTitle)

  // Unlock fail-branch successor quest lead
  if (template?.successorOnFailQuestId) {
    nextState = activateSuccessorQuestLead(nextState, template.successorOnFailQuestId, questTitle)
  }

  return nextState
}
