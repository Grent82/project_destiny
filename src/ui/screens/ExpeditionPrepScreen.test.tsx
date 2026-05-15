import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { ExpeditionPrepScreen } from './ExpeditionPrepScreen'

function renderExpeditionPrep() {
  const store = createGameStore(initialGameStateSnapshot)
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
})
