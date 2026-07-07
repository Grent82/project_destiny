import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import { meetsDialogueCondition, isDialogueChoiceAvailable } from '../commands/dialogue'
import type { DialogueChoice } from '../../domain/dialogue/contracts'
import type { GameState } from '../../domain'

/**
 * List of NPCs that have custom portrait images in /portraits/.
 * Central definition to avoid UI layer dependencies in selectors.
 * All 49 NPCs have portraits generated (June 2026).
 */
const CUSTOM_PORTRAITS = new Set([
  'aldric-vane',
  'alis-vey',
  'bog',
  'brand',
  'brannic-thule',
  'bren-aldoth',
  'cessa-rill',
  'cress-aldmoor',
  'cutter',
  'dael-morw',
  'dalen-morke',
  'dara-slink',
  'elyn',
  'enemy-catrin-hale',
  'enemy-harlen-voss',
  'enemy-lady-sorn',
  'enemy-the-dockmaster',
  'enemy-tomas-rell',
  'evar-koss',
  'fenwick-pale',
  'garet-doyle',
  'halvard-senn',
  'ida-rhys',
  'irenne-brek',
  'lira-ashcroft',
  'lirien-ashcroft',
  'lissel-crane',
  'maret-sunne',
  'marion-vale',
  'mira',
  'nessa-vain',
  'old-maret',
  'orren-wex',
  'orven-pell',
  'osanna-cray',
  'oswin-farr',
  'petra-sunn',
  'player',
  'rutha-kael',
  'sable-cairn-head',
  'sable-wrent',
  'sanna-veld',
  'sister-vael',
  'tav',
  'tessaly-ash',
  'tessaly-wode',
  'the-wren',
  'torvald-messe',
  'verek-holst',
  'verek-sorn',
  'veyran-malk',
])

function hasPortraitAvailable(npcId: string): boolean {
  const portraitId = npcId.replace(/^npc-/, '').replace(/^enemy-/, '')
  return CUSTOM_PORTRAITS.has(portraitId)
}

export type DialogueChoiceKind = 'ask' | 'push' | 'commit' | 'leave'

export type DialogueChoicePresentation = {
  id: string
  label: string
  kind: DialogueChoiceKind
  nextNodeId: string | null
  effectNotes: string[]
}

export type ActiveDialoguePresentation = {
  dialogueId: string
  npcId: string
  npcName: string
  portraitSrc: string | null
  factionId: string | null
  sceneLocation: string
  stageDirection: string
  lineText: string
  choices: DialogueChoicePresentation[]
}

function stripQuotedLabel(label: string) {
  return label.replace(/^"|"$/g, '')
}

function classifyDialogueChoiceKind(choice: DialogueChoice): DialogueChoiceKind {
  if (choice.kind) return choice.kind

  const normalized = stripQuotedLabel(choice.label).trim().toLowerCase()

  if (
    normalized.startsWith('leave') ||
    normalized.startsWith('nothing today') ||
    normalized.startsWith('nothing yet') ||
    normalized.startsWith('not now') ||
    normalized.startsWith('not today') ||
    normalized.startsWith('not yet') ||
    normalized.startsWith('another time') ||
    normalized.startsWith('perhaps not today') ||
    normalized.startsWith('wrong time') ||
    normalized.startsWith('neither') ||
    normalized.startsWith('carry on') ||
    normalized.startsWith('fair enough') ||
    normalized.startsWith('good.') ||
    normalized.includes('come back')
  ) {
    return 'leave'
  }

  if (
    normalized.includes('?') ||
    normalized.startsWith('what ') ||
    normalized.startsWith('who ') ||
    normalized.startsWith('how ') ||
    normalized.startsWith('why ') ||
    normalized.startsWith('where ') ||
    normalized.startsWith('when ') ||
    normalized.startsWith('can ') ||
    normalized.startsWith('tell me ') ||
    normalized.startsWith('ask about ') ||
    normalized.startsWith('show ')
  ) {
    return 'ask'
  }

  if (normalized.startsWith('i ') || normalized.startsWith("i'") || normalized.startsWith('we ')) {
    return 'commit'
  }

  return 'push'
}

function formatDialogueOutcomeNote(npcId: string, choice: DialogueChoice) {
  const outcome = choice.outcome
  if (!outcome) {
    return choice.nextNodeId === null
      ? ['The exchange closes for now.']
      : ['The topic shifts under the pressure of your answer.']
  }

  switch (outcome.type) {
    case 'loyalty':
      return [`${contentCatalog.npcsById.get(npcId)?.name ?? 'They'} grow more loyal.`]
    case 'trust':
      return [`${contentCatalog.npcsById.get(npcId)?.name ?? 'They'} trust you more.`]
    case 'respect':
      return [`${contentCatalog.npcsById.get(npcId)?.name ?? 'They'} revise their measure of you upward.`]
    case 'affinity':
      return [`${contentCatalog.npcsById.get(npcId)?.name ?? 'They'} warm to you.`]
    case 'questUnlock': {
      const questTitle = contentCatalog.questsById.get(String(outcome.value))?.title ?? 'A new lead'
      return [`New lead surfaced: ${questTitle}.`]
    }
    case 'mainQuestHint':
      return ['A fresh clue is entered into the house memory.']
    case 'item': {
      const itemName = contentCatalog.itemsById.get(String(outcome.value))?.name ?? 'An item'
      return [`Item gained: ${itemName}.`]
    }
    case 'factionStanding': {
      const factionName =
        contentCatalog.factionsById.get(outcome.targetId ?? '')?.name ?? 'A faction'
      const isNegative = typeof outcome.value === 'number' && outcome.value < 0
      return [
        isNegative
          ? `⚠ Standing weakens with ${factionName}.`
          : `Standing strengthens with ${factionName}.`,
      ]
    }
    case 'activityLog':
      return [String(outcome.value)]
    default:
      return choice.nextNodeId === null
        ? ['The exchange closes for now.']
        : ['The topic shifts under the pressure of your answer.']
  }
}

