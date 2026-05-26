import { current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import { contentCatalog } from '../../content/contentCatalog'
import { resolveDialogueChoice } from '../../commands/dialogue'

export const dialogueReducers = {
  startDialogue(state: GameState, action: PayloadAction<{ dialogueId: string; nodeId: string }>) {
    const { dialogueId, nodeId } = action.payload
    state.activeDialogueId = dialogueId
    const lastNode = state.visitedDialogueNodes[dialogueId]
    if (lastNode) {
      const tree = contentCatalog.dialoguesById.get(dialogueId)
      const nodeExists = tree?.nodes.some((n) => n.id === lastNode) ?? false
      state.activeDialogueNodeId = nodeExists ? lastNode : nodeId
    } else {
      state.activeDialogueNodeId = nodeId
    }
  },

  advanceDialogue(state: GameState, action: PayloadAction<{ nodeId: string | null }>) {
    const { nodeId } = action.payload
    if (nodeId !== null && state.activeDialogueId) {
      state.visitedDialogueNodes[state.activeDialogueId] = nodeId
    }
    state.activeDialogueNodeId = nodeId
  },

  selectDialogueChoice(state: GameState, action: PayloadAction<{ choiceId: string }>) {
    const snapshot = current(state) as GameState
    return resolveDialogueChoice(snapshot, action.payload.choiceId)
  },

  endDialogue(state: GameState) {
    state.activeDialogueId = null
    state.activeDialogueNodeId = null
  },
}
