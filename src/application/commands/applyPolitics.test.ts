import { describe, expect, it } from 'vitest'

import { applyPolitics } from './applyPolitics'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameStateSchema } from '../../domain'

describe('applyPolitics debt creditor interest', () => {
  it('uses worse creditor standing to increase daily debt interest', () => {
    const favorable = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      day: 16,
      debtAmount: 800,
      debtPaid: false,
      debtCreditorFactionId: 'faction-gilded-court',
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 35,
      },
    })

    const hostile = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      day: 16,
      debtAmount: 800,
      debtPaid: false,
      debtCreditorFactionId: 'faction-gilded-court',
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': -55,
      },
    })

    const favorableNext = applyPolitics(favorable, () => 0.5)
    const hostileNext = applyPolitics(hostile, () => 0.5)

    expect(favorableNext.debtAmount).toBe(805)
    expect(hostileNext.debtAmount).toBe(820)
  })
})
