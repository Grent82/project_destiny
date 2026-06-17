import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { createGameStore, gameActions } from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { selectChronicleEntries } from '../../application/selectors/chronicle'
import type { EventTemplate } from '../../domain/events/contracts'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { MorningReport } from './MorningReport'

describe('MorningReport', () => {
  it('renders informational events grouped into a single report surface', async () => {
    const user = userEvent.setup()
    const originalEvents = contentCatalog.events
    const houseEvent: EventTemplate = {
      id: 'event-test-house-report',
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
    const cityEvent: EventTemplate = {
      id: 'event-test-city-report',
      title: 'Harbor Tariffs Shift',
      description: 'Harbor tariffs creep upward overnight.',
      triggerConditions: { probability: 1 },
      choices: [{ id: 'choice-file-city', label: 'File the tariff notice', outcomes: [{ type: 'addActivityLogEntry', message: 'The tariff tables are copied into the ledger.' }] }],
      isAutoResolved: false,
      tags: ['world', 'economy'],
      repeatable: false,
      cooldownDays: 7,
      sourceDistrictId: 'district-harbor',
      sourceNpcId: null,
      presentationFlavour: null,
      firingMode: 'world',
    }
    ;(contentCatalog as { events: typeof originalEvents }).events = [houseEvent, cityEvent]
    ;(contentCatalog as { eventsById: Map<string, EventTemplate> }).eventsById = new Map(
      [houseEvent, cityEvent].map((event) => [event.id, event]),
    )

    const store = createGameStore({
      ...initialGameStateSnapshot,
      day: 8,
      pendingEvents: [
        { eventId: houseEvent.id, firedOnDay: 8 },
        { eventId: cityEvent.id, firedOnDay: 8 },
      ],
      eventInstances: [],
      chronicle: { entriesByDay: {}, version: 1 },
      lastResolvedEventSummary: null,
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <MorningReport />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText('Morning Report')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "Marion's ledger for the turn" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your house' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The city' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Coal Ledger Updated/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Harbor Tariffs Shift/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Coal Ledger Updated/i }))
    expect(screen.getByRole('link', { name: 'Open House' })).toHaveAttribute('href', '/house')

    await user.click(screen.getByRole('button', { name: /Harbor Tariffs Shift/i }))
    expect(screen.getByRole('link', { name: 'Go to Harbor Ward' })).toHaveAttribute(
      'href',
      '/district/district-harbor',
    )

    await user.click(screen.getByRole('button', { name: 'Enter the day' }))

    expect(store.getState().game.pendingEvents).toHaveLength(0)
    expect(store.getState().game.lastResolvedEventSummary).toBeNull()

    const chronicleEntries = selectChronicleEntries(store.getState())
    expect(chronicleEntries).toHaveLength(2)

    ;(contentCatalog as { events: typeof originalEvents }).events = originalEvents
    ;(contentCatalog as { eventsById: Map<string, EventTemplate> }).eventsById = new Map(
      originalEvents.map((event) => [event.id, event]),
    )
  })

  it('hides behind a decision event and routes to the chosen destination when opened', async () => {
    const user = userEvent.setup()
    const originalEvents = contentCatalog.events
    const houseEvent: EventTemplate = {
      id: 'event-test-house-report-routed',
      title: 'Coal Ledger Updated',
      description: 'The steward has reconciled this week’s coal tallies.',
      triggerConditions: { probability: 1 },
      choices: [{ id: 'choice-file', label: 'File the update', outcomes: [] }],
      isAutoResolved: false,
      tags: ['household', 'economy'],
      repeatable: false,
      cooldownDays: 7,
      sourceDistrictId: 'district-the-pale',
      sourceNpcId: null,
      presentationFlavour: null,
      firingMode: 'world',
    }
    const decisionEvent: EventTemplate = {
      id: 'event-test-decision-modal',
      title: 'A Petition from the Warrens',
      description: 'Three tired faces wait for judgment.',
      triggerConditions: { probability: 1 },
      choices: [
        { id: 'choice-help', label: 'Hear them out', outcomes: [] },
        { id: 'choice-refuse', label: 'Turn them away', outcomes: [] },
      ],
      isAutoResolved: false,
      tags: ['world', 'political'],
      repeatable: false,
      cooldownDays: 7,
      sourceDistrictId: 'district-the-warrens',
      sourceNpcId: null,
      presentationFlavour: null,
      firingMode: 'world',
    }
    ;(contentCatalog as { events: typeof originalEvents }).events = [houseEvent, decisionEvent]
    ;(contentCatalog as { eventsById: Map<string, EventTemplate> }).eventsById = new Map(
      [houseEvent, decisionEvent].map((event) => [event.id, event]),
    )

    const store = createGameStore({
      ...initialGameStateSnapshot,
      day: 8,
      pendingEvents: [
        { eventId: houseEvent.id, firedOnDay: 8 },
        { eventId: decisionEvent.id, firedOnDay: 8 },
      ],
      eventInstances: [],
      chronicle: { entriesByDay: {}, version: 1 },
      lastResolvedEventSummary: null,
    })

    const { rerender } = render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<MorningReport />} />
            <Route path="/house" element={<div>House destination</div>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.queryByText('Morning Report')).not.toBeInTheDocument()

    await act(async () => {
      store.dispatch(
        gameActions.resolveEvent({
          choiceId: decisionEvent.choices[0].id,
          eventId: decisionEvent.id,
        }),
      )
      store.dispatch(gameActions.dismissResolvedEventSummary())
    })

    rerender(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<MorningReport />} />
            <Route path="/house" element={<div>House destination</div>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText('Morning Report')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Coal Ledger Updated/i }))
    await user.click(screen.getByRole('link', { name: 'Open House' }))
    expect(screen.getByText('House destination')).toBeInTheDocument()

    ;(contentCatalog as { events: typeof originalEvents }).events = originalEvents
    ;(contentCatalog as { eventsById: Map<string, EventTemplate> }).eventsById = new Map(
      originalEvents.map((event) => [event.id, event]),
    )
  })
})
