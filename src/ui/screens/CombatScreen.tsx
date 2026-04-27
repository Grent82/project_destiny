import { gameActions, selectCombatScreenState } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

export function CombatScreen() {
  const dispatch = useAppDispatch()
  const combat = useAppSelector(selectCombatScreenState)

  return (
    <section className="screen-panel">
      <p className="eyebrow">Project Destiny</p>
      <h1>Combat</h1>
      <p className="summary">
        Resolve the first tactical encounter through a compact two-range action
        loop.
      </p>

      {!combat.hasActiveCombat ? (
        <div className="combat-empty-state">
          <p className="summary">
            No encounter is active. Start a seeded patrol clash from here or via
            mission prep.
          </p>
          <button
            className="action-button"
            onClick={() => dispatch(gameActions.startCombatEncounter())}
            type="button"
          >
            Start seeded encounter
          </button>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <article>
              <h2>Encounter State</h2>
              <p>Round {combat.round}</p>
              <p>Range: {combat.range}</p>
              <p>
                Outcome:{' '}
                <span
                  className={
                    combat.outcome === 'ongoing'
                      ? 'badge'
                      : combat.outcome === 'victory'
                        ? 'badge badge-positive'
                        : 'badge badge-warning'
                  }
                >
                  {combat.outcome}
                </span>
              </p>
            </article>
            <article>
              <h2>Initiative</h2>
              <p>
                {combat.activeCombatantName
                  ? `${combat.activeCombatantName} is acting now.`
                  : 'Encounter resolved.'}
              </p>
              <p>
                {combat.canAct
                  ? 'Choose an action for the active ally.'
                  : 'Enemy or resolved turns are handled automatically.'}
              </p>
            </article>
          </div>

          <div className="combat-action-row">
            <button
              className="action-button"
              disabled={!combat.canAct}
              onClick={() => dispatch(gameActions.performCombatAction('attack'))}
              type="button"
            >
              Attack
            </button>
            <button
              className="action-button"
              disabled={!combat.canAct}
              onClick={() => dispatch(gameActions.performCombatAction('advance'))}
              type="button"
            >
              Advance
            </button>
            <button
              className="action-button"
              disabled={!combat.canAct}
              onClick={() => dispatch(gameActions.performCombatAction('retreat'))}
              type="button"
            >
              Retreat
            </button>
            <button
              className="action-button"
              disabled={!combat.canAct}
              onClick={() => dispatch(gameActions.performCombatAction('guard'))}
              type="button"
            >
              Guard
            </button>
            <button
              className="action-button"
              disabled={combat.outcome === 'ongoing'}
              onClick={() => dispatch(gameActions.concludeCombatEncounter())}
              type="button"
            >
              Conclude encounter
            </button>
          </div>

          <div className="combat-layout">
            <article className="detail-panel">
              <h2>Allied Squad</h2>
              <div className="mission-list">
                {combat.allies.map((combatant) => (
                  <div key={combatant.combatantId} className="mission-row">
                    <strong>{combatant.name}</strong>
                    <span>
                      Health {combatant.health}/{combatant.maxHealth}
                    </span>
                    <span>Morale {combatant.morale}</span>
                    <div className="badge-row">
                      <span className="badge">{combatant.effectiveRange}</span>
                      <span className="badge">Damage {combatant.damageLabel}</span>
                      {combatant.guarding ? (
                        <span className="badge badge-positive">Guarding</span>
                      ) : null}
                      {combatant.defeated ? (
                        <span className="badge badge-warning">Down</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="detail-panel">
              <h2>Enemy Line</h2>
              <div className="mission-list">
                {combat.enemies.map((combatant) => (
                  <div key={combatant.combatantId} className="mission-row">
                    <strong>{combatant.name}</strong>
                    <span>
                      Health {combatant.health}/{combatant.maxHealth}
                    </span>
                    <span>Morale {combatant.morale}</span>
                    <div className="badge-row">
                      <span className="badge">{combatant.effectiveRange}</span>
                      <span className="badge">Damage {combatant.damageLabel}</span>
                      {combatant.guarding ? (
                        <span className="badge badge-positive">Guarding</span>
                      ) : null}
                      {combatant.defeated ? (
                        <span className="badge badge-warning">Down</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className="detail-panel combat-log-panel">
            <h2>Recent Log</h2>
            <div className="combat-log-list">
              {combat.log.map((entry) => (
                <div key={`${entry.round}-${entry.actorId}-${entry.summary}`} className="combat-log-entry">
                  <strong>Round {entry.round}</strong>
                  <p>{entry.summary}</p>
                </div>
              ))}
            </div>
          </article>
        </>
      )}
    </section>
  )
}
