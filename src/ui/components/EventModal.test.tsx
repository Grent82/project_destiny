import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import type { EventTemplate } from '../../domain/events/contracts'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { EventModal } from './EventModal'

describe('EventModal', () => {
  it('renders the updated Marion warning scene with explicit intent in the choice label', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      day: 2,
      pendingEvents: [{ eventId: 'event-npc-marion-warning', firedOnDay: 2 }],
      eventInstances: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <EventModal />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText('A Scene')).toBeInTheDocument()
    expect(screen.getByText('Marion Vale')).toBeInTheDocument()
    expect(screen.getByText(/before a night run/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hear the warning and take the escort/i })).toBeInTheDocument()
  })

  it('renders a world report with district tag and scene-setting flavour', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      day: 8,
      pendingEvents: [{ eventId: 'event-restored-appeal', firedOnDay: 8 }],
      eventInstances: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <EventModal />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText('Word from the City')).toBeInTheDocument()
    expect(screen.getByText('The Warrens')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'A Petition from the Warrens' })).toBeInTheDocument()
    expect(screen.getByText(/Three tired faces/i)).toBeInTheDocument()
  })

  it('does not render informational one-choice events as modals', () => {
    const originalEvents = contentCatalog.events
    const infoEvent: EventTemplate = {
      id: 'event-test-info-modal-hidden',
      title: 'Dock Rates Adjusted',
      description: 'Harbor tariffs creep upward overnight.',
      triggerConditions: { probability: 1 },
      choices: [{ id: 'choice-file', label: 'File the notice', outcomes: [] }],
      isAutoResolved: false,
      tags: ['world', 'economy'],
      repeatable: false,
      cooldownDays: 7,
      sourceDistrictId: 'district-harbor',
      sourceNpcId: null,
      presentationFlavour: null,
      firingMode: 'world',
    }
    ;(contentCatalog as { events: typeof originalEvents }).events = [infoEvent]
    ;(contentCatalog as { eventsById: Map<string, EventTemplate> }).eventsById = new Map(
      [[infoEvent.id, infoEvent]],
    )

    const store = createGameStore({
      ...initialGameStateSnapshot,
      day: 8,
      pendingEvents: [{ eventId: infoEvent.id, firedOnDay: 8 }],
      eventInstances: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <EventModal />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.queryByRole('heading', { name: 'Dock Rates Adjusted' })).not.toBeInTheDocument()

    ;(contentCatalog as { events: typeof originalEvents }).events = originalEvents
    ;(contentCatalog as { eventsById: Map<string, EventTemplate> }).eventsById = new Map(
      originalEvents.map((event) => [event.id, event]),
    )
  })

  it('shows a resolved event summary without requiring the activity log', async () => {
    const user = userEvent.setup()
    const store = createGameStore({
      ...initialGameStateSnapshot,
      pendingEvents: [],
      lastResolvedEventSummary: {
        eventId: 'event-marion-first-success',
        title: 'Marion Takes Note',
        choiceLabel: 'Nod in passing.',
        day: 2,
        timeSlot: 'evening',
        sourceNpcName: 'Marion Vale',
        narrativeOutcome:
          'Marion watches you pass. Something shifts in her expression. She has revised her estimate upward.',
        playerEffects: [],
        npcEffects: ["Marion Vale's respect rises.", "Marion Vale's trust rises."],
        worldEffects: [],
      },
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <EventModal />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText('Event Outcome')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Marion Takes Note' })).toBeInTheDocument()
    expect(screen.getByText(/You chose: Nod in passing/i)).toBeInTheDocument()
    expect(screen.getByText(/Scene anchored by Marion Vale/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'NPC Impact' })).toBeInTheDocument()
    expect(screen.getByText(/Marion Vale's respect rises/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(store.getState().game.lastResolvedEventSummary).toBeNull()
  })
})
