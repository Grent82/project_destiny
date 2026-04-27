import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  createGameStore,
  gameActions,
  type SaveGameStore,
} from '../../application'
import type { GameState } from '../../domain'
import { AppProviders } from '../app/AppProviders'
import { DashboardScreen } from './DashboardScreen'

function createMemorySaveStore(): SaveGameStore {
  let snapshot: GameState | null = null

  return {
    load() {
      return snapshot
    },
    save(state) {
      snapshot = state
    },
    clear() {
      snapshot = null
    },
  }
}

describe('DashboardScreen', () => {
  it('keeps load disabled until a snapshot exists', () => {
    const store = createGameStore()
    const saveStore = createMemorySaveStore()

    render(
      <AppProviders store={store}>
        <DashboardScreen saveStore={saveStore} />
      </AppProviders>,
    )

    expect(screen.getByRole('button', { name: 'Load session' })).toBeDisabled()
    expect(
      screen.getByText('Loading replaces the current in-memory session.'),
    ).toBeInTheDocument()
  })

  it('saves and restores the current session through the UI controls', async () => {
    const user = userEvent.setup()
    const store = createGameStore()
    const saveStore = createMemorySaveStore()

    render(
      <AppProviders store={store}>
        <DashboardScreen saveStore={saveStore} />
      </AppProviders>,
    )

    expect(screen.getByText('300 Marks')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save session' }))

    expect(screen.getByRole('button', { name: 'Load session' })).toBeEnabled()

    act(() => {
      store.dispatch(
        gameActions.purchaseItemFromShop({
          shopId: 'shop-harbor-provisions',
          itemId: 'item-medkit-field',
        }),
      )
    })

    expect(screen.getByText('205 Marks')).toBeInTheDocument()
    expect(screen.getByText(/Purchased item-medkit-field/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Load session' }))

    expect(screen.getByText('300 Marks')).toBeInTheDocument()
    expect(screen.getByText('Session restored from local snapshot.')).toBeInTheDocument()
  })
})
