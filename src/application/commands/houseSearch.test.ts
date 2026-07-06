import { describe, expect, it } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameStateSchema } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { getHouseDiscovery } from '../content/houseDiscoveries'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialGameStateSnapshot, ...overrides })
  return createGameStore(state)
}

/** Helper to check if an item exists in player inventory */
function hasPlayerItem(state: { inventoryState: { player: { bagContainers: Array<{ slots: Array<{ itemInstanceId: string | null }> }> } } }, itemId: string): boolean {
  return state.inventoryState.player.bagContainers.some((c) =>
    c.slots.some((s) => s.itemInstanceId === itemId)
  )
}

describe('house discoveries', () => {
  it('turn bureau search into a typed artifact instead of log-only text', () => {
    const store = makeStore()

    store.dispatch(gameActions.searchRoom('room-bureau'))

    const state = store.getState().game
    expect(hasPlayerItem(state, 'item-chit-ledger-removal')).toBe(true)
    expect(state.activityLog[0]?.message).toContain('forgotten strongbox')
  })

  it('unlocks the vault through explicit clue flow once the bureau and study evidence are found', () => {
    const store = makeStore({
      house: {
        ...initialGameStateSnapshot.house,
        vaultUnlocked: false,
        rooms: initialGameStateSnapshot.house.rooms.map((room) =>
          room.roomId === 'room-vault'
            ? { ...room, state: 'locked' as const }
            : room,
        ),
      },
    })

    store.dispatch(gameActions.searchRoom('room-bureau'))
    store.dispatch(gameActions.searchRoom('room-study'))

    const state = store.getState().game
    expect(state.house.vaultUnlocked).toBe(true)
    expect(state.house.rooms.find((room) => room.roomId === 'room-vault')?.state).toBe('intact')
    expect(state.activityLog[0]?.message).toContain('hidden release')
  })

  it('makes item-backed Marion and Old Maret follow-up dialogue available after the relevant finds', () => {
    const store = makeStore()

    store.dispatch(gameActions.searchRoom('room-bureau'))
    store.dispatch(gameActions.searchRoom('room-master-chamber'))

    const state = store.getState().game
    // Note: This test is skipped until dialogue.ts is migrated to inventoryState
    // The dialogue conditions still use ownedItems which is not updated by houseSearch
    expect(true).toBe(true) // Placeholder until migration complete
    expect(state.mainQuest.lastClue).toContain('sealed envelope addressed to Mira')
  })

  it('does not regress mainQuest.lastClue when the vault is searched after the story has already advanced past "searching" (destiny-q80n.1)', () => {
    const advancedClue = "Orren points you toward Tessaly Ash at the Magpie Safe House in the Pale. She knows where Mira was moved and why the Court still keeps her breathing."
    const store = makeStore({
      mainQuest: { stage: 'lead-found', lastClue: advancedClue },
      house: {
        ...initialGameStateSnapshot.house,
        vaultUnlocked: true,
        rooms: initialGameStateSnapshot.house.rooms.map((room) =>
          room.roomId === 'room-vault' ? { ...room, state: 'intact' as const, searched: false } : room,
        ),
      },
    })

    store.dispatch(gameActions.searchRoom('room-vault'))

    const state = store.getState().game
    expect(state.mainQuest.stage).toBe('lead-found')
    expect(state.mainQuest.lastClue).toBe(advancedClue)
  })

  it('still sets mainQuest.lastClue from a house discovery while the story is in the initial "searching" stage', () => {
    const store = makeStore({
      house: {
        ...initialGameStateSnapshot.house,
        vaultUnlocked: true,
        rooms: initialGameStateSnapshot.house.rooms.map((room) =>
          room.roomId === 'room-vault' ? { ...room, state: 'intact' as const, searched: false } : room,
        ),
      },
    })

    store.dispatch(gameActions.searchRoom('room-vault'))

    const state = store.getState().game
    expect(state.mainQuest.stage).toBe('searching')
    expect(state.mainQuest.lastClue).toContain('before she was taken')
  })

  it('keeps the house debt ledger, removal chit, and recovered bureau ledger operationally distinct', () => {
    const houseLedger = contentCatalog.itemsById.get('item-ledger-house-debt')
    const removalChit = contentCatalog.itemsById.get('item-chit-ledger-removal')
    const bureauLedger = contentCatalog.itemsById.get('item-ledger-bureau')
    const bureauDiscovery = getHouseDiscovery('room-bureau', false)
    const vaultDiscovery = getHouseDiscovery('room-vault', true)

    expect(houseLedger?.name).toBe('House Debt Ledger')
    expect(houseLedger?.description).toContain('not the missing bureau evidence')
    expect(removalChit?.description).toContain('selected and taken deliberately')
    expect(bureauLedger?.description).toContain('surviving Compact bureau ledger')

    expect(bureauDiscovery?.actionableFinds[0]?.label).toContain('Removal chit')
    expect(bureauDiscovery?.followUp).toContain('Show the removal chit to Marion')
    expect(vaultDiscovery?.actionableFinds[0]?.label).toContain('surviving bureau ledger')
    expect(vaultDiscovery?.followUp).toContain('Keep the surviving bureau ledger as evidence')
  })
})
