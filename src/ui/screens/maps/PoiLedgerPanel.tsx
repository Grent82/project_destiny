import './maps.css'

const POI_TYPE_LABELS: Record<string, string> = {
  guild: 'Guild',
  tavern: 'Tavern',
  shop: 'Shop',
  court: 'Court',
  residence: 'Residence',
  market: 'Market',
  faction_hq: 'Faction HQ',
  black_market: 'Black Market',
}

const FACTION_SHORT: Record<string, string> = {
  'faction-civic-compact': 'Compact',
  'faction-gilded-court': 'Court',
  'faction-foundry-league': 'League',
  'faction-tallow-ring': 'Ring',
  'faction-restored': 'Restored',
}

const SLOT_LABELS: Record<string, string> = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  night: 'night',
}

export interface PoiLedgerEntry {
  id: string
  name: string
  type: string
  description: string
  factionId: string | null
  availableSlots: string[]
  hasContracts: boolean
  hasHireables: boolean
  dialogueId: string | null
}

interface PoiLedgerPanelProps {
  poi: PoiLedgerEntry | null
  isHere: boolean
  isOpen: boolean
  timeSlot: string
  npcsPresent: string[]
  onEnter: (poiId: string) => void
}

export function PoiLedgerPanel({ poi, isHere, isOpen, timeSlot, npcsPresent, onEnter }: PoiLedgerPanelProps) {
  if (!poi) {
    return (
      <aside className="map-ledger-panel" aria-label="Place ledger">
        <p className="map-ledger-empty">Point at a place on the plate to read its entry.</p>
      </aside>
    )
  }

  const keepsAllHours = poi.availableSlots.length >= 4
  const openSlots = keepsAllHours
    ? 'all hours'
    : poi.availableSlots.map((slot) => SLOT_LABELS[slot] ?? slot).join(', ')

  return (
    <aside className="map-ledger-panel" aria-label="Place ledger">
      <h2>{poi.name}</h2>
      <div className="map-ledger-tags">
        <span className="badge">{POI_TYPE_LABELS[poi.type] ?? poi.type}</span>
        {poi.factionId && <span className="badge">{FACTION_SHORT[poi.factionId] ?? poi.factionId}</span>}
        {poi.hasContracts && <span className="badge badge-positive">Work posted</span>}
        {poi.hasHireables && <span className="badge badge-positive">People waiting</span>}
        {poi.dialogueId && <span className="badge">Known contact</span>}
        {!isOpen && <span className="badge badge-warning">Closed at this hour</span>}
      </div>

      <div className="map-ledger-body">
        <p>{poi.description}</p>
        <p className="map-ledger-note">
          {isOpen
            ? `Open now (${SLOT_LABELS[timeSlot] ?? timeSlot}). Keeps hours: ${openSlots}.`
            : `Shuttered for the ${SLOT_LABELS[timeSlot] ?? timeSlot}. Keeps hours: ${openSlots}.`}
        </p>
        {npcsPresent.length > 0 && (
          <p className="map-ledger-note">
            <span className="map-npc-glyph">✦</span> Here now: {npcsPresent.join(', ')}
          </p>
        )}
      </div>

      <div className="map-ledger-actions">
        {isHere ? (
          <button
            className="action-button action-button--primary"
            type="button"
            onClick={() => onEnter(poi.id)}
          >
            Enter location
          </button>
        ) : (
          <p className="map-ledger-note">Enter the district to approach this place.</p>
        )}
      </div>
    </aside>
  )
}
