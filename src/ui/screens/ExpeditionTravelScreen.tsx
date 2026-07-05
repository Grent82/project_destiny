import { useNavigate } from 'react-router-dom'
import {
  gameActions,
  selectExpeditionDestination,
  selectExpeditionState,
} from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { useAppDispatch, useAppSelector } from '../app/hooks'

export function ExpeditionTravelScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const expState = useAppSelector(selectExpeditionState)
  const destination = useAppSelector(selectExpeditionDestination)

  if (!expState || expState.status === 'idle') {
    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>No Active Expedition</h1>
        <button
          className="action-button"
          onClick={() => navigate('/expedition')}
          type="button"
        >
          Plan Expedition →
        </button>
      </section>
    )
  }

  if (expState.status === 'returned') {
    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>Expedition Complete</h1>
        <p className="summary">Your squad has returned.</p>
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

  const latestEncounter = expState.encounters[expState.encounters.length - 1]
  const needsCombat = latestEncounter?.type === 'combat' && !latestEncounter.resolved

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>{destination?.name ?? 'Expedition'}</h1>
      <p className="summary">{destination?.description}</p>

      <div className="day-header">
        <p className="day-display">
          Day {expState.daysDeparted} of {expState.totalDays} —{' '}
          {expState.suppliesRemaining} supplies remaining
        </p>
      </div>

      <div className="overview-grid">
        <article className="detail-panel">
          <h2>Progress</h2>
          <div className="expedition-progress-bar">
            <div
              className="expedition-progress-fill"
              style={{
                width: `${expState.totalDays > 0 ? (expState.daysDeparted / expState.totalDays) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mission-list" style={{ marginTop: '1rem' }}>
            {expState.encounters.map((enc, i) => (
              <div key={i} className="mission-row">
                <strong>Day {enc.day}</strong>
                <span
                  className={`badge ${enc.type === 'combat' ? 'badge-crit' : enc.type === 'discovery' ? 'badge-positive' : ''}`}
                >
                  {enc.type}
                </span>
                <span className="text-muted">{enc.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <h2>The Squad</h2>
          <div className="mission-list">
            {expState.squadNpcIds.map((id) => {
              // destiny-rama.14: enemy defs live in npcsById now too, no separate enemy catalog.
              const name = contentCatalog.npcsById.get(id)?.name ?? id
              return (
                <div key={id} className="mission-row">
                  <strong>{name}</strong>
                </div>
              )
            })}
          </div>
        </article>

        <article className="detail-panel">
          <h2>Action</h2>
          {needsCombat ? (
            <>
              <p className="summary" style={{ color: 'var(--danger, #c44)' }}>
                Hostile contact. Resolve the engagement.
              </p>
              <button
                className="action-button action-button--danger"
                onClick={() => {
                  dispatch(gameActions.startCombatEncounter())
                  navigate('/combat')
                }}
                type="button"
              >
                Enter Engagement →
              </button>
            </>
          ) : expState.status === 'traveling' ? (
            <button
              className="action-button action-button--primary"
              onClick={() => dispatch(gameActions.advanceExpeditionDay())}
              type="button"
            >
              Advance Day →
            </button>
          ) : null}
        </article>
      </div>
    </section>
  )
}
