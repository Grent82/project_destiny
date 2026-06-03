import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { createQuestLeadRuntime, createQuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../../application/content/contentCatalog'
import { AppProviders } from '../app/AppProviders'
import { ContractBoardScreen } from './ContractBoardScreen'

function makeLead(questId: string, day = 1) {
  const template = getQuestTemplates().find((quest) => quest.id === questId)
  if (!template) {
    throw new Error(`Expected quest template in test fixtures: ${questId}`)
  }

  return createQuestLeadRuntime(template, day)
}

describe('ContractBoardScreen', () => {
  it('shows issuer and origin for available leads and can accept them into active contracts', async () => {
    const user = userEvent.setup()
    const store = createGameStore({
      ...initialGameStateSnapshot,
      availableQuestLeads: [makeLead('quest-harborwatch')],
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
    expect(screen.getByText(/Payer:/i)).toBeInTheDocument()
    expect(screen.getByText(/Stakeholder:/i)).toBeInTheDocument()
    expect(screen.getByText(/Likely fallout:/i)).toBeInTheDocument()
    expect(screen.getByText(/Civic Compact/i)).toBeInTheDocument()
    expect(screen.getByText(/Posted at Harbor Guild Hall in Harbor Ward/i)).toBeInTheDocument()
    expect(screen.getByText(/Compact quartermasters release the fee only if the checkpoint is cleaned up quietly/i)).toBeInTheDocument()
    expect(screen.getByText(/Harbor gate wardens and dockside traffic trapped inside the shakedown/i)).toBeInTheDocument()
    expect(screen.getByText(/Compact standing \+8; Unrest -5/i)).toBeInTheDocument()

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
      availableQuestLeads: [],
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
    // Next step is surfaced within the active contract card itself — no separate panel needed
    expect(screen.getByText(/Next step:/i)).toBeInTheDocument()
    expect(screen.getAllByText('Travel to The Warrens').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0)
    // "Recommended Next Step" panel removed — next step info lives in the active contract row
    expect(screen.queryByRole('heading', { name: 'Recommended Next Step' })).toBeNull()
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
      availableQuestLeads: [],
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

  it('shows active quest journal entries and consequence history for tracked contracts', () => {
    const storyQuest = getQuestTemplates().find((quest) => quest.id === 'quest-mira-rescue')
    if (!storyQuest) {
      throw new Error('Expected story quest in fixtures.')
    }

    const runtime = createQuestRuntime(storyQuest, 3)
    runtime.stageId = 'briefed-by-tessaly'
    runtime.currentObjectiveLabel = 'Reach the old tannery in The Pale before the Court moves Mira again.'
    runtime.journalEntries = [
      'Marion found the old ledgers wrapped in oilcloth beneath the stair.',
      'A ledger chit survived the fire. Tessaly Wode may know what the mark means.',
    ]
    runtime.aftermath = {
      narrativeSummary: 'The house now owes Tessaly an answer about the missing pages.',
      factionImpacts: [{ factionId: 'faction-restored', delta: 3 }],
      unlockNpcIds: ['npc-tessaly-wode'],
      worldConsequenceIds: [],
    }

    const store = createGameStore({
      ...initialGameStateSnapshot,
      day: 5,
      currentDistrictId: 'district-harbor-ward',
      activeQuests: [runtime],
      availableQuestLeads: [],
      completedQuestIds: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ContractBoardScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Quest Journal' })).toBeInTheDocument()
    expect(screen.getByText(/Marion found the old ledgers wrapped in oilcloth beneath the stair/i)).toBeInTheDocument()
    expect(screen.getByText(/Tessaly Wode may know what the mark means/i)).toBeInTheDocument()
    expect(screen.getByText(/Reach the old tannery in The Pale before the Court moves Mira again/i)).toBeInTheDocument()
    expect(screen.getByText(/Faction impact:/i)).toBeInTheDocument()
    expect(screen.getByText(/The Restored \+3/i)).toBeInTheDocument()
    expect(screen.getByText(/World consequence:/i)).toBeInTheDocument()
    expect(screen.getByText(/Control -8/i)).toBeInTheDocument()
    expect(screen.getByText(/The house now owes Tessaly an answer about the missing pages/i)).toBeInTheDocument()
  })

  it('shows execution duration separately from time limit for active contracts', () => {
    const investigationQuest = getQuestTemplates().find((quest) => quest.id === 'quest-compact-watch')
    if (!investigationQuest) {
      throw new Error('Expected compact watch quest in fixtures.')
    }

    const store = createGameStore({
      ...initialGameStateSnapshot,
      day: 1,
      activeQuests: [createQuestRuntime(investigationQuest, 1)],
      availableQuestLeads: [],
      completedQuestIds: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ContractBoardScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/Time limit:/i)).toBeInTheDocument()
    expect(screen.getByText(/Execution duration:/i)).toBeInTheDocument()
    expect(screen.getByText(/3 days of fieldwork/i)).toBeInTheDocument()
    expect(screen.getByText(/Days remaining:/i)).toBeInTheDocument()
  })

  it('surfaces branch aftermath as a dedicated combat return step on the work board', () => {
    const combatQuest = getQuestTemplates().find((quest) => quest.id === 'quest-harborwatch')
    if (!combatQuest) {
      throw new Error('Expected harborwatch quest in fixtures.')
    }

    const runtime = createQuestRuntime(combatQuest, 2)
    runtime.stageId = 'branch-aftermath'
    runtime.currentObjectiveLabel =
      'The defeat changes the shape of the contract. Return to the Work Board for the aftermath.'
    runtime.progress.completedSteps = 3
    runtime.progress.lastAdvancedDay = 2
    runtime.journalEntries = [
      'The squad commits to the incident site and the fighting begins.',
      'The defeat changes the shape of the contract. The next move is no longer straightforward.',
    ]

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: combatQuest.districtId,
      activeQuests: [runtime],
      availableQuestLeads: [],
      completedQuestIds: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ContractBoardScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText('Combat aftermath')).toBeInTheDocument()
    expect(screen.getByText(/Choose the aftermath on the Work Board before the contract can move again/i)).toBeInTheDocument()
    expect(screen.getByText(/Next step:/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Review combat aftermath →/i })).toBeInTheDocument()
  })

  it('surfaces combat setbacks as regroup-required instead of another immediate deployment', () => {
    const combatQuest = getQuestTemplates().find((quest) => quest.id === 'quest-harborwatch')
    if (!combatQuest) {
      throw new Error('Expected harborwatch quest in fixtures.')
    }

    const runtime = createQuestRuntime(combatQuest, 2)
    runtime.stageId = 'setback'
    runtime.currentObjectiveLabel =
      'The squad was driven back. Regroup before attempting the incident again.'
    runtime.progress.completedSteps = 3
    runtime.progress.lastAdvancedDay = 2
    runtime.journalEntries = [
      'The squad commits to the incident site and the fighting begins.',
      'The squad was driven back. The contract remains open, but the house must regroup.',
    ]

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: combatQuest.districtId,
      activeQuests: [runtime],
      availableQuestLeads: [],
      completedQuestIds: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ContractBoardScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText('Regroup required')).toBeInTheDocument()
    expect(screen.getByText(/The squad needs a regroup order before another on-site push/i)).toBeInTheDocument()
    expect(screen.getByText(/Regroup the squad on the Work Board/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Regroup and redeploy →/i })).toBeInTheDocument()
  })
})
