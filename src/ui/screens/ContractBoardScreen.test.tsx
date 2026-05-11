import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { createQuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../../application/content/contentCatalog'
import { AppProviders } from '../app/AppProviders'
import { ContractBoardScreen } from './ContractBoardScreen'

describe('ContractBoardScreen', () => {
  it('shows issuer and origin for available leads and can accept them into active contracts', async () => {
    const user = userEvent.setup()
    const store = createGameStore({
      ...initialGameStateSnapshot,
      availableQuests: ['quest-harborwatch'],
      activeQuests: [],
      completedQuestIds: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ContractBoardScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Available Leads' })).toBeInTheDocument()
    expect(screen.getByText(/Issuer:/i)).toBeInTheDocument()
    expect(screen.getByText(/Civic Compact/i)).toBeInTheDocument()
    expect(screen.getByText(/Posted at Harbor Guild Hall in Harbor Ward/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accept contract' }))

    expect(store.getState().game.activeQuests).toHaveLength(1)
    expect(store.getState().game.activeQuests[0]?.questId).toBe('quest-harborwatch')
  })

  it('sends combat contracts to travel first when the player is not at the incident site', () => {
    const harborwatch = getQuestTemplates().find((quest) => quest.id === 'quest-harborwatch')
    if (!harborwatch) {
      throw new Error('Expected harborwatch quest in test fixtures.')
    }

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-pale',
      activeQuests: [createQuestRuntime(harborwatch, 1)],
      availableQuests: [],
      completedQuestIds: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ContractBoardScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('button', { name: /Travel to incident site/i })).toBeInTheDocument()
    expect(screen.getByText(/Next step:/i)).toBeInTheDocument()
    expect(screen.getAllByText('Travel to The Warrens').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', { name: 'Recommended Next Step' }),
    ).toBeInTheDocument()
  })

  it('routes delivery contracts into an on-site execution step instead of instant completion', () => {
    const deliveryQuest = getQuestTemplates().find((quest) => quest.id === 'quest-nightbloom-extract')
    if (!deliveryQuest) {
      throw new Error('Expected delivery quest in fixtures.')
    }

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-hollows',
      activeQuests: [createQuestRuntime(deliveryQuest, 1)],
      availableQuests: [],
      completedQuestIds: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ContractBoardScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('button', { name: /Open on-site handoff/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Complete Delivery/i })).not.toBeInTheDocument()
  })
})
