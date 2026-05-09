import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { RecruitmentScreen } from './RecruitmentScreen'

describe('RecruitmentScreen', () => {
  it('explains rarity as a gameplay-facing quality band instead of a bare label', () => {
    const store = createGameStore(initialGameStateSnapshot)

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <RecruitmentScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Quality Bands' })).toBeInTheDocument()
    expect(screen.getByText(/They tell you how high an operative can be trained/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Rare hands reach elite ceilings/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Skill cap: 90/i).length).toBeGreaterThan(0)
  })
})
