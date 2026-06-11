import { useState } from 'react'
import {
  gameActions,
  selectAssignableHouseRooms,
  selectDebtStatus,
  selectHouseHeirs,
  selectLastDomesticRelationshipBeat,
  selectHouseRepairSummary,
  selectHouseRoomOccupancy,
  selectHouseRooms,
} from '../../application'
import { getHouseDiscovery } from '../../application/content/houseDiscoveries'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import type { NpcPairingPolicy } from '../../domain/game/contracts'
import { VenueContextBanner } from './VenueContextBanner'
import { Link } from 'react-router-dom'
import './HouseScreen.css'
import { formatMarks } from '../../domain/game/currency'
import { HouseSigil } from '../components/HouseSigil'
import { HouseMap } from './maps/HouseMap'
import { RoomLedgerPanel } from './maps/RoomLedgerPanel'

const PAIRING_POLICY_COPY: Record<
  NpcPairingPolicy,
  { label: string; description: string; buttonLabel: string }
> = {
  open: {
    label: 'Hands Off',
    description: 'The house does not intervene in personal bonds.',
    buttonLabel: 'Keep out of private bonds',
  },
  discouraged: {
    label: 'Quiet Boundaries',
    description: 'Deep bonds are expected to remain private and uncomplicated.',
    buttonLabel: 'Expect bonds to stay private',
  },
  forbidden: {
    label: 'Professional Distance',
    description: 'The house requires professional distance between its members.',
    buttonLabel: 'Require professional distance',
  },
}

