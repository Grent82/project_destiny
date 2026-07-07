import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

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

  describe('Back button navigation (destiny-yxfo)', () => {
    it('always navigates to Roster, regardless of venue entry point', () => {
      const store = createGameStore(initialGameStateSnapshot)

      render(
        <AppProviders store={store}>
          <MemoryRouter initialEntries={['/recruitment']}>
            <RecruitmentScreen />
          </MemoryRouter>
        </AppProviders>,
      )

      expect(screen.getByRole('button', { name: /Back to Roster/i })).toBeInTheDocument()
    })

    it('always says and does "Back to Roster" even when opened from a district POI, leaving POI return to VenueContextBanner alone', async () => {
      const user = userEvent.setup()
      const store = createGameStore(initialGameStateSnapshot)

      render(
        <AppProviders store={store}>
          <MemoryRouter initialEntries={['/recruitment?district=district-harbor&poi=poi-harbor-guild-hall']}>
            <Routes>
              <Route path="/recruitment" element={<RecruitmentScreen />} />
              <Route path="/district/:districtId/poi/:poiId" element={<div>POI Detail Screen</div>} />
              <Route path="/roster" element={<div>Roster Screen</div>} />
            </Routes>
          </MemoryRouter>
        </AppProviders>,
      )

      // VenueContextBanner already renders its own, unduplicated "Back to <POI>" button --
      // RecruitmentScreen's own Back button used to render an identical second copy of that
      // exact label/behavior. It now always means "back to roster" instead.
      expect(screen.getByRole('button', { name: /Back to Harbor Guild Hall/i })).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /Roster/i })).toHaveLength(1)

      await user.click(screen.getByRole('button', { name: /Back to Roster/i }))
      expect(screen.getByText('Roster Screen')).toBeInTheDocument()
    })
  })
})
