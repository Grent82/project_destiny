import { useNavigate, useParams } from 'react-router-dom'
import {
  gameActions,
  selectCurrentDistrictId,
  selectDistrictPOIs,
  selectWorldNpcViewsByDistrict,
  selectWorldNpcsByDistrictAndSlot,
} from '../../application'
import type { RootState } from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { DistrictMap } from './maps/DistrictMap'

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

const POI_TYPE_ICONS: Record<string, string> = {
  guild: '⚒',
  tavern: '⬡',
  shop: '⊕',
  court: '⚖',
  residence: '⌂',
  market: '⊞',
  faction_hq: '⚑',
  black_market: '◈',
}

const FACTION_SHORT: Record<string, string> = {
  'faction-civic-compact': 'Compact',
  'faction-gilded-court': 'Court',
  'faction-foundry-league': 'League',
  'faction-tallow-ring': 'Ring',
  'faction-restored': 'Restored',
}

const BORDER_LABELS: Record<string, string> = {
  open: 'Open passage',
  compact_checkpoint: 'Compact checkpoint',
  ring_toll: 'Ring toll gate',
  condemned_barrier: 'Condemned — dangerous crossing',
  restricted_gate: 'Restricted — clearance required',
}

export function DistrictInteriorScreen() {
  const { districtId } = useParams<{ districtId: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const currentDistrictId = useAppSelector(selectCurrentDistrictId)
  const pois = useAppSelector(selectDistrictPOIs(districtId ?? ''))
  const timeSlot = useAppSelector((state: RootState) => state.game.timeSlot)
  const anchoredNpcs = useAppSelector((state: RootState) =>
    districtId ? selectWorldNpcViewsByDistrict(state, districtId, timeSlot) : [],
  )
  const districtNpcs = districtId ? selectWorldNpcsByDistrictAndSlot(districtId, timeSlot) : []
  const npcMarkers = [
    ...anchoredNpcs.map((view) => ({ npcId: view.npcId, name: view.name, poiId: view.currentLocationId })),
    ...districtNpcs
      .filter((npc) => !anchoredNpcs.some((view) => view.npcId === npc.id))
      .map((npc) => ({ npcId: npc.id, name: npc.name, poiId: null })),
  ]

  const district = districtId ? contentCatalog.districtsById.get(districtId) : null

  if (!district) {
    return (
      <section className="screen-panel">
        <p className="eyebrow">District</p>
        <h1>Unknown district</h1>
        <button className="action-button" type="button" onClick={() => navigate('/district-map')}>
          ← City Map
        </button>
      </section>
    )
  }

  const isHere = currentDistrictId === districtId
  const adjacentDistricts = district.adjacentDistrictIds
    .map((id) => contentCatalog.districtsById.get(id))
    .filter(Boolean)

  function handleEnter() {
    if (!isHere && districtId && district && !district.accessRestricted) {
      dispatch(gameActions.travelToDistrict(districtId))
    }
  }

  function handleTravelTo(targetId: string, targetRestricted: boolean) {
    if (targetRestricted) return
    dispatch(gameActions.travelToDistrict(targetId))
    navigate(`/district/${targetId}`)
  }

  return (
    <section className="screen-panel">
      <p className="eyebrow">
        <button
          className="nav-link"
          type="button"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onClick={() => navigate('/district-map')}
        >
          ← City Map
        </button>
        {' / '}
        {district.name}
      </p>

      <h1>{district.name}</h1>
      <p className="summary">{district.narrativeSummary}</p>

      {!isHere && !district.accessRestricted && (
        <button className="action-button action-button--primary" type="button" onClick={handleEnter}>
          Enter {district.name}
        </button>
      )}
      {!isHere && district.accessRestricted && (
        <p className="badge badge-warning" style={{ marginBottom: '1rem', display: 'inline-block' }}>
          Access restricted
        </p>
      )}
      {isHere && (
        <span className="badge badge-positive" style={{ marginBottom: '1rem', display: 'inline-block' }}>
          ● You are here
        </span>
      )}

      <DistrictMap
        districtId={district.id}
        districtName={district.name}
        pois={pois}
        npcMarkers={npcMarkers}
        isHere={isHere}
        onSelectPoi={(poiId) => navigate(`/district/${district.id}/poi/${poiId}`)}
      />

      <div className="overview-grid" style={{ marginTop: '1.5rem' }}>

        <article className="detail-panel" style={{ gridColumn: '1 / -1' }}>
          <h2>Locations</h2>
          <div className="poi-grid">
            {pois.map((poi) => (
              <div key={poi.id} className={`poi-card poi-card--${poi.type}`}>
                <div className="poi-card-header">
                  <span className="poi-icon">{POI_TYPE_ICONS[poi.type] ?? '○'}</span>
                  <div>
                    <strong className="poi-name">{poi.name}</strong>
                    <span className="badge" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                      {POI_TYPE_LABELS[poi.type]}
                    </span>
                    {poi.factionId && (
                      <span className="badge" style={{ marginLeft: '0.25rem', fontSize: '0.7rem' }}>
                        {FACTION_SHORT[poi.factionId] ?? poi.factionId}
                      </span>
                    )}
                  </div>
                </div>
                <p className="poi-description">{poi.description}</p>
                <div className="poi-actions">
                  {poi.hasContracts && <span className="badge badge-positive">Work posted</span>}
                  {poi.hasHireables && <span className="badge badge-positive">People waiting</span>}
                  {poi.dialogueId && <span className="badge">Known contact</span>}
                </div>
                {isHere && (
                  <div className="poi-actions">
                    <button
                      className="action-button"
                      type="button"
                      onClick={() => navigate(`/district/${district.id}/poi/${poi.id}`)}
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                    >
                      Enter location
                    </button>
                  </div>
                )}
                {(poi.actions.length > 0 || poi.dialogueId || poi.id === 'poi-pale-house-valdric') && !isHere && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Enter the district to access this location.
                  </p>
                )}
              </div>
            ))}
          </div>
        </article>

        {adjacentDistricts.length > 0 && (
          <article className="detail-panel">
            <h2>Adjacent Districts</h2>
            <div className="mission-list">
              {adjacentDistricts.map((adj) => {
                if (!adj) return null
                const borderType = district.borderTypes[adj.id] ?? 'open'
                const isRestricted = adj.accessRestricted
                return (
                  <div key={adj.id} className="mission-row">
                    <div className="mission-row-header">
                      <strong>{adj.name}</strong>
                      <span className="badge">{BORDER_LABELS[borderType] ?? borderType}</span>
                      {isRestricted && <span className="badge badge-warning">Restricted</span>}
                    </div>
                    {!isRestricted && (
                      <button
                        className="action-button"
                        type="button"
                        onClick={() => handleTravelTo(adj.id, false)}
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                      >
                        Travel →
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </article>
        )}

      </div>
    </section>
  )
}
