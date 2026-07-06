import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { DialogueScreen } from './DialogueScreen'

describe('DialogueScreen', () => {
  it('frames the scene and avoids a duplicate generic leave button when a leave choice already exists', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-pale',
      activeDialogueId: 'dialogue-marion-vale',
      activeDialogueNodeId: 'marion-node-early-intro',
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <DialogueScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText('House Valdris · The Pale')).toBeInTheDocument()
    expect(screen.getByText(/The room stays tight and attentive/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Marion Vale' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Leave her to it\./i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /leave/i })).toHaveLength(1)
  })

  it('shows the resolved follow-up line after a choice with consequences', async () => {
    const user = userEvent.setup()
    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-pale',
      activeDialogueId: 'dialogue-marion-vale',
      activeDialogueNodeId: 'marion-node-1',
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <DialogueScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: /There's too much to do\./i }))

    expect(screen.getByText(/Then let me carry some of it\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument()
  })
})

describe('DialogueScreen — consequence preview (destiny-pbsw)', () => {
  it('shows the real relationship delta on a choice and exposes it in the hover tooltip', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      activeDialogueId: 'dialogue-marion-vale',
      activeDialogueNodeId: 'marion-node-court-thoughtful-a',
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <DialogueScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    const choiceButton = screen.getByRole('button', {
      name: /I haven't let myself think about it\. But I want to\./i,
    })
    expect(choiceButton).toHaveTextContent('⬆ Trust +5 with Marion Vale')
    expect(choiceButton).toHaveAttribute('title', expect.stringContaining('⬆ Trust +5 with Marion Vale'))
  })

  it('flags a negative faction-standing consequence with a distinct, risk-styled note', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      activeDialogueId: 'dialogue-veyran',
      activeDialogueNodeId: 'veyran-node-warn',
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <DialogueScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    const choiceButton = screen.getByRole('button', { name: /Understood\./i })
    const riskNote = screen.getByText('⚠ ⬇ House Merrow standing -3')
    expect(riskNote).toHaveClass('dialogue-choice-preview--negative')
    expect(choiceButton).toContainElement(riskNote)
  })
})
