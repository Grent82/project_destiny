import { gameActions, selectCurrentDistrictId, selectDistrictMapEntries } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

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

const DANGER_COLORS: Record<number, string> = {
  1: '#4caf50',
  2: '#cddc39',
  3: '#ff9800',
  4: '#f44336',
  5: '#8b0000',
}

function factionBadge(factionId: string | null, contestedIds: string[]): string {
  if (factionId && FACTION_SHORT_NAMES[factionId]) return FACTION_SHORT_NAMES[factionId]
  if (contestedIds.length > 0) return 'Contested'
  return 'Contested'
}

export function DistrictMapScreen() {
  const dispatch = useAppDispatch()
  const districts = useAppSelector(selectDistrictMapEntries)
  const currentDistrictId = useAppSelector(selectCurrentDistrictId)

  function handleTravel(districtId: string, accessRestricted: boolean) {
    if (accessRestricted) return
    dispatch(gameActions.travelToDistrict(districtId))
  }

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>The City</h1>
      <p className="summary">
        Six districts. Each one holds something. Move carefully — the city watches who passes through.
      </p>

      {currentDistrictId && (
        <p className="status-note">
          Currently in: <strong>{districts.find((d) => d.id === currentDistrictId)?.name ?? currentDistrictId}</strong>
        </p>
      )}

      <div className="overview-grid">
        {districts.map((district) => {
          const badge = factionBadge(district.controllingFactionId, district.contestedByFactionIds)
          const dangerColor = DANGER_COLORS[district.dangerLevel] ?? '#888'
          const dangerLabel = DANGER_LABELS[district.dangerLevel] ?? String(district.dangerLevel)
          const isHighDanger = district.dangerLevel >= 4
          const isCurrent = district.isCurrent

          return (
            <article
              key={district.id}
              style={{
                opacity: district.accessRestricted ? 0.55 : 1,
                outline: isCurrent ? '2px solid var(--color-accent, #aaa)' : undefined,
                cursor: district.accessRestricted ? 'not-allowed' : 'pointer',
              }}
              onClick={() => handleTravel(district.id, district.accessRestricted)}
              role="button"
              tabIndex={district.accessRestricted ? -1 : 0}
              aria-disabled={district.accessRestricted}
              aria-pressed={isCurrent}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleTravel(district.id, district.accessRestricted)
                }
              }}
              title={district.narrativeSummary}
            >
              <h2>{district.name}</h2>

              <p>
                <span
                  className="badge"
                  style={{ marginRight: '0.5rem' }}
                >
                  {badge}
                </span>

                <span style={{ color: dangerColor, fontWeight: 'bold' }}>
                  {'▲'.repeat(district.dangerLevel)}
                </span>
                {' '}
                <span style={{ color: dangerColor }}>{dangerLabel}</span>
              </p>

              {isHighDanger && !district.accessRestricted && (
                <p className="badge badge-warning" style={{ display: 'inline-block' }}>
                  Hostile territory
                </p>
              )}

              {district.accessRestricted && (
                <p className="badge badge-warning" style={{ display: 'inline-block' }}>
                  Access restricted
                </p>
              )}

              <p style={{ fontSize: '0.85em', marginTop: '0.5rem', color: 'var(--color-text-secondary, #999)' }}>
                {district.narrativeSummary}
              </p>

              {isCurrent && (
                <p className="badge" style={{ display: 'inline-block', marginTop: '0.25rem' }}>
                  You are here
                </p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
