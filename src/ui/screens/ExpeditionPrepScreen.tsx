import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  gameActions,
  selectAllExpeditionDestinations,
  selectExpeditionStatus,
} from '../../application'
import { formatNpcAssignmentLabel } from '../../application/content/assignmentDisplay'
import { contentCatalog } from '../../application/content/contentCatalog'
import { isDeployable } from '../../application/commands/isDeployable'
import { EmptyState } from '../components/EmptyState'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { EnvironsMap } from './maps/EnvironsMap'

export function ExpeditionPrepScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const destinations = useAppSelector(selectAllExpeditionDestinations)
  const expStatus = useAppSelector(selectExpeditionStatus)
  const roster = useAppSelector((state) => state.game.roster)
  const foodSecurity = useAppSelector((state) => state.game.cityResources?.foodSecurity ?? 0)

  const [selectedDest, setSelectedDest] = useState<string | null>(null)
  const [squadIds, setSquadIds] = useState<string[]>([])
  const [supplies, setSupplies] = useState(4)

  const destination = destinations.find((d) => d.id === selectedDest)

  if (expStatus === 'traveling') {
    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>Expedition Underway</h1>
        <p className="summary">An expedition is in the field. Advance days on the Expedition screen.</p>
        <button
          className="action-button action-button--primary"
          onClick={() => navigate('/expedition-travel')}
          type="button"
        >
          Go to Expedition →
        </button>
      </section>
    )
  }

  if (expStatus === 'returned') {
    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>Expedition Returned</h1>
        <p className="summary">Your squad has returned. Debrief and collect what they found.</p>
        <button
          className="action-button action-button--primary"
          onClick={() => navigate('/expedition-return')}
          type="button"
        >
          Debrief →
        </button>
      </section>
    )
  }

  const availableRoster = roster.filter((npc) => npc.assignment === 'idle' && isDeployable(npc))

  function toggleNpc(npcId: string) {
    setSquadIds((prev) =>
      prev.includes(npcId) ? prev.filter((id) => id !== npcId) : [...prev, npcId],
    )
  }

  function canDepart() {
    return selectedDest !== null && squadIds.length > 0 && supplies <= foodSecurity && supplies > 0
  }

  function handleDepart() {
    if (!canDepart() || !selectedDest) return
    dispatch(
      gameActions.startExpedition({
        destinationId: selectedDest,
        squadNpcIds: squadIds,
        supplies,
      }),
    )
    navigate('/expedition-travel')
  }

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>Expeditions</h1>
      <p className="summary">
        The world outside Valdenmoor does not wait. Choose a destination, commit a squad, and
        allocate supplies.
      </p>
      <p className="summary">
        Food security: <strong>{foodSecurity}</strong>
      </p>

      <div className="overview-grid">
        <article className="detail-panel">
          <h2>Destination</h2>
          <EnvironsMap selectedId={selectedDest} onSelect={setSelectedDest} />
          <div className="mission-list">
            {destinations.map((dest) => (
              <div
                key={dest.id}
                className={`mission-row ${selectedDest === dest.id ? 'mission-row--selected' : ''}`}
                onClick={() => setSelectedDest(dest.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelectedDest(dest.id)
                }}
              >
                <strong>{dest.name}</strong>
                <span className="text-muted">{dest.description}</span>
                <div className="badge-row">
                  <span className="badge">{dest.durationDays} days</span>
                  <span className="badge">{'▲'.repeat(dest.dangerLevel)} danger</span>
                  <span className="badge">{dest.supplyConsumptionPerDay}/day supplies</span>
                </div>
                {dest.narrativeHook && (
                  <p className="district-narrative-hook">{dest.narrativeHook}</p>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <h2>Squad</h2>
          {availableRoster.length === 0 ? (
            <EmptyState message={`No ${formatNpcAssignmentLabel('idle').toLowerCase()} operatives available.`} icon="👤" />
          ) : (
            <div className="mission-list">
              {availableRoster.map((npc) => {
                const name =
                  contentCatalog.npcsById.get(npc.npcId)?.name ??
                  contentCatalog.enemyNpcsById.get(npc.npcId)?.name ??
                  npc.npcId
                return (
                  <div key={npc.npcId} className="mission-row">
                    <label className="expedition-squad-label">
                      <input
                        type="checkbox"
                        checked={squadIds.includes(npc.npcId)}
                        onChange={() => toggleNpc(npc.npcId)}
                      />
                      {' '}
                      {name}
                    </label>
                  </div>
                )
              })}
            </div>
          )}
        </article>

        <article className="detail-panel">
          <h2>Supplies</h2>
          <p className="summary">Rations allocated. Supplies deducted from food security on departure.</p>
          <div className="stat-row">
            <span className="stat-label">Supply units</span>
            <input
              type="number"
              min={1}
              max={foodSecurity}
              value={supplies}
              onChange={(e) => setSupplies(Number(e.target.value))}
              className="opening-name-input"
              style={{ width: '4rem' }}
            />
          </div>
          {destination && (
            <p className="summary text-muted">
              Needed: {destination.supplyConsumptionPerDay * destination.durationDays} for full
              expedition.
            </p>
          )}
          <button
            className="action-button action-button--primary"
            disabled={!canDepart()} title={!canDepart() ? "Select an expedition and at least one operative to depart" : undefined}
            onClick={handleDepart}
            type="button"
            style={{ marginTop: '1rem' }}
          >
            Depart →
          </button>
          {!canDepart() && (
            <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
              {!selectedDest
                ? 'Select a destination.'
                : squadIds.length === 0
                  ? 'Select at least one operative.'
                  : supplies > foodSecurity
                    ? 'Not enough food security.'
                    : ''}
            </p>
          )}
        </article>
      </div>
    </section>
  )
}
