import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
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
})
