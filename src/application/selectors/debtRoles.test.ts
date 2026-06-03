import { describe, expect, it } from 'vitest'

import { selectDebtStatus } from './dashboard'
import { selectLedgerSummary } from './ledger'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'

describe('debt role selectors', () => {
  it('surfaces claimant, enforcement, and beneficiary separately', () => {
    const store = createGameStore(initialGameStateSnapshot)
    const state = store.getState()

    const debt = selectDebtStatus(state)
    const ledger = selectLedgerSummary(state)

    expect(debt.debtClaimantName).toBe('Harlen Voss')
    expect(debt.debtEnforcementName).toBe('Gilded Court')
    expect(debt.debtBeneficiaryName).toBe('House Merrow')
    expect(ledger.debtClaimantName).toBe('Harlen Voss')
    expect(ledger.debtEnforcementName).toBe('Gilded Court')
    expect(ledger.debtBeneficiaryName).toBe('House Merrow')
  })
})
