import { useAppDispatch, useAppSelector } from '../app/hooks'
import { gameActions } from '../../application/store/gameSlice'
import { contentCatalog } from '../../application/content/contentCatalog'
import { selectIntimacyStageWithPlayer } from '../../application/selectors/relationships'
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

export function DateProposalModal({ npcId, npcName, onClose }: DateProposalModalProps) {
  const dispatch = useAppDispatch()
  const intimacyStage = useAppSelector(() => selectIntimacyStageWithPlayer(npcId))
  const currentDay = useAppSelector((state) => state.game.day)
  const currentTimeSlot = useAppSelector((state) => state.game.timeSlot)

  const availableDates = contentCatalog.dates.filter((date) => {
    const requiredStageIndex = ['none', 'affinity', 'attachment', 'committed'].indexOf(date.requiredIntimacyStage)
    const currentStageIndex = ['none', 'affinity', 'attachment', 'committed'].indexOf(intimacyStage ?? 'none')
    return currentStageIndex >= requiredStageIndex
  })

  const timeSlots: Array<{ label: string; value: string }> = [
    { label: 'Morning', value: 'morning' },
    { label: 'Afternoon', value: 'afternoon' },
    { label: 'Evening', value: 'evening' },
    { label: 'Night', value: 'night' },
  ]

  function handlePropose(dateId: string, timeSlot: string) {
    const proposedDay = currentDay + 1
    dispatch(
      gameActions.proposeDateWithPlayer({
        targetNpcId: npcId,
        dateTemplateId: dateId,
        proposedDay,
        proposedTimeSlot: timeSlot as 'morning' | 'afternoon' | 'evening' | 'night',
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
          Current bond: {INTIMACY_LABELS[intimacyStage] || 'None'}
        </p>

        {availableDates.length === 0 ? (
          <p className="text-muted">
            Your relationship is not deep enough yet for scheduled dates. Continue building your bond through conversation and shared moments.
          </p>
        ) : (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select a time:</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                {timeSlots.map((slot) => (
                  <label key={slot.value} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="date-time-slot"
                      value={slot.value}
                      defaultChecked={slot.value === currentTimeSlot}
                    />
                    <span style={{ fontSize: '0.85rem' }}>{slot.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {availableDates.map((date) => (
                <button
                  key={date.id}
                  className="action-button"
                  type="button"
                  onClick={() => {
                    const slot = (document.querySelector('input[name="date-time-slot"]:checked') as HTMLInputElement)?.value || currentTimeSlot
                    handlePropose(date.id, slot)
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ textAlign: 'left' }}>
                      <strong>{date.name}</strong>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {date.description}
                      </p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Cost: {date.cost} Marks · {date.durationHours} hour{date.durationHours > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="badge">{date.requiredIntimacyStage}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="action-button action-button--secondary" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
