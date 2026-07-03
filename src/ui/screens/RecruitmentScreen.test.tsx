import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { RecruitmentScreen } from './RecruitmentScreen'

describe('RecruitmentScreen', () => {
  it('shows rarity guidance inline on offers instead of a disconnected explainer panel', () => {
    const store = createGameStore(initialGameStateSnapshot)

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <RecruitmentScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Available for Service' })).toBeInTheDocument()
    expect(screen.getAllByText(/Rare hands reach elite ceilings/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Skill cap: 90/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Treasury: 100 Marks/i)).toBeInTheDocument()
  })
})
