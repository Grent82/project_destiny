import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { applyFactionActivity } from './applyFactionActivity'

describe('applyFactionActivity', () => {
  it('lets trade-focused faction activity improve shared economic conditions', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 6,
    }

    const next = applyFactionActivity(state)

    expect(next.cityDials.prosperity).toBeGreaterThan(state.cityDials.prosperity)
    expect(next.cityResources.foodSecurity).toBeGreaterThanOrEqual(state.cityResources.foodSecurity)
  })

  it('lets black-market faction activity deepen corruption and ward pressure', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 3,
    }

    const next = applyFactionActivity(state)

    expect(next.cityDials.corruption).toBeGreaterThan(state.cityDials.corruption)
    expect(next.districtTension['district-harbor']).toBeGreaterThan(state.districtTension['district-harbor'])
  })
})
