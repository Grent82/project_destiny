import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import { meetsDialogueCondition } from '../commands/dialogue'

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
