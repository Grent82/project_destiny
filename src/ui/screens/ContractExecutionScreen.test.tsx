import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { getQuestTemplates } from '../../application/content/contentCatalog'
import { createQuestRuntime } from '../../domain/quests/contracts'
import { AppProviders } from '../app/AppProviders'
import { ContractExecutionScreen } from './ContractExecutionScreen'

describe('ContractExecutionScreen', () => {
  it('executes a delivery contract on-site, advances time, and completes the quest', async () => {
    const user = userEvent.setup()
    const deliveryQuest = getQuestTemplates().find((quest) => quest.id === 'quest-nightbloom-extract')
    if (!deliveryQuest) {
      throw new Error('Expected delivery quest in fixtures.')
    }

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-hollows',
      timeSlot: 'morning',
      activeQuests: [createQuestRuntime(deliveryQuest, 1)],
      completedQuestIds: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/contracts/quest-nightbloom-extract/execute']}>
          <Routes>
            <Route path="/contracts/:questId/execute" element={<ContractExecutionScreen />} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'On-Site Handoff' })).toBeInTheDocument()
    expect(screen.getByText(/Duration: 1 watch/i)).toBeInTheDocument()
    expect(screen.queryByText(/the handoff can only happen/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Spend the watch and make the handoff/i }))

    const state = store.getState().game
    expect(state.timeSlot).toBe('afternoon')
    expect(state.completedQuestIds).toContain('quest-nightbloom-extract')
    expect(state.activeQuests.find((quest) => quest.questId === 'quest-nightbloom-extract')).toBeUndefined()
  })
})
