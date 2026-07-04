import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameSliceReducer, gameActions } from '../store/gameSlice'

const firstNpcId = initialGameStateSnapshot.npcRuntimeStates[0]!.npcId
const testTitleId = 'title-medic'

describe('assignTitle', () => {
  it('sets activeTitle on the correct NPC', () => {
    const state = initialGameStateSnapshot
    const next = gameSliceReducer(state, gameActions.assignTitle({ npcId: firstNpcId, titleId: testTitleId }))
    const npc = next.npcRuntimeStates.find((r) => r.npcId === firstNpcId)!
    expect(npc.activeTitle).toBe(testTitleId)
  })

  it('does not affect other NPCs', () => {
    const state = initialGameStateSnapshot
    const next = gameSliceReducer(state, gameActions.assignTitle({ npcId: firstNpcId, titleId: testTitleId }))
    const others = next.npcRuntimeStates.filter((r) => r.npcId !== firstNpcId)
    for (const npc of others) {
      expect(npc.activeTitle).toBeNull()
    }
  })

  it('logs a message containing the role label', () => {
    const state = initialGameStateSnapshot
    const next = gameSliceReducer(state, gameActions.assignTitle({ npcId: firstNpcId, titleId: testTitleId }))
    const logEntry = next.activityLog[0]!
    expect(logEntry.message).toContain('A title conferred')
    expect(logEntry.message).toContain('medic')
  })

  it('no-ops for unknown npcId', () => {
    const state = initialGameStateSnapshot
    const next = gameSliceReducer(state, gameActions.assignTitle({ npcId: 'npc-unknown', titleId: testTitleId }))
    expect(next.npcRuntimeStates).toEqual(state.npcRuntimeStates)
  })

  it('replaces existing title when NPC already has one', () => {
    const state = initialGameStateSnapshot
    const firstAssign = gameSliceReducer(state, gameActions.assignTitle({ npcId: firstNpcId, titleId: testTitleId }))
    const secondAssign = gameSliceReducer(firstAssign, gameActions.assignTitle({ npcId: firstNpcId, titleId: 'title-steward' }))
    const npc = secondAssign.npcRuntimeStates.find((r) => r.npcId === firstNpcId)!
    expect(npc.activeTitle).toBe('title-steward')
  })
})

describe('revokeTitle', () => {
  it('clears activeTitle on the correct NPC', () => {
    const stateWithTitle = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((npc) =>
        npc.npcId === firstNpcId ? { ...npc, activeTitle: testTitleId } : npc,
      ),
    }
    const next = gameSliceReducer(stateWithTitle, gameActions.revokeTitle({ npcId: firstNpcId }))
    const npc = next.npcRuntimeStates.find((r) => r.npcId === firstNpcId)!
    expect(npc.activeTitle).toBeNull()
  })

  it('logs a revocation message', () => {
    const stateWithTitle = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((npc) =>
        npc.npcId === firstNpcId ? { ...npc, activeTitle: testTitleId } : npc,
      ),
    }
    const next = gameSliceReducer(stateWithTitle, gameActions.revokeTitle({ npcId: firstNpcId }))
    const logEntry = next.activityLog[0]!
    expect(logEntry.message).toContain('The title is revoked')
    expect(logEntry.message).toContain('The role sits empty')
  })

  it('no-ops for unknown npcId', () => {
    const state = initialGameStateSnapshot
    const next = gameSliceReducer(state, gameActions.revokeTitle({ npcId: 'npc-unknown' }))
    expect(next.npcRuntimeStates).toEqual(state.npcRuntimeStates)
  })
})
