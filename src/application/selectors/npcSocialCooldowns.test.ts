import { describe, it, expect } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { idaRhysRosterEntry } from '../commands/testFixtures'
import { deepConversation } from '../commands/deepConversation'
import { courtNpc } from '../commands/courtNpc'
import { selectNpcSocialCooldowns } from './npcSocialCooldowns'

function storeWithIda() {
  return createGameStore({
    ...initialGameStateSnapshot,
    npcRuntimeStates: [...initialGameStateSnapshot.npcRuntimeStates, idaRhysRosterEntry],
    currentDistrictId: initialGameStateSnapshot.houseDistrictId,
  })
}

describe('selectNpcSocialCooldowns', () => {
  it('reports no cooldown before either action has been used today', () => {
    const store = storeWithIda()
    const result = selectNpcSocialCooldowns(idaRhysRosterEntry.npcId)(store.getState())

    expect(result.deepConversationOnCooldown).toBe(false)
    expect(result.courtshipOnCooldown).toBe(false)
  })

  it('reports deepConversationOnCooldown after a deep conversation fires today, without affecting courtship', () => {
    const store = storeWithIda()
    const next = deepConversation(store.getState().game, idaRhysRosterEntry.npcId)
    const result = selectNpcSocialCooldowns(idaRhysRosterEntry.npcId)({ game: next })

    expect(result.deepConversationOnCooldown).toBe(true)
    expect(result.courtshipOnCooldown).toBe(false)
  })

  it('reports courtshipOnCooldown after courting fires today, without affecting deep conversation', () => {
    const store = storeWithIda()
    const next = courtNpc(store.getState().game, idaRhysRosterEntry.npcId)
    const result = selectNpcSocialCooldowns(idaRhysRosterEntry.npcId)({ game: next })

    expect(result.deepConversationOnCooldown).toBe(false)
    expect(result.courtshipOnCooldown).toBe(true)
  })

  it('does not confuse cooldowns between two different NPCs', () => {
    const store = storeWithIda()
    const next = courtNpc(store.getState().game, idaRhysRosterEntry.npcId)
    const otherResult = selectNpcSocialCooldowns('npc-marion-vale')({ game: next })

    expect(otherResult.courtshipOnCooldown).toBe(false)
  })
})