export function HouseScreen() {
  const dispatch = useAppDispatch()
  const rooms = useAppSelector(selectHouseRooms)
  const summary = useAppSelector(selectHouseRepairSummary)
  const debt = useAppSelector(selectDebtStatus)
  const heirs = useAppSelector(selectHouseHeirs)
  const assignableRooms = useAppSelector(selectAssignableHouseRooms)
  const roomOccupancy = useAppSelector(selectHouseRoomOccupancy)
  const roster = useAppSelector((state) => state.game.roster)
  const pairingPolicy = useAppSelector((state) => state.game.house.npcPairingPolicy)
  const vaultUnlocked = useAppSelector((state) => state.game.house.vaultUnlocked)
  const lastDomesticBeat = useAppSelector(selectLastDomesticRelationshipBeat)
  const [justSearchedId, setJustSearchedId] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>('room-entrance-hall')

  const occupantsByRoom = new Map(
    roomOccupancy.map((entry) => [entry.roomId, entry.occupants.map((occupant) => occupant.name)]),
  )
  const unresolvedRoomIds = new Set(
    rooms
      .filter(
        (room) =>
          room.searched && (getHouseDiscovery(room.roomId, vaultUnlocked)?.actionableFinds.length ?? 0) > 0,
      )
      .map((room) => room.roomId),
  )
  const selectedRoom = rooms.find((room) => room.roomId === selectedRoomId) ?? null
  const selectedOccupants = selectedRoom
    ? (roomOccupancy.find((entry) => entry.roomId === selectedRoom.roomId)?.occupants ?? [])
    : []

  return (
    <section className="screen-panel district-the-pale">
      <div className="house-screen-header">
        <HouseSigil houseId="house-valdris" size={32} />
        <p className="eyebrow">House Valdris</p>
      </div>
      <h1>The House</h1>
      <p className="summary">
        The family seat in The Pale. Most of it was stripped or broken during the Breach. Marion
        consolidated what little survived: the entrance hall is presentable, and a handful of other
        rooms remain usable through her work. The cellar vault is sealed — it needs a key or the
        right evidence to open.
      </p>
      <VenueContextBanner />

      <div className="house-status-bar">
        <span>
          <strong>{summary.intactCount}</strong> of {rooms.length} rooms intact
        </span>
        <span>
          Total repairs needed:{' '}
          <strong className={summary.totalRepairCost > debt.marks ? 'text-danger' : ''}>
            {formatMarks(summary.totalRepairCost)}
          </strong>
        </span>
        <span>
          On hand: <strong>{formatMarks(debt.marks)}</strong>
        </span>
      </div>

      <div className="map-with-ledger">
        <HouseMap
          rooms={rooms}
          occupantsByRoom={occupantsByRoom}
          selectedRoomId={selectedRoomId}
          unresolvedRoomIds={unresolvedRoomIds}
          onSelectRoom={setSelectedRoomId}
        />
        <RoomLedgerPanel
          room={selectedRoom}
          marks={debt.marks}
          vaultUnlocked={vaultUnlocked}
          justSearched={selectedRoom?.roomId === justSearchedId}
          occupants={selectedOccupants}
          roster={roster.map((npc) => ({ npcId: npc.npcId, name: npc.name, roomAssignment: npc.roomAssignment }))}
          assignable={selectedRoom != null && assignableRooms.some((room) => room.roomId === selectedRoom.roomId)}
          onRepair={(roomId) => dispatch(gameActions.repairRoom(roomId))}
          onSearch={(roomId) => {
            setJustSearchedId(roomId)
            dispatch(gameActions.searchRoom(roomId))
          }}
          onAssign={(npcId, roomId) => dispatch(gameActions.setNpcRoomAssignment({ npcId, roomId }))}
        />
      </div>

      <section className="house-wards-section">
        <h2>Household Policy</h2>
        <p className="summary">
          Marion can keep the house out of private attachments, insist they stay discreet, or
          require strict professional distance. The rule here shapes what bonds are tolerated under
          this roof.
        </p>
        <div className="mission-row">
          <div className="mission-row-header">
            <strong>{PAIRING_POLICY_COPY[pairingPolicy].label}</strong>
            <span className="badge">Current rule</span>
          </div>
          <p className="quest-briefing">{PAIRING_POLICY_COPY[pairingPolicy].description}</p>
          <div className="quest-offer-actions" style={{ marginTop: '0.75rem' }}>
            {(Object.entries(PAIRING_POLICY_COPY) as Array<
              [NpcPairingPolicy, (typeof PAIRING_POLICY_COPY)[NpcPairingPolicy]]
            >).map(([policy, copy]) => (
              <button
                key={policy}
                className={policy === pairingPolicy ? 'action-button action-button--secondary' : 'action-button action-button--ghost'}
                disabled={policy === pairingPolicy}
                onClick={() => dispatch(gameActions.setNpcPairingPolicy(policy))}
                type="button"
              >
                {copy.buttonLabel}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="house-wards-section">
        <h2>Domestic Aftermath</h2>
        {lastDomesticBeat ? (
          <div className="mission-row">
            <div className="mission-row-header">
              <strong>{lastDomesticBeat.npcNames.join(' and ')}</strong>
              <span className="badge">Day {lastDomesticBeat.day}</span>
              <span className="badge">{lastDomesticBeat.intimacyStage}</span>
            </div>
            <p className="quest-briefing"><strong>Room:</strong> {lastDomesticBeat.roomName}</p>
            <p className="quest-briefing"><strong>Policy frame:</strong> {PAIRING_POLICY_COPY[lastDomesticBeat.policy].label}</p>
            <p className="quest-briefing">{lastDomesticBeat.summary}</p>
            <ul className="quest-journal-list">
              {lastDomesticBeat.effects.map((effect) => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="summary">
            No domestic relationship beat has settled into the house yet. Shared quarters and household rules can make private bonds visibly deepen here.
          </p>
        )}
      </section>

      <section className="house-wards-section">
        <h2>Succession</h2>
        <p className="summary">Heirs recognized by the house — by blood, fostering, or formal arrangement.</p>
        {heirs.length === 0 ? (
          <p className="quest-briefing">No succession heirs are established.</p>
        ) : (
          <div className="mission-list">
            {heirs.map((heir) => (
              <div key={heir.id} className="mission-row">
                <div className="mission-row-header">
                  <strong>{heir.name}</strong>
                  <span className="badge">{heir.stage}</span>
                  <span className="badge">{heir.legitimacyStatus}</span>
                  {heir.origin && <span className="badge">{heir.origin}</span>}
                </div>
                {heir.originStory && (
                  <p className="quest-briefing" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {heir.originStory}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="house-ledger-link">
        <Link to="/ledger">View House Accounts →</Link>
      </p>
    </section>
  )
}
