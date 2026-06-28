import { describe, expect, it } from 'vitest'

import type { GameState } from '../../domain'
import type { EventTemplate } from '../../domain/events/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { selectEventPresentation, selectMorningReportItems } from './events'

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
    // Tutorial events disabled — use a different event for this test
    const game = makeState({
      day: 1,
      pendingEvents: [{ eventId: 'event-npc-marion-warning', firedOnDay: 1 }],
    })

    const presentation = selectEventPresentation({ game } as { game: GameState })

    // Marion warning is a character scene, not guidance
    expect(presentation?.kicker).toBe('A Scene')
  })

  it('routes one-choice household/world notices into morning report items', () => {
    const originalEvents = contentCatalog.events
    const infoEvent: EventTemplate = {
      id: 'event-test-morning-report',
      title: 'Coal Ledger Updated',
      description: 'The steward has reconciled this week’s coal tallies.',
      triggerConditions: { probability: 1 },
      choices: [{ id: 'choice-file', label: 'File the update', outcomes: [{ type: 'addActivityLogEntry', message: 'The coal books balance for now.' }] }],
      isAutoResolved: false,
      tags: ['household', 'economy'],
      repeatable: false,
      cooldownDays: 7,
      sourceDistrictId: 'district-the-pale',
      sourceNpcId: null,
      presentationFlavour: 'Marion leaves the page clipped to the top of the ledger.',
      firingMode: 'world',
    }
    ;(contentCatalog as { events: typeof originalEvents }).events = [infoEvent]
    ;(contentCatalog as { eventsById: Map<string, EventTemplate> }).eventsById = new Map(
      [[infoEvent.id, infoEvent]],
    )

    const game = makeState({
      day: 8,
      pendingEvents: [{ eventId: infoEvent.id, firedOnDay: 8 }],
    })

    const presentation = selectEventPresentation({ game } as { game: GameState })
    const reportItems = selectMorningReportItems({ game } as { game: GameState })

    expect(presentation).toBeNull()
    expect(reportItems[0]).toMatchObject({
      eventId: infoEvent.id,
      kicker: 'The Household',
      route: '/house',
      routeLabel: 'Open House',
      districtName: 'The Pale',
      section: 'Your house',
    })

    ;(contentCatalog as { events: typeof originalEvents }).events = originalEvents
    ;(contentCatalog as { eventsById: Map<string, EventTemplate> }).eventsById = new Map(
      originalEvents.map((event) => [event.id, event]),
    )
  })
})