function resolveDialogueSceneLocation(state: GameState, dialogueId: string, npcId: string) {
  const tree = contentCatalog.dialoguesById.get(dialogueId)
  if (tree?.sceneLocation) return tree.sceneLocation

  const npcDef = contentCatalog.npcsById.get(npcId)
  const districtId = state.currentDistrictId ?? npcDef?.districtId ?? null
  const districtName = districtId
    ? (contentCatalog.districtsById.get(districtId)?.name ?? districtId)
    : null

  if (state.currentDistrictId && state.currentDistrictId === state.houseDistrictId) {
    return districtName ? `House Valdris · ${districtName}` : 'House Valdris'
  }

  if (districtName) return districtName
  return 'A private room kept out of the noise'
}

function resolveStageDirection(choiceCount: number, rawStageDirection?: string) {
  if (rawStageDirection) return rawStageDirection
  if (choiceCount === 0) return 'The room goes still around the last word, waiting to see whether you press further.'
  return 'The room stays tight and attentive while each of you tests what can be said aloud.'
}

export const selectActiveDialoguePresentation = createSelector(
  [(state: RootState) => state.game],
  (game): ActiveDialoguePresentation | null => {
  const { activeDialogueId, activeDialogueNodeId } = game
  if (!activeDialogueId || !activeDialogueNodeId) return null

  const tree = contentCatalog.dialoguesById.get(activeDialogueId)
  if (!tree) return null

  const node = tree.nodes.find((entry) => entry.id === activeDialogueNodeId)
  if (!node) return null

  const npcDef = contentCatalog.npcsById.get(tree.npcId)
  const portraitId = tree.npcId.replace('npc-', '')
  const visibleChoices = node.choices.filter((choice) =>
    isDialogueChoiceAvailable(game, tree.id, choice),
  )

  return {
    dialogueId: tree.id,
    npcId: tree.npcId,
    npcName: npcDef?.name ?? tree.npcId,
    portraitSrc: hasPortraitAvailable(tree.npcId) ? `/portraits/${portraitId}.jpg` : null,
    factionId: npcDef?.factionAffinityId ?? null,
    sceneLocation: resolveDialogueSceneLocation(game, tree.id, tree.npcId),
    stageDirection: resolveStageDirection(visibleChoices.length, node.stageDirection),
    lineText: node.text,
    choices: visibleChoices.map((choice) => ({
      id: choice.id,
      label: stripQuotedLabel(choice.label),
      kind: classifyDialogueChoiceKind(choice),
      nextNodeId: choice.nextNodeId,
      effectNotes: formatDialogueOutcomeNote(tree.npcId, choice),
    })),
  }
})

const NEW_TOPIC_TRIGGER_CONDITION_TYPES = new Set(['hasItem', 'hasEnabledAction'])

/**
 * Returns true when an NPC's dialogue tree has at least one hasItem- or
 * hasEnabledAction-conditioned choice that is newly available (player holds the item, or
 * has examined a document that granted the matching enabledAction) and has not been taken yet.
 *
 * Used to surface "Marion has something to discuss" signals without exposing
 * which specific item/document triggered it — the player is expected to discover that
 * by talking.
 */
export function selectNpcHasNewDialogueTopics(npcId: string) {
  let selector = npcHasNewDialogueTopicsSelectorCache.get(npcId)
  if (!selector) {
    selector = createSelector([(state: RootState) => state.game], (game): boolean => {
      const tree = contentCatalog.dialoguesByNpcId.get(npcId)
      if (!tree) return false
      const rootNode = tree.nodes.find((n) => n.id === tree.openingNodeId)
      if (!rootNode) return false
      const resolved = game.resolvedDialogueChoices[tree.id] ?? []
      return rootNode.choices.some((choice) => {
        if (!choice.condition || !NEW_TOPIC_TRIGGER_CONDITION_TYPES.has(choice.condition.type)) return false
        if (resolved.includes(choice.id)) return false
        return meetsDialogueCondition(game, tree.id, choice.condition)
      })
    })
    npcHasNewDialogueTopicsSelectorCache.set(npcId, selector)
  }
  return selector
}

/**
 * Returns the visible (available) dialogue choices for the currently active
 * dialogue node. Choices are filtered through isDialogueChoiceAvailable, which
 * checks any condition attached to each choice against the current game state.
 *
 * Returns an empty array when there is no active dialogue or node.
 */
export function selectVisibleDialogueChoices(nodeId: string) {
  return (state: RootState): DialogueChoice[] => {
    const { activeDialogueId } = state.game
    if (!activeDialogueId) return []
    const tree = contentCatalog.dialoguesById.get(activeDialogueId)
    if (!tree) return []
    const node = tree.nodes.find((n) => n.id === nodeId)
    if (!node) return []
    return node.choices.filter((c) => isDialogueChoiceAvailable(state.game, tree.id, c))
  }
}

const npcHasNewDialogueTopicsSelectorCache = new Map<string, (state: RootState) => boolean>()
