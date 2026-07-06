import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LedgerScreen } from './LedgerScreen'
import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'

function renderLedgerScreen(state = initialGameStateSnapshot) {
  const store = createGameStore(state)

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

describe('LedgerScreen — financial runway indicator (destiny-cabf)', () => {
  it('shows the critical alert and shortfall when the debt cannot be met at the current rate (day-1 default state)', () => {
    // At day 1 the player holds 100 Mk against an 800 Mk debt claim -- even with zero net
    // burn, the projected balance at the debt deadline is still short. This is the real,
    // already-true-by-default scenario the ticket's "Runway: --" complaint was about.
    renderLedgerScreen()
    expect(screen.getByRole('alert')).toHaveTextContent(/CRITICAL: Cannot meet debt obligation — short 700 Marks/)
    expect(screen.getByText(/Debt due: Day 30 \(29 days remaining\)/)).toBeInTheDocument()
    expect(screen.getByText(/Shortfall: 700 Marks needed/)).toBeInTheDocument()
    // The old cryptic "--" placeholder must not remain now that a real value is shown.
    expect(screen.getByText('No burn')).toBeInTheDocument()
  })

  it('shows no critical alert or shortfall once projected marks cover the debt', () => {
    renderLedgerScreen({ ...initialGameStateSnapshot, money: 900 })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(/Shortfall/)).toBeNull()
    expect(screen.getByText(/Debt due: Day 30 \(29 days remaining\)/)).toBeInTheDocument()
  })

  it('hides the critical alert and the debt deadline line once the debt is paid, but keeps the runway row', () => {
    renderLedgerScreen({ ...initialGameStateSnapshot, debtPaid: true })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(/Debt due:/)).toBeNull()
    expect(screen.getByText('Runway')).toBeInTheDocument()
  })

  it('hides the critical alert and the debt deadline line once the debt crisis has been triggered (house seized)', () => {
    renderLedgerScreen({ ...initialGameStateSnapshot, debtCrisisTriggered: true })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(/Debt due:/)).toBeNull()
  })
})
