import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { getCorridorReopeningProgress, reopenCorridor } from './applyCorridorImport'
import { gameStateSchema } from '../../domain'

describe('corridor reopening progress runtime', () => {
  it('tracks blocked-corridor clearance on dedicated city resource state instead of lastFiredDay', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked',
      },
      lastFiredDay: {},
    })

    const result = reopenCorridor(state)

    expect(result.cityResources.corridorClearanceProgressDays).toBe(1)
    expect(result.lastFiredDay.corridorClearance).toBeUndefined()
  })

  it('resets dedicated progress after reopening blocked corridor to disrupted', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'blocked',
        corridorClearanceProgressDays: 2,
      },
      lastFiredDay: {},
    })

    const result = reopenCorridor(state)

    expect(result.cityResources.corridorStatus).toBe('disrupted')
    expect(result.cityResources.corridorClearanceProgressDays).toBe(0)
    expect(result.lastFiredDay.corridorClearance).toBeUndefined()
  })

  it('reports remaining days from dedicated corridor progress state', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        corridorStatus: 'disrupted',
        corridorClearanceProgressDays: 1,
      },
    })

    expect(getCorridorReopeningProgress(state)).toEqual({
      currentStatus: 'disrupted',
      daysProgress: 1,
      daysRemaining: 1,
    })
  })
})
