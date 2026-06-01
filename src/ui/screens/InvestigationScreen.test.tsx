import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { createQuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../../application/content/contentCatalog'
import { AppProviders } from '../app/AppProviders'
import { InvestigationScreen } from './InvestigationScreen'

describe('InvestigationScreen', () => {
  it('renders Investigation heading', () => {
    const store = createGameStore(initialGameStateSnapshot)
    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )
    expect(screen.getByRole('heading', { name: 'Investigation' })).toBeInTheDocument()
  })

  it('shows empty-state message when no active investigation', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      activeQuests: [],
    })
    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )
    expect(screen.getByText(/No investigation is currently active/i)).toBeInTheDocument()
  })

  it('renders the House Valdris eyebrow', () => {
    const store = createGameStore(initialGameStateSnapshot)
    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )
    expect(screen.getByText('House Valdris')).toBeInTheDocument()
  })

  it('shows per-operative breakdown for the last investigation result', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      activeQuests: [],
      lastInvestigationResult: {
        questId: 'quest-ledger-recovery',
        districtId: 'district-the-pale',
        outcome: 'success',
        chosenApproachId: 'bribe',
        clueText: 'A paid informant tips a name.',
        operativeResults: [
          {
            npcId: 'npc-marion-vale',
            operativeName: 'Marion Vale',
            skillUsed: 'negotiation',
            skillValue: 68,
            rollValue: 6,
            effectiveRoll: 19,
            outcome: 'partial',
          },
        ],
      },
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Investigation Complete' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Operative Breakdown' })).toBeInTheDocument()
    expect(screen.getByText(/Marion Vale/)).toBeInTheDocument()
    expect(screen.getByText(/negotiation 68 · roll 6 · effective 19/i)).toBeInTheDocument()
  })

  it('spends a watch when running an investigation', async () => {
    const user = userEvent.setup()
    const compactWatch = getQuestTemplates().find((quest) => quest.id === 'quest-compact-watch')
    if (!compactWatch) {
      throw new Error('Expected compact watch quest in fixtures.')
    }

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-pale',
      timeSlot: 'morning',
      activeQuests: [createQuestRuntime(compactWatch, 1)],
      activeInvestigation: {
        questId: 'quest-compact-watch',
        districtId: 'district-the-pale',
        rollResult: 'pending',
        stage: 'ready-to-resolve',
        chosenApproachId: 'surveillance',
        clueText: 'A clue was found.',
      },
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /Run the Investigation/i }))

    expect(store.getState().game.timeSlot).toBe('afternoon')
  })
})
