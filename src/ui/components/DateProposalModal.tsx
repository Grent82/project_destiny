import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { gameActions } from '../../application/store/gameSlice'
import { contentCatalog } from '../../application/content/contentCatalog'
import { selectIntimacyStageWithPlayer } from '../../application/selectors/relationships'
import type { TimeSlot } from '../../domain/shared/contracts'
import './modal.css'

interface DateProposalModalProps {
  npcId: string
  npcName: string
  onClose: () => void
}

const INTIMACY_LABELS: Record<string, string> = {
  none: 'None',
  affinity: 'Affinity',
  attachment: 'Attachment',
  committed: 'Committed',
}

const INTIMACY_STAGE_ORDER = ['none', 'affinity', 'attachment', 'committed']

const TIME_SLOTS: Array<{ label: string; value: TimeSlot }> = [
  { label: 'Morning', value: 'morning' },
  { label: 'Afternoon', value: 'afternoon' },
  { label: 'Evening', value: 'evening' },
  { label: 'Night', value: 'night' },
]

export function DateProposalModal({ npcId, npcName, onClose }: DateProposalModalProps) {
  const dispatch = useAppDispatch()
  const intimacyStage = useAppSelector(selectIntimacyStageWithPlayer(npcId))
  const currentDay = useAppSelector((state) => state.game.day)
  const currentTimeSlot = useAppSelector((state) => state.game.timeSlot)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>(currentTimeSlot)

  const intimacyStageStr = intimacyStage ?? 'none'
  const currentStageIndex = INTIMACY_STAGE_ORDER.indexOf(intimacyStageStr)

  const datesWithLockState = contentCatalog.dates.map((date) => {
    const requiredStageIndex = INTIMACY_STAGE_ORDER.indexOf(date.requiredIntimacyStage)
    return { date, locked: currentStageIndex < requiredStageIndex }
  })
  const hasAnyUnlocked = datesWithLockState.some((entry) => !entry.locked)

  function handlePropose(dateId: string) {
    const proposedDay = currentDay + 1
    dispatch(
      gameActions.proposeDateWithPlayer({
        targetNpcId: npcId,
        dateTemplateId: dateId,
        proposedDay,
        proposedTimeSlot: selectedTimeSlot,
        proposedLocation: null,
      }),
    )
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '40rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Propose a Date with {npcName}</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Current bond: {INTIMACY_LABELS[intimacyStageStr] || 'None'}
        </p>

        {!hasAnyUnlocked && (
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            Your relationship is not deep enough yet for scheduled dates. Continue building your bond through conversation and shared moments.
          </p>
        )}

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select a time:</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            {TIME_SLOTS.map((slot) => (
              <label key={slot.value} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="date-time-slot"
                  value={slot.value}
                  checked={selectedTimeSlot === slot.value}
                  onChange={() => setSelectedTimeSlot(slot.value)}
                />
                <span style={{ fontSize: '0.85rem' }}>{slot.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {datesWithLockState.map(({ date, locked }) => {
            const lockReason = `Requires: ${INTIMACY_LABELS[date.requiredIntimacyStage] ?? date.requiredIntimacyStage}`
            return (
              <button
                key={date.id}
                className="action-button"
                type="button"
                disabled={locked}
                title={locked ? `🔒 ${lockReason}` : undefined}
                style={locked ? { opacity: 0.55 } : undefined}
                onClick={() => handlePropose(date.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ textAlign: 'left' }}>
                    <strong>{date.name}</strong>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {date.description}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      📍 House Valdris · ⏱ {date.durationHours}h · 💰 {date.cost} Mk
                    </p>
                    {locked && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        🔒 {lockReason}
                      </p>
                    )}
                  </div>
                  <span className="badge">{date.requiredIntimacyStage}</span>
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="action-button action-button--secondary" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
