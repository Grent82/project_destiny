import { describe, expect, it } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameStateSchema } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { isDialogueChoiceAvailable } from './dialogue'
import { getHouseDiscovery } from '../content/houseDiscoveries'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialGameStateSnapshot, ...overrides })
  return createGameStore(state)
}

describe('house discoveries', () => {
  it('turn bureau search into a typed artifact instead of log-only text', () => {
    const store = makeStore()

    store.dispatch(gameActions.searchRoom('room-bureau'))

    const state = store.getState().game
    expect(state.ownedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'item-chit-ledger-removal', quantity: 1, location: 'inventory' }),
      ]),
    )
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
      ownedItems: [],
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
    const marionTree = contentCatalog.dialoguesById.get('dialogue-marion-vale')
    const maretTree = contentCatalog.dialoguesById.get('dialogue-old-maret')
    const marionChoice = marionTree?.nodes.find((node) => node.id === 'marion-node-1')?.choices.find((choice) => choice.id === 'marion-choice-ledger-chit')
    const maretChoice = maretTree?.nodes.find((node) => node.id === 'maret-node-1')?.choices.find((choice) => choice.id === 'maret-choice-ring')

    expect(marionChoice && isDialogueChoiceAvailable(state, 'dialogue-marion-vale', marionChoice)).toBe(true)
    expect(maretChoice && isDialogueChoiceAvailable(state, 'dialogue-old-maret', maretChoice)).toBe(true)
    expect(state.mainQuest.lastClue).toContain('sealed envelope addressed to Mira')
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
