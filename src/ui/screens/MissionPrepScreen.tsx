import {
  gameActions,
  selectMissionPrepSummary,
  squadRules,
} from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

export function MissionPrepScreen() {
  const dispatch = useAppDispatch()
  const summary = useAppSelector(selectMissionPrepSummary)

  return (
    <section className="screen-panel">
      <p className="eyebrow">Project Destiny</p>
      <h1>Mission Prep</h1>
      <p className="summary">
        Review the seeded squad and bench through application selectors. This
        screen stays read-only until mission assignment and combat flows are
        introduced at the application layer.
      </p>
      <p className="summary">
        Squad size: {summary.selectedSquad.length}/{squadRules.maxSquadSize}
      </p>

      <div className="mission-prep-layout">
        <article className="detail-panel">
          <h2>Selected Squad</h2>
          <div className="mission-list">
            {summary.selectedSquad.map((entry) => (
              <div key={entry.npcId} className="mission-row">
                <strong>{entry.name}</strong>
                <span>{entry.assignment}</span>
                <span>Morale {entry.morale}</span>
                <span>Stress {entry.stress}</span>
                <button
                  className="action-button"
                  onClick={() =>
                    dispatch(gameActions.removeNpcFromSelectedSquad(entry.npcId))
                  }
                  type="button"
                >
                  Remove from squad
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <h2>Available Roster</h2>
          <div className="mission-list">
            {summary.availableRoster.length > 0 ? (
              summary.availableRoster.map((entry) => (
                <div key={entry.npcId} className="mission-row">
                  <strong>{entry.name}</strong>
                  <span>{entry.assignment}</span>
                  <span>Loyalty {entry.loyalty}</span>
                  <button
                    className="action-button"
                    onClick={() =>
                      dispatch(gameActions.addNpcToSelectedSquad(entry.npcId))
                    }
                    type="button"
                  >
                    Add to squad
                  </button>
                </div>
              ))
            ) : (
              <p className="summary">All seeded operatives are currently assigned to the squad.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
