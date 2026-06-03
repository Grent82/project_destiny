import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createGameStore } from '../../application/store/gameStore'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { HouseStoragePanel } from './HouseStoragePanel'
import { MissionPackPanel } from './MissionPackPanel'

function renderWithStore(ui: React.ReactNode, state = initialGameStateSnapshot) {
  const store = createGameStore(state)
  render(<AppProviders store={store}>{ui}</AppProviders>)
  return store
}

describe('HouseStoragePanel', () => {
  it('opens a document preview for inventory documents', async () => {
    const user = userEvent.setup()
    renderWithStore(<HouseStoragePanel />)

    await user.click(screen.getByRole('button', { name: 'Open' }))

    const preview = screen.getByRole('dialog', { name: 'House Debt Ledger preview' })
    expect(within(preview).getByText('House Debt Ledger')).toBeInTheDocument()
    expect(within(preview).getByText(/not the missing bureau evidence/i)).toBeInTheDocument()
  })
})

describe('MissionPackPanel', () => {
  it('opens a document preview for packed documents', async () => {
    const user = userEvent.setup()
    const packedState = {
      ...initialGameStateSnapshot,
      ownedItems: initialGameStateSnapshot.ownedItems.map((item) =>
        item.itemId === 'item-ledger-house-debt'
          ? { ...item, location: 'mission_pack' as const }
          : item,
      ),
    }

    renderWithStore(<MissionPackPanel />, packedState)

    await user.click(screen.getByRole('button', { name: 'Open' }))

    const preview = screen.getByRole('dialog', { name: 'House Debt Ledger preview' })
    expect(within(preview).getByText('House Debt Ledger')).toBeInTheDocument()
    expect(within(preview).getByText(/not the missing bureau evidence/i)).toBeInTheDocument()
  })
})
