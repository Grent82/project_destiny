import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  createGameStore,
  gameActions,
  type SaveGameStore,
} from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import type { GameState } from '../../domain'
import { createQuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../../application/content/contentCatalog'
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
  it('surfaces a clear recommended next quest action in overview', () => {
    const harborwatch = getQuestTemplates().find((quest) => quest.id === 'quest-harborwatch')
    if (!harborwatch) {
      throw new Error('Expected harborwatch quest in test fixtures.')
    }

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-pale',
      activeQuests: [createQuestRuntime(harborwatch, 1)],
      availableQuests: [],
    })

    render(
      <AppProviders store={store}>
        <DashboardScreen saveStore={createMemorySaveStore()} />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'What next' })).toBeInTheDocument()
    expect(screen.getByText('Travel to The Warrens')).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('keeps load disabled until a snapshot exists', async () => {
    const user = userEvent.setup()
    const store = createGameStore()
    const saveStore = createMemorySaveStore()

    render(
      <AppProviders store={store}>
        <DashboardScreen saveStore={saveStore} />
      </AppProviders>,
    )

    await user.click(screen.getByRole('tab', { name: 'Operations' }))

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

    await user.click(screen.getByRole('tab', { name: 'Operations' }))
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

    await user.click(screen.getByRole('tab', { name: 'Intelligence' }))
    expect(screen.getByText(/Purchased item-medkit-field/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Operations' }))
    await user.click(screen.getByRole('button', { name: 'Load session' }))

    expect(screen.getByText('Session restored from local snapshot.')).toBeInTheDocument()
  })
})
