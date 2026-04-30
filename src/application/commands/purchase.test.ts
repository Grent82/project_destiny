import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { purchaseItemFromShop } from './purchase'

// Use a rich starting state so purchase tests are independent of starting balance
const richState = { ...initialGameStateSnapshot, money: 500 }

describe('purchaseItemFromShop', () => {
  it('deducts money and adds inventory for a valid purchase', () => {
    const nextState = purchaseItemFromShop(
      richState,
      'shop-ironworks-supply',
      'item-spare-parts',
    )

    expect(nextState.money).toBe(430)
    expect(
      nextState.inventory.find((entry) => entry.itemId === 'item-spare-parts')
        ?.quantity,
    ).toBe(4)
    expect(nextState.activityLog[0]?.message).toMatch(/Purchased item-spare-parts/i)
  })

  it('does not change state when the player lacks funds', () => {
    const poorState = {
      ...initialGameStateSnapshot,
      money: 40,
    }

    const nextState = purchaseItemFromShop(
      poorState,
      'shop-harbor-provisions',
      'item-medkit-field',
    )

    expect(nextState).toEqual(poorState)
  })

  it('does not change state when the requested item is not offered', () => {
    const nextState = purchaseItemFromShop(
      richState,
      'shop-heights-ledger-house',
      'item-spare-parts',
    )

    expect(nextState).toEqual(richState)
  })

  it('does not change state when the shopId does not exist', () => {
    const nextState = purchaseItemFromShop(
      richState,
      'shop-does-not-exist',
      'item-spare-parts',
    )

    expect(nextState).toEqual(richState)
  })
})
