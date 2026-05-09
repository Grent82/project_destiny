import {
  gameActions,
  selectDebtStatus,
  selectHouseRepairSummary,
  selectHouseRooms,
} from '../../application'
import { getHouseDiscovery } from '../../application/content/houseDiscoveries'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import type { HouseRoom, RoomState } from '../../domain/game/contracts'
import { VenueContextBanner } from './VenueContextBanner'

const ROOM_EFFECTS: Record<string, string> = {
  'room-kitchen': 'When intact: reduces each NPC\'s daily wage by 1 Mk (house provides meals).',
  'room-study': 'When intact: training NPCs gain +25% more skill per day.',
  'room-bureau': 'Administrative hub of the house.',
  'room-master-chamber': 'Your private chamber. Symbol of the house\'s standing.',
  'room-servant-quarters': 'When repaired: unlocks +1 roster slot.',
  'room-barracks': 'When repaired: unlocks +1 roster slot.',
  'room-east-wing': 'When repaired: unlocks +2 roster slots.',
  'room-garret': 'Upper floor lookout. Good vantage over the street.',
}

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
  const vaultUnlocked = useAppSelector((state) => state.game.house.vaultUnlocked)
  const canRepair =
    room.repairCost > 0 &&
    (room.state === 'damaged' || room.state === 'stripped' || room.state === 'collapsed') &&
    marks >= room.repairCost
  const canSearch =
    !room.searched &&
    room.state !== 'locked' &&
    room.state !== 'collapsed' &&
    room.state !== 'destroyed'
  const discovery = room.searched ? getHouseDiscovery(room.roomId, vaultUnlocked) : null

  return (
    <article className={`house-room ${STATE_CLASS[room.state]}`}>
      <header className="house-room__header">
        <h3 className="house-room__name">{room.name}</h3>
        <span className="house-room__state-badge">{STATE_LABELS[room.state]}</span>
      </header>

      {ROOM_EFFECTS[room.roomId] && (
        <p className="house-room__effect">{ROOM_EFFECTS[room.roomId]}</p>
      )}

      {room.searched && <p className="house-room__searched">✓ Searched</p>}
      {discovery && (
        <div style={{ marginTop: '0.45rem' }}>
          <p className="house-room__effect" style={{ fontStyle: 'normal' }}>
            {discovery.message}
          </p>
          {discovery.finds.length > 0 && (
            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-secondary, #9e8c6e)' }}>
              {discovery.finds.map((find) => (
                <li key={find}>{find}</li>
              ))}
            </ul>
          )}
        </div>
      )}

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
      <VenueContextBanner />

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
