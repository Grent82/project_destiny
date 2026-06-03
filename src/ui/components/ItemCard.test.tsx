import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ItemCard } from './ItemCard'
import { TargetPickerModal } from './TargetPickerModal'
import { createGameStore } from '../../application/store/gameStore'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import type { ItemAction } from '../../application/selectors/inventory'

describe('ItemCard', () => {
  it('renders item name and category', () => {
    render(
      <ItemCard
        instanceId="inst-01"
        name="Herbal Tonic"
        category="consumable"
        description="Steadies the hands after a long shift."
        quantity={1}
        onAction={() => {}}
      />
    )
    expect(screen.getByText('Herbal Tonic')).toBeTruthy()
    expect(screen.getByText('consumable')).toBeTruthy()
    expect(screen.getByText('Steadies the hands after a long shift.')).toBeTruthy()
  })

  it('renders quantity when > 1', () => {
    render(
      <ItemCard
        instanceId="inst-01"
        name="Herbal Tonic"
        category="consumable"
        quantity={3}
        onAction={() => {}}
      />
    )
    expect(screen.getByText('×3')).toBeTruthy()
  })

  it('renders primary action button', () => {
    const useAction: ItemAction = { type: 'use', label: 'Use', requiresTarget: false }
    render(
      <ItemCard
        instanceId="inst-01"
        name="Herbal Tonic"
        category="consumable"
        quantity={1}
        primaryAction={useAction}
        onAction={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'Use' })).toBeTruthy()
  })

  it('renders overflow menu button when onOpenMenu is provided', () => {
    render(
      <ItemCard
        instanceId="inst-01"
        name="Herbal Tonic"
        category="consumable"
        quantity={1}
        onAction={() => {}}
        onOpenMenu={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'More actions' })).toBeTruthy()
  })
})

describe('TargetPickerModal', () => {
  it('shows empty state when roster is empty', () => {
    const emptyRosterState = { ...initialGameStateSnapshot, roster: [] }
    const store = createGameStore(emptyRosterState)
    render(
      <TargetPickerModal
        state={store.getState()}
        onSelect={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('No available targets')).toBeTruthy()
  })

  it('renders close button', () => {
    const store = createGameStore()
    render(
      <TargetPickerModal
        state={store.getState()}
        onSelect={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
  })
})
