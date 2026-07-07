import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HOUSE_ROOM_FUNCTION_EFFECT_SUMMARIES } from '../../../application/commands/houseRoomFunctions'
import { getRoomRepairDays } from '../../../application/commands/houseRepairs'
import { getHouseDiscovery } from '../../../application/content/houseDiscoveries'
import { formatMarksAbbrev } from '../../../domain/game/currency'
import type { HouseRoom, RoomState } from '../../../domain/game/contracts'
import { ConfirmationModal } from '../../components/ConfirmationModal'
import './maps.css'

const ROOM_EFFECTS: Record<string, string> = {
  'room-kitchen': "When intact: each NPC's daily wage drops by 1 Mark. The house feeds its own.",
  'room-study': 'When intact: NPCs in training gain +25% skill per day.',
  'room-bureau':
    'When intact: working accounts office. Repair to track debts, income, and house obligations from the Ledger.',
  'room-master-chamber':
    "When intact: the lord's chamber receives visitors. Faction contacts begin to treat the house as a going concern.",
  'room-servant-quarters': '+1 roster slot when intact. The house can shelter another.',
  'room-barracks': '+1 roster slot for trained fighters when intact.',
  'room-east-wing': '+2 roster slots when intact. The east wing is habitable again.',
  'room-garret': 'When intact: overlook the street below. Read district movement before it reaches the door.',
  'room-quarters':
    'One of the few sleeping rooms still fit for use. Any housed resident can recover here between assignments.',
}

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

export interface RoomLedgerRosterEntry {
  npcId: string
  name: string
  roomAssignment: string | null
}

interface RoomLedgerPanelProps {
  room: HouseRoom | null
  marks: number
  vaultUnlocked: boolean
  justSearched: boolean
  occupants: Array<{ npcId: string; name: string }>
  roster: RoomLedgerRosterEntry[]
  assignable: boolean
  onRepair: (roomId: string) => void
  onSearch: (roomId: string) => void
  onAssign: (npcId: string, roomId: string | null) => void
}

