import type { RootState } from '../../application/store/gameStore'
import { selectRosterEntries } from '../../application/selectors/roster'

interface TargetPickerModalProps {
  state: RootState
  onSelect: (npcId: string, name: string) => void
  onClose: () => void
}

export function TargetPickerModal({ state, onSelect, onClose }: TargetPickerModalProps) {
  const npcs = selectRosterEntries(state)

  return (
    <div className="target-picker-modal" role="dialog" aria-label="Choose a target">
      <div className="target-picker-modal__header">
        <h3>Choose a target</h3>
        <button onClick={onClose} aria-label="Close">✕</button>
      </div>
      <ul className="target-picker-modal__list" role="list">
        {npcs.map((npc) => (
          <li key={npc.npcId}>
            <button
              className="target-picker-modal__npc-btn"
              onClick={() => onSelect(npc.npcId, npc.name)}
            >
              {npc.name}
            </button>
          </li>
        ))}
        {npcs.length === 0 && (
          <li className="target-picker-modal__empty">No available targets</li>
        )}
      </ul>
    </div>
  )
}
