import type { GameState } from '../../domain'
import type { DialogueChoice, DialogueCondition, DialogueOutcome } from '../../domain/dialogue/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { applyRelationshipDelta } from './adjustRelationship'
import { addPlayerItem } from './inventory/inventoryHelpers'
import { addQuestLeadIfNew } from './questLifecycle'

function cloneDialogueState(state: GameState): GameState {
  return {
    ...state,
    relationships: { ...state.relationships },
    factionStandings: { ...state.factionStandings },
    activityLog: [...state.activityLog],
    resolvedDialogueChoices: { ...state.resolvedDialogueChoices },
    visitedDialogueNodes: { ...state.visitedDialogueNodes },
    availableQuestLeads: [...state.availableQuestLeads],
  }
}

function recordResolvedChoice(
  state: GameState,
  dialogueId: string,
  choiceId: string,
): GameState {
  const existingChoiceIds = state.resolvedDialogueChoices[dialogueId] ?? []

  if (existingChoiceIds.includes(choiceId)) {
    return state
  }

  return {
    ...state,
    resolvedDialogueChoices: {
      ...state.resolvedDialogueChoices,
      [dialogueId]: [...existingChoiceIds, choiceId],
    },
  }
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
    case 'hasItem':
      // Check inventoryState instead of ownedItems
      return state.inventoryState.player.bagContainers.some((c) =>
        c.slots.some((s) => s.itemInstanceId === cond.value)
      )
    case 'hasEnabledAction':
      return state.enabledActions.includes(cond.value as string)
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
  const primaryCondition = !choice.condition || meetsDialogueCondition(state, dialogueId, choice.condition)
  const allConditions = choice.conditionAll?.every((condition) => meetsDialogueCondition(state, dialogueId, condition)) ?? true
  return primaryCondition && allConditions
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
      const result = applyRelationshipDelta(state, 'player', outcome.targetId ?? npcId, outcome.type, outcome.value)
      return result.state
    }
    case 'factionStanding': {
      if (typeof outcome.value !== 'number' || !outcome.targetId) return state
      const existingStanding = state.factionStandings[outcome.targetId] ?? 0
      const newStanding = Math.max(-100, Math.min(100, existingStanding + outcome.value))
      const afterStanding = {
        ...state,
        factionStandings: {
          ...state.factionStandings,
          [outcome.targetId]: newStanding,
        },
      }
      return appendActivityLogEntry(
        afterStanding,
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
      return addQuestLeadIfNew(state, outcome.value, {
        discoverySource: 'npc',
        discoveryDistrictId: state.currentDistrictId,
        sourceNpcId: npcId,
      })
    }
    case 'item': {
      if (typeof outcome.value !== 'string') return state
      const afterItem = addPlayerItem(state, outcome.value, 1)
      const itemName = contentCatalog.itemsById.get(outcome.value)?.name ?? outcome.value
      const npcName = contentCatalog.npcsById.get(npcId)?.name ?? npcId
      return appendActivityLogEntry(afterItem, 'system', `${npcName} gave you ${itemName}.`)
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
  next = recordResolvedChoice(next, tree.id, choice.id)

  if (choice.outcome) {
    next = applyDialogueOutcome(next, tree.npcId, choice.outcome)
  }

  if (choice.nextNodeId === null) {
    const remainingVisited = { ...next.visitedDialogueNodes }
    delete remainingVisited[tree.id]
    return {
      ...next,
      activeDialogueId: null,
      activeDialogueNodeId: null,
      visitedDialogueNodes: remainingVisited,
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
