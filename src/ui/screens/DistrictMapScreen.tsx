import { Link } from 'react-router-dom'
import { gameActions, selectCurrentDistrictId, selectDistrictMapEntries, selectHouseDistrictId, selectInstitutionalStanding } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

const DISTRICT_IMAGE_MAP: Record<string, string> = {
  'district-the-pale': 'the-pale',
  'district-ironworks': 'iron-docks',
  'district-harbor': 'the-city',
  'district-the-warrens': 'the-tangle',
  'district-the-hollows': 'ashfields',
}

function districtImageSrc(id: string): string | null {
  const slug = DISTRICT_IMAGE_MAP[id]
  return slug ? `/districts/${slug}.jpg` : null
}

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
  return 'Open'
}

function tensionBadgeClass(tension: number): string {
  if (tension <= 30) return 'tension-badge--calm'
  if (tension <= 60) return 'tension-badge--uneasy'
  return 'tension-badge--dangerous'
}

function tensionLabel(tension: number): string {
  if (tension <= 30) return 'Calm'
  if (tension <= 60) return 'Uneasy'
  return 'Dangerous'
}

export function DistrictMapScreen() {
  const dispatch = useAppDispatch()
  const districts = useAppSelector(selectDistrictMapEntries)
  const currentDistrictId = useAppSelector(selectCurrentDistrictId)
  const houseDistrictId = useAppSelector(selectHouseDistrictId)
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

      <p className="district-quick-action">
        <Link className="nav-link nav-link--inline" to="/shops">Market →</Link>
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
          const isHouseDistrict = district.id === houseDistrictId

          return (
            <article
              key={district.id}
              className={[
                `district-card--${district.id.replace('district-', '')}`,
                isCurrent ? 'district-card--current' : '',
                district.accessRestricted ? 'district-card--restricted' : '',
                isHouseDistrict ? 'district-card--hq' : '',
              ].filter(Boolean).join(' ')}
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

            >
              {districtImageSrc(district.id) && (
                <img
                  className="district-card-art"
                  src={districtImageSrc(district.id)!}
                  alt=""
                  aria-hidden
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <h2>{district.name}</h2>

              {isHouseDistrict && (
                <p className="badge badge--hq badge--inline">⌂ House Valdris</p>
              )}

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

              {district.hooks && district.hooks[0] && (
                <p className="district-hook">{district.hooks[0]}</p>
              )}

              {district.worldNpcs.length > 0 && (
                <div className="district-people">
                  <h3 className="district-people__heading">People</h3>
                  <ul className="district-people__list">
                    {district.worldNpcs.map((npc) => (
                      <li key={npc.id} className="district-people__entry">
                        <span className="district-people__name">{npc.name}</span>
                        {' — '}
                        <span className="district-people__desc">{npc.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isCurrent && (
                <p className="badge badge--inline badge--mt">
                  You are here
                </p>
              )}

              {district.tension !== null && (
                <p className={`badge tension-badge ${tensionBadgeClass(district.tension)} badge--inline`}>
                  Tension: {tensionLabel(district.tension)}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
