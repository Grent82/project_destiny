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
  it('executes a delivery contract on-site with two-step progression', async () => {
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

    // Step 1: Make contact (intermediate step)
    await user.click(screen.getByRole('button', { name: /Make contact and set the terms/i }))
    // After step 1, the final button should appear
    expect(screen.getByRole('button', { name: /Spend the watch and make the handoff/i })).toBeInTheDocument()

    // Step 2: Execute the handoff
    await user.click(screen.getByRole('button', { name: /Spend the watch and make the handoff/i }))

    const state = store.getState().game
    expect(state.timeSlot).toBe('afternoon')
    expect(state.completedQuestIds).toContain('quest-nightbloom-extract')
    expect(state.activeQuests.find((quest) => quest.questId === 'quest-nightbloom-extract')).toBeUndefined()
  })

  it('shows remaining duration and requires a second watch for multi-watch survival work', async () => {
    const user = userEvent.setup()
    const survivalQuest = getQuestTemplates().find((quest) => quest.id === 'quest-pale-wagon-escort')
    if (!survivalQuest) {
      throw new Error('Expected survival quest in fixtures.')
    }

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-pale',
      timeSlot: 'morning',
      activeQuests: [createQuestRuntime(survivalQuest, 1)],
      completedQuestIds: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/contracts/quest-pale-wagon-escort/execute']}>
          <Routes>
            <Route path="/contracts/:questId/execute" element={<ContractExecutionScreen />} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: /Establish position on-site/i }))
    expect(screen.getByText(/Duration remaining:/i)).toBeInTheDocument()
    expect(screen.getByText(/2 watches remaining/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Hold through the watch/i }))
    expect(store.getState().game.completedQuestIds).not.toContain('quest-pale-wagon-escort')
    expect(store.getState().game.activeQuests.find((quest) => quest.questId === 'quest-pale-wagon-escort')).toBeDefined()
  })
})
