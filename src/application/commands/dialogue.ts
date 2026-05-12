import type { GameState } from '../../domain'
import type { DialogueChoice, DialogueCondition, DialogueOutcome } from '../../domain/dialogue/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { applyRelationshipDelta } from './adjustRelationship'
import { addInventoryEntry } from './inventory'
import { addQuestLeadIfNew } from './questLifecycle'

function cloneDialogueState(state: GameState): GameState {
  return {
    ...state,
    relationships: { ...state.relationships },
    factionStandings: { ...state.factionStandings },
    inventory: [...state.inventory],
    availableQuestLeads: [...state.availableQuestLeads],
    activityLog: [...state.activityLog],
    resolvedDialogueChoices: { ...state.resolvedDialogueChoices },
    visitedDialogueNodes: { ...state.visitedDialogueNodes },
  }
}

function recordResolvedChoice(
  state: GameState,
  dialogueId: string,
  choiceId: string,
) {
  const existingChoiceIds = state.resolvedDialogueChoices[dialogueId] ?? []

  if (existingChoiceIds.includes(choiceId)) {
    return
  }

  state.resolvedDialogueChoices[dialogueId] = [...existingChoiceIds, choiceId]
}

export function meetsDialogueCondition(
  state: GameState,
  dialogueId: string,
  cond: DialogueCondition,
): boolean {
  switch (cond.type) {
    case 'dayMin':
      return state.day >= (cond.value as number)
    case 'dayMax':
      return state.day <= (cond.value as number)
    case 'debtPaid':
      return state.debtPaid === (cond.value as boolean)
    case 'minRenown':
      return state.playerCharacter.renown >= (cond.value as number)
    case 'minNpcTrust': {
      if (!cond.npcId) return true
      return (state.relationships[buildRelationshipKey('player', cond.npcId)]?.trust ?? 0) >= (cond.value as number)
    }
    case 'minNpcLoyalty': {
      if (!cond.npcId) return true
      return (state.relationships[buildRelationshipKey('player', cond.npcId)]?.loyalty ?? 0) >= (cond.value as number)
    }
    case 'mainQuestStage':
      return state.mainQuest.stage === cond.value
    case 'choiceTaken':
      return (state.resolvedDialogueChoices[dialogueId] ?? []).includes(cond.value as string)
    case 'choiceNotTaken':
      return !(state.resolvedDialogueChoices[dialogueId] ?? []).includes(cond.value as string)
    default:
      return true
  }
}

export function isDialogueChoiceAvailable(
  state: GameState,
  dialogueId: string,
  choice: DialogueChoice,
): boolean {
  return !choice.condition || meetsDialogueCondition(state, dialogueId, choice.condition)
}

function applyMainQuestHint(state: GameState, hint: string): GameState {
  const next = appendActivityLogEntry(state, 'system', `◆ ${hint}`)
  return {
    ...next,
    mainQuest: {
      ...next.mainQuest,
      lastClue: hint,
    },
  }
}

function applyDialogueOutcome(
  state: GameState,
  npcId: string,
  outcome: DialogueOutcome,
): GameState {
  switch (outcome.type) {
    case 'loyalty':
    case 'trust':
    case 'respect': {
      if (typeof outcome.value !== 'number') return state
      applyRelationshipDelta(state, 'player', outcome.targetId ?? npcId, outcome.type, outcome.value)
      return state
    }
    case 'factionStanding': {
      if (typeof outcome.value !== 'number' || !outcome.targetId) return state
      const existingStanding = state.factionStandings[outcome.targetId] ?? 0
      state.factionStandings[outcome.targetId] = existingStanding + outcome.value
      return appendActivityLogEntry(
        state,
        'system',
        `Standing shifted with ${contentCatalog.factionsById.get(outcome.targetId)?.name ?? outcome.targetId}.`,
      )
    }
    case 'mainQuestHint': {
      if (typeof outcome.value !== 'string') return state
      return applyMainQuestHint(state, outcome.value)
    }
    case 'activityLog': {
      if (typeof outcome.value !== 'string') return state
      return appendActivityLogEntry(state, 'system', outcome.value)
    }
    case 'questUnlock': {
      if (typeof outcome.value !== 'string') return state
      addQuestLeadIfNew(state, outcome.value, {
        discoverySource: 'npc',
        discoveryDistrictId: state.currentDistrictId,
        sourceNpcId: npcId,
      })
      return state
    }
    case 'item': {
      if (typeof outcome.value !== 'string') return state
      state.inventory = addInventoryEntry(state.inventory, outcome.value)
      const itemName = contentCatalog.itemsById.get(outcome.value)?.name ?? outcome.value
      const npcName = contentCatalog.npcsById.get(npcId)?.name ?? npcId
      return appendActivityLogEntry(state, 'system', `${npcName} gave you ${itemName}.`)
    }
    default:
      return state
  }
}

export function resolveDialogueChoice(
  state: GameState,
  choiceId: string,
): GameState {
  if (!state.activeDialogueId || !state.activeDialogueNodeId) return state

  const tree = contentCatalog.dialoguesById.get(state.activeDialogueId)
  const node = tree?.nodes.find((entry) => entry.id === state.activeDialogueNodeId)
  const choice = node?.choices.find((entry) => entry.id === choiceId)

  if (!tree || !node || !choice || !isDialogueChoiceAvailable(state, tree.id, choice)) {
    return state
  }

  let next = cloneDialogueState(state)
  recordResolvedChoice(next, tree.id, choice.id)

  if (choice.outcome) {
    next = applyDialogueOutcome(next, tree.npcId, choice.outcome)
  }

  if (choice.nextNodeId === null) {
    return {
      ...next,
      activeDialogueId: null,
      activeDialogueNodeId: null,
    }
  }

  return {
    ...next,
    activeDialogueNodeId: choice.nextNodeId,
    visitedDialogueNodes: {
      ...next.visitedDialogueNodes,
      [tree.id]: choice.nextNodeId,
    },
  }
}
