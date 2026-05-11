import { useNavigate, useParams } from 'react-router-dom'

import {
  gameActions,
  selectCurrentDistrictId,
  selectDistrictPOIs,
} from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { buildVenueSearch } from './locationContext'

const POI_TYPE_LABELS: Record<string, string> = {
  guild: 'Guild Hall',
  tavern: 'Tavern',
  shop: 'Shop',
  court: 'Court',
  residence: 'Residence',
  market: 'Market',
  faction_hq: 'Faction House',
  black_market: 'Black Market',
}

const ACTION_LABELS: Record<string, string> = {
  contracts: 'Review local work',
  hire: 'See who is waiting',
  shop: 'Browse local goods',
}

const ACTION_ROUTE: Record<string, string> = {
  contracts: '/contracts',
  hire: '/recruitment',
  shop: '/shops',
}

export function DistrictPoiScreen() {
  const { districtId, poiId } = useParams<{ districtId: string; poiId: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const currentDistrictId = useAppSelector(selectCurrentDistrictId)
  const pois = useAppSelector(selectDistrictPOIs(districtId ?? ''))

  const district = districtId ? contentCatalog.districtsById.get(districtId) : null
  const poi = poiId ? pois.find((entry) => entry.id === poiId) : null
  const npc = poi?.npcId ? contentCatalog.npcsById.get(poi.npcId) : null
  const isHere = districtId !== undefined && currentDistrictId === districtId

  if (!district || !poi) {
    return (
      <section className="screen-panel">
        <p className="eyebrow">District venue</p>
        <h1>Unknown location</h1>
        <button className="action-button" type="button" onClick={() => navigate('/district-map')}>
          ← District Map
        </button>
      </section>
    )
  }

  const venueSearch = buildVenueSearch(district.id, poi.id)

  return (
    <section className="screen-panel">
      <p className="eyebrow">
        <button
          className="nav-link"
          type="button"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onClick={() => navigate(`/district/${district.id}`)}
        >
          ← {district.name}
        </button>
        {' / '}
        {poi.name}
      </p>

      <h1>{poi.name}</h1>
      <p className="summary">{poi.description}</p>

      <div className="badge-row" style={{ marginBottom: '1rem' }}>
        <span className="badge">{POI_TYPE_LABELS[poi.type] ?? poi.type}</span>
        {poi.factionId && (
          <span className="badge">
            {contentCatalog.factionsById.get(poi.factionId)?.name ?? poi.factionId}
          </span>
        )}
        {poi.hasContracts && <span className="badge badge-positive">Work is posted here</span>}
        {poi.hasHireables && <span className="badge badge-positive">People are waiting here</span>}
        {poi.dialogueId && <span className="badge">Known face inside</span>}
      </div>

      {!isHere && (
        <button
          className="action-button action-button--primary"
          type="button"
          onClick={() => dispatch(gameActions.travelToDistrict(district.id))}
        >
          Step into {district.name}
        </button>
      )}
      {isHere && (
        <span className="badge badge-positive" style={{ marginBottom: '1rem', display: 'inline-block' }}>
          ● Inside the district
        </span>
      )}

      <div className="overview-grid">
        <article className="detail-panel">
          <h2>What this place offers</h2>
          <p className="summary">
            Local venues should feel like actual places. This step preserves their identity before you move into house management, market browsing, hiring, or contract review.
          </p>
          <div className="mission-list">
            {poi.actions.map((action) => (
              <div key={action} className="mission-row">
                <div className="mission-row-header">
                  <strong>{ACTION_LABELS[action] ?? action}</strong>
                  <span className="badge">{POI_TYPE_LABELS[poi.type] ?? poi.type}</span>
                </div>
                <button
                  className="action-button"
                  type="button"
                  disabled={!isHere}
                  onClick={() => {
                    if (action === 'contracts') {
                      dispatch(gameActions.discoverQuestLeadsAtPoi({ districtId: district.id, poiId: poi.id }))
                    }
                    navigate(`${ACTION_ROUTE[action]}${venueSearch}`)
                  }}
                >
                  Enter →
                </button>
              </div>
            ))}
            {poi.id === 'poi-pale-house-valdric' && (
              <div className="mission-row">
                <div className="mission-row-header">
                  <strong>Inspect the house interior</strong>
                  <span className="badge">Residence</span>
                </div>
                <button
                  className="action-button action-button--primary"
                  type="button"
                  disabled={!isHere}
                  onClick={() => navigate(`/house${venueSearch}`)}
                >
                  Enter the house →
                </button>
              </div>
            )}
            {poi.actions.length === 0 && poi.id !== 'poi-pale-house-valdric' && (
              <p className="summary">This venue is known, but it has no local interaction surface yet.</p>
            )}
          </div>
        </article>

        <article className="detail-panel">
          <h2>Continuity hooks</h2>
          <ul className="detail-list">
            <li>Future bespoke art can anchor to this venue rather than a generic district menu.</li>
            <li>Named NPCs, rumors, and local incidents can attach here without changing higher-level routes.</li>
            <li>Leaving a local feature returns you to this place instead of throwing away the district context.</li>
          </ul>
          {npc && (
            <>
              <h3 style={{ marginTop: '1rem' }}>Known presence</h3>
              <p className="summary" style={{ marginBottom: '0.5rem' }}>
                {npc.name}
              </p>
              <p className="summary">{npc.description ?? npc.background}</p>
            </>
          )}
          {poi.dialogueId && (
            <button
              className="action-button action-button--secondary"
              type="button"
              disabled={!isHere}
              onClick={() => {
                if (!poi.dialogueId) {
                  return
                }
                if (npc) {
                  dispatch(gameActions.discoverQuestLeadsFromNpc({
                    districtId: district.id,
                    npcId: npc.id,
                    poiId: poi.id,
                  }))
                }
                const tree = contentCatalog.dialoguesById.get(poi.dialogueId)
                if (!tree) {
                  return
                }
                dispatch(gameActions.startDialogue({ dialogueId: tree.id, nodeId: tree.openingNodeId }))
                navigate(`/dialogue${venueSearch}`)
              }}
              style={{ marginTop: '1rem' }}
            >
              Speak with the contact
            </button>
          )}
        </article>
      </div>
    </section>
  )
}
