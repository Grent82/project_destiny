import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  gameActions,
  selectActionTimeCost,
  selectCurrentDistrictId,
  selectDistrictMapEntries,
  selectHouseDistrictId,
  selectInstitutionalStanding,
} from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { CityMap } from './maps/CityMap'
import { DistrictLedgerPanel } from './maps/DistrictLedgerPanel'

export function DistrictMapScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const districts = useAppSelector(selectDistrictMapEntries)
  const currentDistrictId = useAppSelector(selectCurrentDistrictId)
  const houseDistrictId = useAppSelector(selectHouseDistrictId)
  const institutionalStanding = useAppSelector(selectInstitutionalStanding)
  const isCompactBlacklisted = institutionalStanding['faction-civic-compact'] === 'blacklisted'
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(currentDistrictId)

  const selectedEntry = districts.find((district) => district.id === selectedDistrictId) ?? null

  function handleTravel(districtId: string) {
    const entry = districts.find((district) => district.id === districtId)
    if (!entry || entry.accessRestricted) return
    dispatch(gameActions.travelToDistrict(districtId))
    navigate(`/district/${districtId}`)
  }

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>The City</h1>
      <p className="summary">
        The house copy of the Compact survey — {districts.length} districts on two banks of the river. The survey ends
        at the wall. Move carefully — the city watches who passes through.
      </p>

      {currentDistrictId && (
        <p className="status-note">
          Currently in: <strong>{districts.find((d) => d.id === currentDistrictId)?.name ?? currentDistrictId}</strong>
        </p>
      )}

      <div className="map-with-ledger">
        <CityMap
          entries={districts}
          houseDistrictId={houseDistrictId}
          travelTimeCost={selectActionTimeCost('travel')}
          selectedDistrictId={selectedDistrictId}
          onSelectDistrict={setSelectedDistrictId}
          onSelectEnvirons={() => navigate('/expedition')}
        />
        <DistrictLedgerPanel
          entry={selectedEntry}
          houseDistrictId={houseDistrictId}
          isCompactBlacklisted={isCompactBlacklisted}
          travelTimeCost={selectActionTimeCost('travel')}
          onTravel={handleTravel}
          onView={(districtId) => navigate(`/district/${districtId}`)}
        />
      </div>
    </section>
  )
}
