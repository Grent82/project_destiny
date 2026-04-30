import { describe, expect, it } from 'vitest'

import { createGameStore } from './gameStore'
import { gameActions } from './gameSlice'
import { initialGameStateSnapshot } from './initialGameState'
import { gameStateSchema } from '../../domain'

function makeRichStore() {
  // Use explicit money=500 so debt tests are independent of starting balance
  const state = gameStateSchema.parse({ ...initialGameStateSnapshot, money: 500 })
  return createGameStore(state)
}

describe('payDebt action', () => {
  it('partial payment reduces debtAmount without settling the debt', () => {
    const store = makeRichStore()
    store.dispatch(gameActions.payDebt({ amount: 100 }))
    const state = store.getState().game
    expect(state.debtAmount).toBe(400)
    expect(state.money).toBe(400)
    expect(state.debtPaid).toBe(false)
  })

  it('full payment sets debtPaid to true and zeroes debtAmount', () => {
    const store = makeRichStore()
    store.dispatch(gameActions.payDebt({ amount: 500 }))
    const state = store.getState().game
    expect(state.debtAmount).toBe(0)
    expect(state.debtPaid).toBe(true)
  })

  it('cannot pay more marks than the player has — marks clamped at 0', () => {
    const store = makeRichStore()
    store.dispatch(gameActions.payDebt({ amount: 9999 }))
    const state = store.getState().game
    expect(state.money).toBe(0)
    expect(state.debtAmount).toBe(0)
    expect(state.debtPaid).toBe(true)
  })
})
