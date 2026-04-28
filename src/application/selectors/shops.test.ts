import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { selectShopsInCurrentDistrict } from './shops'
import type { GameState } from '../../domain'

function makeRootState(game: GameState) {
  return { game }
}

describe('selectShopsInCurrentDistrict', () => {
  it('returns shops matching currentDistrictId', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-warrens',
    })
    const shops = selectShopsInCurrentDistrict(
      state as Parameters<typeof selectShopsInCurrentDistrict>[0],
    )
    expect(shops.length).toBeGreaterThan(0)
    expect(shops.every((s) => s.districtId === 'district-the-warrens')).toBe(true)
  })

  it('returns empty array when currentDistrictId is null', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: null,
    })
    const shops = selectShopsInCurrentDistrict(
      state as Parameters<typeof selectShopsInCurrentDistrict>[0],
    )
    expect(shops).toEqual([])
  })

  it('returns empty array when district has no shops', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-nonexistent',
    })
    const shops = selectShopsInCurrentDistrict(
      state as Parameters<typeof selectShopsInCurrentDistrict>[0],
    )
    expect(shops).toEqual([])
  })
})
