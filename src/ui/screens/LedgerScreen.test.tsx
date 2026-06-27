import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LedgerScreen } from './LedgerScreen'
import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'

function renderLedgerScreen() {
  const store = createGameStore(initialGameStateSnapshot)

  return render(
    <AppProviders store={store}>
      <LedgerScreen />
    </AppProviders>,
  )
}

describe('LedgerScreen', () => {
  it('renders the main heading', () => {
    renderLedgerScreen()
    expect(screen.getByRole('heading', { name: /The Ledger/i })).toBeInTheDocument()
  })

  it('renders the eyebrow label', () => {
    renderLedgerScreen()
    expect(screen.getByText(/House Accounts/i)).toBeInTheDocument()
  })

  it('renders the summary text', () => {
    renderLedgerScreen()
    expect(screen.getByText(/The founding legal record/i)).toBeInTheDocument()
  })
})
