import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { ExpeditionPrepScreen } from './ExpeditionPrepScreen'

function renderExpeditionPrep(storeState = initialGameStateSnapshot) {
  const store = createGameStore(storeState)
  render(
    <AppProviders store={store}>
      <MemoryRouter>
        <ExpeditionPrepScreen />
      </MemoryRouter>
    </AppProviders>,
  )
  return store
}

describe('ExpeditionPrepScreen', () => {
  it('renders Expeditions heading', () => {
    renderExpeditionPrep()
    expect(screen.getByRole('heading', { name: 'Expeditions' })).toBeInTheDocument()
  })

  it('shows expedition destinations', () => {
    renderExpeditionPrep()
    expect(screen.getByText('The Ashfields')).toBeInTheDocument()
    expect(screen.getByText('The Green Corridor')).toBeInTheDocument()
  })

  it('shows danger level for destinations', () => {
    renderExpeditionPrep()
    expect(screen.getAllByText(/danger/i).length).toBeGreaterThan(0)
  })

  it('shows squad selection section', () => {
    renderExpeditionPrep()
    expect(screen.getByRole('heading', { name: 'Squad' })).toBeInTheDocument()
  })

  it('shows supplies section', () => {
    renderExpeditionPrep()
    expect(screen.getByRole('heading', { name: 'Supplies' })).toBeInTheDocument()
  })

  describe('squad stats and status (destiny-1qa2)', () => {
    it('shows health, morale, status, and top skills for each candidate', () => {
      renderExpeditionPrep()

      // Marion Vale's real initial runtime values (data/runtime/initial-game-state.json):
      // health 96, morale 66, stress 21 -> Ready; skills sorted desc: negotiation 68, administration 61, intrigue 41.
      expect(screen.getAllByText(/✓ Ready · Health 96 · Morale 66/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Negotiation 68 · Administration 61 · Intrigue 41/).length).toBeGreaterThan(0)
    })

    it('flags a candidate with low health instead of "Ready"', () => {
      const injuredState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((npc) =>
          npc.npcId === 'npc-marion-vale'
            ? { ...npc, states: { ...npc.states, health: 40 } }
            : npc,
        ),
      }
      renderExpeditionPrep(injuredState)

      expect(screen.getAllByText(/⚠ Low health/).length).toBeGreaterThan(0)
      expect(screen.queryAllByText(/✓ Ready/).length).toBe(0)
    })

    it('flags a candidate with high stress instead of "Ready" when health is fine', () => {
      const stressedState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((npc) =>
          npc.npcId === 'npc-marion-vale'
            ? { ...npc, states: { ...npc.states, stress: 75 } }
            : npc,
        ),
      }
      renderExpeditionPrep(stressedState)

      expect(screen.getAllByText(/⚠ High stress/).length).toBeGreaterThan(0)
      expect(screen.queryAllByText(/✓ Ready/).length).toBe(0)
    })

    it('shows a live Selected count as operatives are checked', async () => {
      const user = userEvent.setup()
      renderExpeditionPrep()

      expect(screen.getAllByText(/Selected: 0/).length).toBeGreaterThan(0)

      const marionCheckboxes = screen.getAllByRole('checkbox')
      await user.click(marionCheckboxes[0])

      expect(screen.getAllByText(/Selected: 1/).length).toBeGreaterThan(0)
    })
  })
})