export function RoomLedgerPanel({
  room,
  marks,
  vaultUnlocked,
  justSearched,
  occupants,
  roster,
  assignable,
  onRepair,
  onSearch,
  onAssign,
}: RoomLedgerPanelProps) {
  const [confirmSearch, setConfirmSearch] = useState(false)

  if (!room) {
    return (
      <aside className="map-ledger-panel" aria-label="Room ledger">
        <p className="map-ledger-empty">Point at a room on the plan to read its entry.</p>
      </aside>
    )
  }

  const canRepair =
    room.repairCost > 0 &&
    room.repairDaysRemaining === 0 &&
    (room.state === 'damaged' || room.state === 'stripped' || room.state === 'collapsed' || room.state === 'destroyed') &&
    marks >= room.repairCost
  const canSearch =
    !room.searched && room.state !== 'locked' && room.state !== 'collapsed' && room.state !== 'destroyed'
  const repairDays = getRoomRepairDays(room)
  const discovery = room.searched ? getHouseDiscovery(room.roomId, vaultUnlocked) : null
  const hasUnresolvedLeads = (discovery?.actionableFinds.length ?? 0) > 0
  const followUp = room.state === 'intact' ? ROOM_INTACT_FOLLOWUP[room.roomId] : undefined

  return (
    <aside className="map-ledger-panel" aria-label="Room ledger">
      <h2>{room.name}</h2>
      <div className="map-ledger-tags">
        <span className="badge">{STATE_LABELS[room.state]}</span>
        {room.repairDaysRemaining > 0 && (
          <span className="badge badge-warning">
            Repairs underway: {room.repairDaysRemaining} day{room.repairDaysRemaining !== 1 ? 's' : ''} remaining
          </span>
        )}
        {room.searched && <span className="badge">✓ Searched</span>}
      </div>

      <div className="map-ledger-body">
        {ROOM_EFFECTS[room.roomId] && <p>{ROOM_EFFECTS[room.roomId]}</p>}
        {room.roomFunction && (
          <p>
            Assigned purpose: <strong>{room.roomFunction}</strong>.{' '}
            {HOUSE_ROOM_FUNCTION_EFFECT_SUMMARIES[room.roomFunction]}
          </p>
        )}
        {followUp && (
          <p>
            {followUp.text} <Link to={followUp.to}>{followUp.label}</Link>
          </p>
        )}

        {/* Fresh search: full discovery payload */}
        {room.searched && justSearched && discovery && (
          <div>
            <p>{discovery.message}</p>
            {discovery.actionableFinds.length > 0 && (
              <ul style={{ margin: '0 0 0.55rem', paddingLeft: '1.1rem' }}>
                {discovery.actionableFinds.map((find) => (
                  <li key={find.itemId}>{find.label}</li>
                ))}
              </ul>
            )}
            {discovery.flavorFinds.length > 0 && (
              <ul className="map-ledger-note" style={{ margin: '0 0 0.55rem', paddingLeft: '1.1rem' }}>
                {discovery.flavorFinds.map((find) => (
                  <li key={find}>{find}</li>
                ))}
              </ul>
            )}
            {discovery.followUp && <p className="map-ledger-hook">— {discovery.followUp}</p>}
          </div>
        )}

        {/* Returning view: persistent leads and guidance only */}
        {room.searched && !justSearched && discovery && (
          <div>
            {hasUnresolvedLeads && (
              <ul style={{ margin: '0 0 0.55rem', paddingLeft: '1.1rem' }}>
                {discovery.actionableFinds.map((find) => (
                  <li key={find.itemId}>{find.label}</li>
                ))}
              </ul>
            )}
            {discovery.followUp && <p className="map-ledger-hook">— {discovery.followUp}</p>}
          </div>
        )}

        {room.state === 'locked' && <p className="map-ledger-note">Sealed. The hidden catch has not been found.</p>}
        {room.state === 'collapsed' && room.repairCost > 0 && marks < room.repairCost && (
          <p className="map-ledger-note">Structural collapse. Clear rubble: {formatMarksAbbrev(room.repairCost)}.</p>
        )}

        {occupants.length > 0 && (
          <p className="map-ledger-note">
            Quartered here: {occupants.map((occupant) => occupant.name).join(', ')}
          </p>
        )}
      </div>

      <div className="map-ledger-actions">
        {canRepair && (
          <button className="action-button action-button--primary" type="button" onClick={() => onRepair(room.roomId)}>
            Repair — {formatMarksAbbrev(room.repairCost)} · {repairDays} day{repairDays !== 1 ? 's' : ''}
          </button>
        )}
        {room.repairCost > 0 && !canRepair && room.state !== 'intact' && room.repairDaysRemaining === 0 && (
          <p className="map-ledger-note">
            {marks < room.repairCost
              ? `Needs ${formatMarksAbbrev(room.repairCost)} (short ${formatMarksAbbrev(room.repairCost - marks)}) · ${repairDays} day${repairDays !== 1 ? 's' : ''} to repair`
              : STATE_LABELS[room.state]}
          </p>
        )}
        {canSearch && (
          <button className="action-button action-button--secondary" type="button" onClick={() => setConfirmSearch(true)}>
            Search
          </button>
        )}
        {assignable && roster.length > 0 && (
          <label className="map-ledger-note" style={{ display: 'block' }}>
            Quarter someone here
            <select
              aria-label={`Assign an occupant to ${room.name}`}
              className="title-picker"
              style={{ display: 'block', marginTop: '0.3rem', width: '100%' }}
              value=""
              onChange={(event) => {
                if (event.target.value) onAssign(event.target.value, room.roomId)
              }}
            >
              <option value="">Choose…</option>
              {roster
                .filter((npc) => npc.roomAssignment !== room.roomId)
                .map((npc) => (
                  <option key={npc.npcId} value={npc.npcId}>
                    {npc.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {occupants.map((occupant) => (
          <button
            key={occupant.npcId}
            className="action-button action-button--ghost"
            type="button"
            onClick={() => onAssign(occupant.npcId, null)}
          >
            Release {occupant.name}&apos;s room
          </button>
        ))}
      </div>

      {confirmSearch && (
        <ConfirmationModal
          heading={`Search ${room.name}?`}
          consequence="Searching the room will consume the search opportunity. Any findings will be revealed."
          confirmLabel="Search room"
          onConfirm={() => {
            onSearch(room.roomId)
            setConfirmSearch(false)
          }}
          onCancel={() => setConfirmSearch(false)}
        />
      )}
    </aside>
  )
}
