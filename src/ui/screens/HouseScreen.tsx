import {
  gameActions,
  selectDebtStatus,
  selectHouseRepairSummary,
  selectHouseRooms,
} from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import type { HouseRoom, RoomState } from '../../domain/game/contracts'

const STATE_LABELS: Record<RoomState, string> = {
  intact: 'Intact',
  damaged: 'Damaged',
  stripped: 'Stripped',
  destroyed: 'Destroyed',
  locked: 'Locked',
  collapsed: 'Collapsed',
}

const STATE_CLASS: Record<RoomState, string> = {
  intact: 'house-room--intact',
  damaged: 'house-room--damaged',
  stripped: 'house-room--stripped',
  destroyed: 'house-room--destroyed',
  locked: 'house-room--locked',
  collapsed: 'house-room--collapsed',
}

function RoomCard({ room, marks }: { room: HouseRoom; marks: number }) {
  const dispatch = useAppDispatch()
  const canRepair =
    room.repairCost > 0 &&
    (room.state === 'damaged' || room.state === 'stripped' || room.state === 'collapsed') &&
    marks >= room.repairCost
  const canSearch =
    !room.searched &&
    room.state !== 'locked' &&
    room.state !== 'collapsed' &&
    room.state !== 'destroyed'

  return (
    <article className={`house-room ${STATE_CLASS[room.state]}`}>
      <header className="house-room__header">
        <h3 className="house-room__name">{room.name}</h3>
        <span className="house-room__state-badge">{STATE_LABELS[room.state]}</span>
      </header>

      {room.searched && <p className="house-room__searched">✓ Searched</p>}

      <footer className="house-room__actions">
        {canRepair && (
          <button
            className="action-button action-button--primary"
            onClick={() => dispatch(gameActions.repairRoom(room.roomId))}
            type="button"
          >
            Repair — {room.repairCost} Mk
          </button>
        )}
        {room.repairCost > 0 && !canRepair && room.state !== 'intact' && (
          <p className="house-room__cost-note">
            {marks < room.repairCost
              ? `Needs ${room.repairCost} Mk (short ${room.repairCost - marks} Mk)`
              : STATE_LABELS[room.state]}
          </p>
        )}
        {canSearch && (
          <button
            className="action-button action-button--secondary"
            onClick={() => dispatch(gameActions.searchRoom(room.roomId))}
            type="button"
          >
            Search
          </button>
        )}
        {room.state === 'locked' && (
          <p className="house-room__cost-note">Sealed. Requires a key or a quest.</p>
        )}
        {room.state === 'collapsed' && room.repairCost > 0 && marks < room.repairCost && (
          <p className="house-room__cost-note">Structural collapse. Clear rubble: {room.repairCost} Mk.</p>
        )}
      </footer>
    </article>
  )
}

export function HouseScreen() {
  const rooms = useAppSelector(selectHouseRooms)
  const summary = useAppSelector(selectHouseRepairSummary)
  const debt = useAppSelector(selectDebtStatus)

  return (
    <section className="screen-panel district-the-pale">
      <p className="eyebrow">House Valdris</p>
      <h1>The House</h1>
      <p className="summary">
        The family seat in The Pale. Most of it was stripped or broken during the Breach. Marion
        has kept the entrance hall presentable. The vault below has not been opened since.
      </p>

      <div className="house-status-bar">
        <span>
          <strong>{summary.intactCount}</strong> of {rooms.length} rooms intact
        </span>
        <span>
          Total repairs needed:{' '}
          <strong className={summary.totalRepairCost > debt.marks ? 'text-danger' : ''}>
            {summary.totalRepairCost} Mk
          </strong>
        </span>
        <span>
          On hand: <strong>{debt.marks} Mk</strong>
        </span>
      </div>

      <div className="house-room-grid">
        {rooms.map((room) => (
          <RoomCard key={room.roomId} marks={debt.marks} room={room} />
        ))}
      </div>
    </section>
  )
}
