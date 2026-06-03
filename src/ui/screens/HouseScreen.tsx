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
  selectWards,
} from '../../application'
import { HOUSE_ROOM_FUNCTION_EFFECT_SUMMARIES } from '../../application/commands/houseRoomFunctions'
import { getHouseDiscovery } from '../../application/content/houseDiscoveries'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import type { HouseRoom, NpcPairingPolicy, RoomState } from '../../domain/game/contracts'
import { VenueContextBanner } from './VenueContextBanner'
import { Link } from 'react-router-dom'
import { formatMarks, formatMarksAbbrev } from '../../domain/game/currency'

const ROOM_EFFECTS: Record<string, string> = {
  'room-kitchen': 'When intact: each NPC\'s daily wage drops by 1 Mark. The house feeds its own.',
  'room-study': 'When intact: NPCs in training gain +25% skill per day.',
  'room-bureau': 'When intact: working accounts office. Repair to track debts, income, and house obligations from the Ledger.',
  'room-master-chamber': 'When intact: the lord\'s chamber receives visitors. Faction contacts begin to treat the house as a going concern.',
  'room-servant-quarters': 'When intact: +1 roster slot. The house can shelter another.',
  'room-barracks': 'When intact: +1 roster slot for trained fighters.',
  'room-east-wing': 'When intact: +2 roster slots. The east wing is habitable again.',
  'room-garret': 'When intact: overlook the street below. Read district movement before it reaches the door.',
  'room-quarters': 'One of the few sleeping rooms still fit for use. Any housed resident can recover here between assignments.',
}

