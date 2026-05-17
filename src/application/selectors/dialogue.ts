import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import { meetsDialogueCondition, isDialogueChoiceAvailable } from '../commands/dialogue'
import type { DialogueChoice } from '../../domain/dialogue/contracts'

/**
 * Returns true when an NPC's dialogue tree has at least one hasItem-conditioned
 * choice that is newly available (player holds the item) and has not been taken yet.
 *
 * Used to surface "Marion has something to discuss" signals without exposing
 * which specific item triggered it — the player is expected to discover that
 * by talking.
 */
export function selectNpcHasNewDialogueTopics(npcId: string) {
  return (state: RootState): boolean => {
    const tree = contentCatalog.dialoguesByNpcId.get(npcId)
    if (!tree) return false
    const rootNode = tree.nodes.find((n) => n.id === tree.openingNodeId)
    if (!rootNode) return false
    const resolved = state.game.resolvedDialogueChoices[tree.id] ?? []
    return rootNode.choices.some((choice) => {
      if (!choice.condition || choice.condition.type !== 'hasItem') return false
      if (resolved.includes(choice.id)) return false
      return meetsDialogueCondition(state.game, tree.id, choice.condition)
    })
  }
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
