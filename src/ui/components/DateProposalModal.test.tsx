import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { DateProposalModal } from './DateProposalModal'

function renderModal(intimacyStage: 'none' | 'affinity' | 'attachment' | 'committed', onClose = () => {}) {
  const store = createGameStore({
    ...initialGameStateSnapshot,
    relationships: {
      ...initialGameStateSnapshot.relationships,
      'player-to-npc-marion-vale': {
        ...(initialGameStateSnapshot.relationships['player-to-npc-marion-vale'] ?? {
          affinity: 0,
          respect: 0,
          fear: 0,
          trust: 0,
          loyalty: 0,
        }),
        intimacyStage,
      },
    },
  })

  render(
    <AppProviders store={store}>
      <DateProposalModal npcId="npc-marion-vale" npcName="Marion Vale" onClose={onClose} />
    </AppProviders>,
  )
  return store
}

describe('DateProposalModal (destiny-9bw4)', () => {
  it('shows the encouraging message and only locked dates when the bond is not deep enough for any date', () => {
    renderModal('none')

    expect(screen.getByText(/not deep enough yet for scheduled dates/i)).toBeInTheDocument()
    // date-quiet-walk requires 'affinity' -- still shown, but disabled with a lock reason.
    const quietWalk = screen.getByRole('button', { name: /Quiet Walk in the Gardens/i })
    expect(quietWalk).toBeDisabled()
    expect(quietWalk).toHaveAttribute('title', expect.stringContaining('Requires: Affinity'))
  })

  it('shows location, duration, and cost for every date option', () => {
    renderModal('committed')

    expect(screen.getAllByText(/📍 House Valdris · ⏱ 1h · 💰 0 Mk/).length).toBeGreaterThan(0)
  })

  it('enables a date once the bond reaches its required stage, with no lock reason shown', () => {
    renderModal('affinity')

    const quietWalk = screen.getByRole('button', { name: /Quiet Walk in the Gardens/i })
    expect(quietWalk).toBeEnabled()
    expect(quietWalk).not.toHaveAttribute('title')
  })

  it('keeps a higher-tier date locked with its specific required stage even once a lower one unlocks', () => {
    renderModal('affinity')

    // date-music-night requires 'attachment' -- still locked at 'affinity'.
    const musicNight = screen.getByRole('button', { name: /Music and Stories/i })
    expect(musicNight).toBeDisabled()
    expect(musicNight).toHaveAttribute('title', expect.stringContaining('Requires: Attachment'))
  })

  it('proposes with the currently selected time slot, not the day\'s ambient time slot', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const store = renderModal('committed', onClose)

    await user.click(screen.getByRole('radio', { name: 'Night' }))
    await user.click(screen.getByRole('button', { name: /Quiet Walk in the Gardens/i }))

    const proposal = store
      .getState()
      .game.pendingDateProposals.find((p) => p.targetNpcId === 'npc-marion-vale')
    expect(proposal?.proposedTimeSlot).toBe('night')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