/** For intact rooms with an unclear follow-up loop: surface the next actionable step. */
const ROOM_INTACT_FOLLOWUP: Record<string, { text: string; to: string; label: string }> = {
  'room-bureau': {
    text: 'Accounts are in order.',
    to: '/ledger',
    label: 'View House Accounts →',
  },
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

function RoomCard({
  occupants,
  room,
  marks,
  justSearched,
  onSearch,
}: {
  occupants: Array<{ npcId: string; name: string }>
  room: HouseRoom
  marks: number
  justSearched: boolean
  onSearch: () => void
}) {
  const dispatch = useAppDispatch()
  const vaultUnlocked = useAppSelector((state) => state.game.house.vaultUnlocked)
  const canRepair =
    room.repairCost > 0 &&
    room.repairDaysRemaining === 0 &&
    (room.state === 'damaged' || room.state === 'stripped' || room.state === 'collapsed' || room.state === 'destroyed') &&
    marks >= room.repairCost
  const canSearch =
    !room.searched &&
    room.state !== 'locked' &&
    room.state !== 'collapsed' &&
    room.state !== 'destroyed'
  const discovery = room.searched ? getHouseDiscovery(room.roomId, vaultUnlocked) : null
  const hasUnresolvedLeads = (discovery?.actionableFinds.length ?? 0) > 0

  return (
    <article className={`house-room ${STATE_CLASS[room.state]}`}>
      <header className="house-room__header">
        <h3 className="house-room__name">{room.name}</h3>
        <span className="house-room__state-badge">{STATE_LABELS[room.state]}</span>
      </header>

      {ROOM_EFFECTS[room.roomId] && (
        <p className="house-room__effect">{ROOM_EFFECTS[room.roomId]}</p>
      )}
      {room.roomFunction && (
        <p className="house-room__effect">
          Assigned purpose: <strong>{room.roomFunction}</strong>. {HOUSE_ROOM_FUNCTION_EFFECT_SUMMARIES[room.roomFunction]}
        </p>
      )}
      {occupants.length > 0 && (
        <div className="house-room__discovery" style={{ marginTop: '0.45rem' }}>
          <p className="house-room__effect" style={{ fontStyle: 'normal', marginBottom: '0.25rem' }}>
            Occupants
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--ink-2, #5d4630)' }}>
            {occupants.map((occupant) => (
              <li key={occupant.npcId}>{occupant.name}</li>
            ))}
          </ul>
        </div>
      )}
      {room.repairDaysRemaining > 0 && (
        <p className="house-room__effect">
          Repairs underway: <strong>{room.repairDaysRemaining}</strong> day{room.repairDaysRemaining !== 1 ? 's' : ''} remaining.
        </p>
      )}
      {room.state === 'intact' && ROOM_INTACT_FOLLOWUP[room.roomId] && (
        <p className="house-room__effect" style={{ marginTop: '0.35rem' }}>
          {ROOM_INTACT_FOLLOWUP[room.roomId]!.text}{' '}
          <Link to={ROOM_INTACT_FOLLOWUP[room.roomId]!.to}>
            {ROOM_INTACT_FOLLOWUP[room.roomId]!.label}
          </Link>
        </p>
      )}

      {/* Fresh search: show full discovery payload */}
      {room.searched && justSearched && discovery && (
        <div className="house-room__discovery house-room__discovery--fresh" style={{ marginTop: '0.45rem' }}>
          <p className="house-room__effect" style={{ fontStyle: 'normal' }}>
            {discovery.message}
          </p>
          {discovery.actionableFinds.length > 0 && (
            <div style={{ marginTop: '0.4rem' }}>
              <p className="house-room__effect" style={{ fontStyle: 'normal', marginBottom: '0.25rem' }}>
                Found
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--ink-2, #5d4630)' }}>
                {discovery.actionableFinds.map((find) => (
                  <li key={find.itemId}>{find.label}</li>
                ))}
              </ul>
            </div>
          )}
          {discovery.flavorFinds.length > 0 && (
            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-secondary, #9e8c6e)' }}>
              {discovery.flavorFinds.map((find) => (
                <li key={find}>{find}</li>
              ))}
            </ul>
          )}
          {discovery.followUp && (
            <p className="house-room__effect" style={{ marginTop: '0.45rem', fontStyle: 'normal' }}>
              — {discovery.followUp}
            </p>
          )}
        </div>
      )}

      {/* Returning view: compact searched state — only persistent leads and guidance */}
      {room.searched && !justSearched && (
        <div className="house-room__discovery house-room__discovery--archived" style={{ marginTop: '0.45rem' }}>
          <p className="house-room__searched">✓ Searched</p>
          {hasUnresolvedLeads && discovery && (
            <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--ink-2, #5d4630)' }}>
              {discovery.actionableFinds.map((find) => (
                <li key={find.itemId}>{find.label}</li>
              ))}
            </ul>
          )}
          {discovery?.followUp && (
            <p className="house-room__effect" style={{ marginTop: '0.35rem', fontStyle: 'normal', fontSize: '0.78rem' }}>
              — {discovery.followUp}
            </p>
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
            Repair — {formatMarksAbbrev(room.repairCost)}
          </button>
        )}
        {room.repairCost > 0 && !canRepair && room.state !== 'intact' && room.repairDaysRemaining === 0 && (
          <p className="house-room__cost-note">
            {marks < room.repairCost
              ? `Needs ${formatMarksAbbrev(room.repairCost)} (short ${formatMarksAbbrev(room.repairCost - marks)})`
              : STATE_LABELS[room.state]}
          </p>
        )}
        {canSearch && (
          <button
            className="action-button action-button--secondary"
            onClick={() => {
              onSearch()
              dispatch(gameActions.searchRoom(room.roomId))
            }}
            type="button"
          >
            Search
          </button>
        )}
        {room.state === 'locked' && (
          <p className="house-room__cost-note">Sealed. The hidden catch has not been found.</p>
        )}
        {room.state === 'collapsed' && room.repairCost > 0 && marks < room.repairCost && (
          <p className="house-room__cost-note">Structural collapse. Clear rubble: {formatMarksAbbrev(room.repairCost)}.</p>
        )}
      </footer>
    </article>
  )
}

export function HouseScreen() {
  const dispatch = useAppDispatch()
  const rooms = useAppSelector(selectHouseRooms)
  const summary = useAppSelector(selectHouseRepairSummary)
  const debt = useAppSelector(selectDebtStatus)
  const wards = useAppSelector(selectWards)
  const heirs = useAppSelector(selectHouseHeirs)
  const assignableRooms = useAppSelector(selectAssignableHouseRooms)
  const roomOccupancy = useAppSelector(selectHouseRoomOccupancy)
  const roster = useAppSelector((state) => state.game.roster)
  const pairingPolicy = useAppSelector((state) => state.game.house.npcPairingPolicy)
  const lastDomesticBeat = useAppSelector(selectLastDomesticRelationshipBeat)
  const [justSearchedId, setJustSearchedId] = useState<string | null>(null)

  return (
    <section className="screen-panel district-the-pale">
      <p className="eyebrow">House Valdris</p>
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

      <div className="house-room-grid">
        {rooms.map((room) => (
          <RoomCard
            key={room.roomId}
            marks={debt.marks}
            occupants={roomOccupancy.find((entry) => entry.roomId === room.roomId)?.occupants ?? []}
            room={room}
            justSearched={room.roomId === justSearchedId}
            onSearch={() => setJustSearchedId(room.roomId)}
          />
        ))}
      </div>

      <section className="house-wards-section">
        <h2>Room Assignments</h2>
        <p className="summary">
          Decide who actually lives and works in each restored part of the house. These placements
          are narrative signals first: they make the house feel occupied, not abstract.
        </p>
        {roster.length === 0 ? (
          <p className="quest-briefing">No one is currently available to house.</p>
        ) : (
          <div className="mission-list">
            {roster.map((npc) => (
              <div key={npc.npcId} className="mission-row">
                <div className="mission-row-header">
                  <strong>{npc.name}</strong>
                  <span className="badge">{npc.assignment.replace('_', ' ')}</span>
                </div>
                <label className="quest-briefing" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Assign room
                  <select
                    aria-label={`Assign ${npc.name} to room`}
                    className="title-picker"
                    onChange={(event) =>
                      dispatch(
                        gameActions.setNpcRoomAssignment({
                          npcId: npc.npcId,
                          roomId: event.target.value || null,
                        }),
                      )
                    }
                    style={{ display: 'block', marginTop: '0.3rem', maxWidth: '20rem' }}
                    value={npc.roomAssignment ?? ''}
                  >
                    <option value="">No fixed room</option>
                    {assignableRooms.map((room) => (
                      <option key={room.roomId} value={room.roomId}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        )}
      </section>

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

      {wards.length > 0 && (
        <section className="house-wards-section">
          <h2>Household</h2>
          <p className="summary">Named members under house protection — wards, rescued children, dependents.</p>
          <div className="mission-list">
            {wards.map((ward) => (
              <div key={ward.wardId} className="mission-row">
                <div className="mission-row-header">
                  <strong>{ward.name}</strong>
                  <span className="badge">{ward.stage.replace('_', ' ')}</span>
                  {ward.origin && <span className="badge">{ward.origin}</span>}
                  {ward.bondStatus && <span className="badge badge-warning">Bond held — {ward.bondStatus.holderId}</span>}
                </div>
                {(ward.parentNpcIds.length > 0 || ward.parentNpcId) && (
                  <p className="quest-briefing" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    Parent refs: {ward.parentNpcIds.length > 0 ? ward.parentNpcIds.join(', ') : ward.parentNpcId}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
