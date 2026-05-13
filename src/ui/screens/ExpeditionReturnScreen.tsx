import { useNavigate } from 'react-router-dom'
import {
  gameActions,
  selectExpeditionDestination,
  selectExpeditionState,
} from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

export function ExpeditionReturnScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const expState = useAppSelector(selectExpeditionState)
  const destination = useAppSelector(selectExpeditionDestination)

  if (!expState || expState.status !== 'returned') {
    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>No Expedition to Debrief</h1>
        <button className="action-button" onClick={() => navigate('/expedition')} type="button">
          Expeditions →
        </button>
      </section>
    )
  }

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>Return from {destination?.name ?? 'the field'}</h1>
      <p className="summary">
        {expState.squadNpcIds.length} operative
        {expState.squadNpcIds.length !== 1 ? 's' : ''} returned. {expState.daysDeparted} days out.
      </p>

      <div className="overview-grid">
        <article className="detail-panel">
          <h2>What They Found</h2>
          {expState.discoveries.length === 0 ? (
            <p className="summary">Nothing of note. The road gives nothing freely.</p>
          ) : (
            <div className="mission-list">
              {expState.discoveries.map((d, i) => (
                <div key={i} className="mission-row">
                  <span className="badge badge-positive">{d.type}</span>
                  <span>{d.label ?? d.itemId ?? `${d.amount} Marks`}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="detail-panel">
          <h2>What Happened Here</h2>
          <p className="summary text-muted">
            {expState.daysDeparted} days passed in Valdenmoor while the squad was away. The city
            moved on without you.
          </p>
          <p className="summary">The log will show what occurred.</p>
        </article>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <button
          className="action-button action-button--primary"
          onClick={() => {
            dispatch(gameActions.resolveExpedition())
            navigate('/dashboard')
          }}
          type="button"
        >
          Close Debrief — Return to Operations →
        </button>
      </div>
    </section>
  )
}
