import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  gameActions,
  selectCurrentDistrictId,
  selectDistrictPOIs,
  selectPoiAvailability,
  selectWorldNpcViewsByDistrict,
  selectWorldNpcsByDistrictAndSlot,
} from '../../application'
import type { RootState } from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { DistrictMap } from './maps/DistrictMap'
import { PoiLedgerPanel } from './maps/PoiLedgerPanel'

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
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)

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
  const districtNpcs = districtId ? selectWorldNpcsByDistrictAndSlot(districtId, timeSlot) : []
  const npcMarkers = [
    ...anchoredNpcs.map((view) => ({ npcId: view.npcId, name: view.name, poiId: view.currentLocationId })),
    ...districtNpcs
      .filter((npc) => !anchoredNpcs.some((view) => view.npcId === npc.id))
      .map((npc) => ({ npcId: npc.id, name: npc.name, poiId: null })),
  ]
  function folkNote(text: string | undefined): string {
    if (!text) return ''
    const firstSentence = text.split(/(?<=\.)\s/)[0] ?? text
    return firstSentence.length > 110 ? `${firstSentence.slice(0, 107)}…` : firstSentence
  }
  const wardFolk = [
    ...anchoredNpcs.map((view) => ({ npcId: view.npcId, name: view.name, note: folkNote(view.background) })),
    ...districtNpcs
      .filter((npc) => !anchoredNpcs.some((view) => view.npcId === npc.id))
      .map((npc) => ({ npcId: npc.id, name: npc.name, note: folkNote(npc.description) })),
  ]
  const mapPois = pois.map((poi) => ({
    ...poi,
    isOpen: selectPoiAvailability(poi.id, timeSlot),
  }))
  const selectedPoi = mapPois.find((poi) => poi.id === selectedPoiId) ?? null
  const npcsAtSelectedPoi = selectedPoi
    ? npcMarkers.filter((marker) => marker.poiId === selectedPoi.id).map((marker) => marker.name)
    : []

  function handleEnter() {
    if (!isHere && districtId && district && !district.accessRestricted) {
      dispatch(gameActions.travelToDistrict(districtId))
    }
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

      <div className="map-with-ledger">
        <DistrictMap
          districtId={district.id}
          districtName={district.name}
          pois={mapPois}
          npcMarkers={npcMarkers}
          isHere={isHere}
          selectedPoiId={selectedPoiId}
          onSelectPoi={setSelectedPoiId}
        />
        <div className="map-ledger-holder">
          <PoiLedgerPanel
            poi={selectedPoi}
            isHere={isHere}
            isOpen={selectedPoi?.isOpen ?? true}
            timeSlot={timeSlot}
            npcsPresent={npcsAtSelectedPoi}
            wardFolk={wardFolk}
            onEnter={(poiId) => navigate(`/district/${district.id}/poi/${poiId}`)}
          />
        </div>
      </div>
    </section>
  )
}
