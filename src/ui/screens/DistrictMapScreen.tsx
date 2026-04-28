import { gameActions, selectCurrentDistrictId, selectDistrictMapEntries, selectInstitutionalStanding } from '../../application'
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
  const institutionalStanding = useAppSelector(selectInstitutionalStanding)
  const isCompactBlacklisted = institutionalStanding['faction-civic-compact'] === 'blacklisted'

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
              className={[
                isCurrent ? 'district-card--current' : '',
                district.accessRestricted ? 'district-card--restricted' : '',
              ].filter(Boolean).join(' ') || undefined}
              style={{ cursor: district.accessRestricted ? undefined : 'pointer' }}
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
                <span className="badge" style={{ marginRight: '0.5rem' }}>
                  {badge}
                </span>
                <span style={{ color: dangerColor, fontWeight: 'bold' }}>
                  {'▲'.repeat(district.dangerLevel)}
                </span>
                {' '}
                <span style={{ color: dangerColor }}>{dangerLabel}</span>
              </p>

              {isHighDanger && !district.accessRestricted && (
                <p className="badge badge-warning badge--inline">
                  Hostile territory
                </p>
              )}

              {district.accessRestricted && (
                <p className="badge badge-warning badge--inline">
                  Access restricted
                </p>
              )}

              {isCompactBlacklisted && district.controllingFactionId === 'faction-civic-compact' && !district.accessRestricted && (
                <p className="badge badge-warning badge--inline badge--enforcement">
                  Compact enforcement active — travel is dangerous
                </p>
              )}

              <p className="district-narrative">
                {district.narrativeSummary}
              </p>

              {district.narrativeHook && (
                <p className="district-narrative-hook">{district.narrativeHook}</p>
              )}

              {isCurrent && (
                <p className="badge badge--inline badge--mt">
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
