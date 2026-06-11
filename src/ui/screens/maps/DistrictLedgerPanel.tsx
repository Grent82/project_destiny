import { FactionStamp } from './mapSymbols'
import './maps.css'

const FACTION_SHORT_NAMES: Record<string, string> = {
  'faction-civic-compact': 'Compact',
  'faction-gilded-court': 'Court',
  'faction-foundry-league': 'League',
  'faction-tallow-ring': 'Ring',
  'faction-restored': 'Restored',
}

const DANGER_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'Elevated',
  4: 'High',
  5: 'Severe',
}

function tensionLabel(tension: number): string {
  if (tension <= 30) return 'Calm'
  if (tension <= 60) return 'Uneasy'
  return 'Dangerous'
}

function tensionBadgeClass(tension: number): string {
  if (tension <= 30) return 'tension-badge--calm'
  if (tension <= 60) return 'tension-badge--uneasy'
  return 'tension-badge--dangerous'
}

export interface DistrictLedgerEntry {
  id: string
  name: string
  controllingFactionId: string | null
  contestedByFactionIds: string[]
  dangerLevel: number
  accessRestricted: boolean
  narrativeSummary: string
  narrativeHook?: string
  hooks?: string[]
  isCurrent: boolean
  tension: number | null
}

interface DistrictLedgerPanelProps {
  entry: DistrictLedgerEntry | null
  houseDistrictId: string | null
  isCompactBlacklisted: boolean
  travelTimeCost: number
  onTravel: (districtId: string) => void
  onView: (districtId: string) => void
}

export function DistrictLedgerPanel({
  entry,
  houseDistrictId,
  isCompactBlacklisted,
  travelTimeCost,
  onTravel,
  onView,
}: DistrictLedgerPanelProps) {
  if (!entry) {
    return (
      <aside className="map-ledger-panel" aria-label="District ledger">
        <p className="map-ledger-empty">Point at a district on the survey to read its entry.</p>
      </aside>
    )
  }

  const factionName = entry.controllingFactionId
    ? (FACTION_SHORT_NAMES[entry.controllingFactionId] ?? entry.controllingFactionId)
    : entry.contestedByFactionIds.length > 0
      ? `Contested — ${entry.contestedByFactionIds
          .map((factionId) => FACTION_SHORT_NAMES[factionId] ?? factionId)
          .join(' · ')}`
      : 'Open'
  const dangerLabel = DANGER_LABELS[entry.dangerLevel] ?? String(entry.dangerLevel)
  const enforcementActive =
    isCompactBlacklisted && entry.controllingFactionId === 'faction-civic-compact' && !entry.accessRestricted

  return (
    <aside className="map-ledger-panel" aria-label="District ledger">
      <h2>
        {entry.controllingFactionId && (
          <svg viewBox="0 0 28 28" width="26" height="26" className="map-ledger-stamp" aria-hidden>
            <FactionStamp factionId={entry.controllingFactionId} x={14} y={14} size={26} />
          </svg>
        )}
        {entry.name}
      </h2>
      <div className="map-ledger-tags">
        <span className="badge">{factionName}</span>
        <span className="badge">
          {'▲'.repeat(entry.dangerLevel)} {dangerLabel}
        </span>
        {entry.tension !== null && (
          <span className={`badge tension-badge ${tensionBadgeClass(entry.tension)}`}>
            Tension: {tensionLabel(entry.tension)}
          </span>
        )}
        {entry.id === houseDistrictId && <span className="badge badge--hq">⌂ House Valdris</span>}
        {entry.isCurrent && <span className="badge badge-positive">● You are here</span>}
        {entry.accessRestricted && <span className="badge badge-warning">Access restricted</span>}
        {entry.dangerLevel >= 4 && !entry.accessRestricted && (
          <span className="badge badge-warning">Hostile territory</span>
        )}
      </div>

      <div className="map-ledger-body">
        <p>{entry.narrativeSummary}</p>
        {entry.narrativeHook && <p className="map-ledger-hook">{entry.narrativeHook}</p>}
        {entry.hooks?.[0] && <p className="map-ledger-note">{entry.hooks[0]}</p>}
        {enforcementActive && (
          <p className="map-ledger-note" style={{ color: 'var(--accent-blood, #7a2020)' }}>
            Compact enforcement active — travel is dangerous.
          </p>
        )}
        {entry.accessRestricted && (
          <p className="map-ledger-note">The gate wants clearance the house does not hold yet.</p>
        )}
      </div>

      <div className="map-ledger-actions">
        {!entry.isCurrent && !entry.accessRestricted && (
          <button
            className="action-button action-button--primary"
            type="button"
            onClick={() => onTravel(entry.id)}
          >
            Travel — {travelTimeCost} slot{travelTimeCost === 1 ? '' : 's'}
          </button>
        )}
        {!entry.accessRestricted && (
          <button className="action-button" type="button" onClick={() => onView(entry.id)}>
            {entry.isCurrent ? 'Walk the district →' : 'Study the plate →'}
          </button>
        )}
      </div>
    </aside>
  )
}
