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

  it('shows quest-specific investigation approaches for Old Ledgers', () => {
    const oldLedgers = getQuestTemplates().find((quest) => quest.id === 'quest-orren-wex-rescue')
    if (!oldLedgers) {
      throw new Error('Expected Old Ledgers quest in fixtures.')
    }

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-hollows',
      activeQuests: [createQuestRuntime(oldLedgers, 1)],
      activeInvestigation: {
        questId: 'quest-orren-wex-rescue',
        districtId: 'district-the-hollows',
        rollResult: 'pending',
        stage: 'approach-selection',
        chosenApproachId: null,
        clueText: null,
      },
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Buy the Door' })).toBeInTheDocument()
    expect(screen.getByText(/Compact-adjacent staff/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Custody Ledger' })).toBeInTheDocument()
  })

  it('shows discovered operational leads during ready-to-resolve investigations', () => {
    const restoredAppeal = getQuestTemplates().find((quest) => quest.id === 'quest-restored-appeal')
    if (!restoredAppeal) {
      throw new Error('Expected The Restored Ask a Favor quest in fixtures.')
    }

    const runtime = createQuestRuntime(restoredAppeal, 1)
    runtime.clues = [
      {
        clueId: 'restored-appeal-east-corridor',
        label: 'The east corridor opens a clean retrieval line during clerk relief.',
        discovered: true,
        discoveredOnDay: 1,
        usedInBranchId: 'surveillance',
      },
    ]

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-warrens',
      activeQuests: [runtime],
      activeInvestigation: {
        questId: 'quest-restored-appeal',
        districtId: null,
        rollResult: 'pending',
        stage: 'ready-to-resolve',
        chosenApproachId: 'surveillance',
        clueText: 'The sealing clerk always crosses the east corridor alone after the bell.',
      },
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Operational Leads' })).toBeInTheDocument()
    expect(screen.getByText(/clean retrieval line during clerk relief/i)).toBeInTheDocument()
  })
})
