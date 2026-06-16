import { describe, expect, it } from 'vitest'

import type { GameState } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { selectEventPresentation } from './events'

function makeState(overrides: Partial<GameState> = {}) {
  return {
    ...initialGameStateSnapshot,
    pendingEvents: [],
    eventInstances: [],
    ...overrides,
  }
}

describe('selectEventPresentation', () => {
  it('classifies Marion warning as a character scene with actor chip data', () => {
    const game = makeState({
      day: 2,
      pendingEvents: [{ eventId: 'event-npc-marion-warning', firedOnDay: 2 }],
    })

    const presentation = selectEventPresentation({ game } as { game: GameState })

    expect(presentation).toMatchObject({
      eventId: 'event-npc-marion-warning',
      kicker: 'A Scene',
      actorName: 'Marion Vale',
      districtName: null,
    })
    expect(presentation?.actorPortraitSrc).toBe('/portraits/marion-vale.jpg')
  })

  it('classifies district-led warnings as world reports with district tags', () => {
    const game = makeState({
      day: 8,
      pendingEvents: [{ eventId: 'event-restored-appeal', firedOnDay: 8 }],
    })

    const presentation = selectEventPresentation({ game } as { game: GameState })

    expect(presentation).toMatchObject({
      eventId: 'event-restored-appeal',
      kicker: 'Word from the City',
      actorName: null,
      districtName: 'The Warrens',
    })
    expect(presentation?.sceneText).toBeTruthy()
  })

  it('classifies first-run events as guidance', () => {
    const game = makeState({
      day: 1,
      pendingEvents: [{ eventId: 'event-tutorial-house-debt', firedOnDay: 1 }],
    })

    const presentation = selectEventPresentation({ game } as { game: GameState })

    expect(presentation?.kicker).toBe('Guidance')
  })
})
