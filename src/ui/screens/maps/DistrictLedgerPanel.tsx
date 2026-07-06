import { FactionStamp } from './mapSymbols'
import { dangerLabel, dangerBadgeClass, restrictionReason } from './dangerLevel'
import './maps.css'

const FACTION_SHORT_NAMES: Record<string, string> = {
  'faction-civic-compact': 'Compact',
  'faction-gilded-court': 'Court',
  'faction-foundry-league': 'League',
  'faction-tallow-ring': 'Ring',
  'faction-restored': 'Restored',
  'faction-house-merrow': 'House Merrow',
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
  minControlFactionStanding: number | null
  tags: string[]
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

  const shortFactionName = (factionId: string) => FACTION_SHORT_NAMES[factionId] ?? factionId
  const factionName = entry.controllingFactionId
    ? shortFactionName(entry.controllingFactionId)
    : entry.contestedByFactionIds.length > 0
      ? `Contested — ${entry.contestedByFactionIds.map(shortFactionName).join(' · ')}`
      : 'Open'
  const enforcementActive =
    isCompactBlacklisted && entry.controllingFactionId === 'faction-civic-compact' && !entry.accessRestricted

  return (
    <aside className="map-ledger-panel" aria-label="District ledger">
      <div className="map-ledger-thumbnail">
        <img
          src={`/districts/${entry.id.replace(/^district-/, '')}.jpg`}
          alt={`${entry.name} district`}
          loading="lazy"
          onError={(event) => {
            const img = event.currentTarget
            if (img.src.endsWith('/districts/_fallback.jpg')) {
              img.style.display = 'none'
              return
            }
            img.src = '/districts/_fallback.jpg'
          }}
        />
      </div>
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
        <span
          className={`badge danger-badge ${dangerBadgeClass(entry.dangerLevel)}`}
          title={entry.tags.length > 0 ? entry.tags.join(', ') : undefined}
        >
          {'▲'.repeat(entry.dangerLevel)} {dangerLabel(entry.dangerLevel)} ({entry.dangerLevel}/5)
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
        {entry.accessRestricted && entry.minControlFactionStanding != null && entry.controllingFactionId && (
          // Only add a separate note when there's a real, distinct mechanical requirement --
          // districts restricted for narrative-only reasons (condemned, unofficial) already have
          // that explanation in narrativeSummary above; repeating it verbatim here would be a
          // redundant duplicate line, not a genuine second piece of information.
          <p className="map-ledger-note">{restrictionReason(entry, shortFactionName)}</p>
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
