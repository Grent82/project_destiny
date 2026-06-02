import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
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

    expect(screen.getByText(/before a night run/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hear the warning and take the escort/i })).toBeInTheDocument()
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
