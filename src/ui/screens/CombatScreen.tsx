import { useNavigate } from 'react-router-dom'
import { gameActions, selectCombatScreenState } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

const RANGE_LABELS: Record<string, { label: string; description: string }> = {
  close: {
    label: 'Close Range',
    description: 'Melee and short-range weapons have full effect. Rifles and crossbows are penalized.',
  },
  distant: {
    label: 'Distant Range',
    description: 'Ranged weapons operate at full effect. Melee weapons suffer a penalty.',
  },
}

export function CombatScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const combat = useAppSelector(selectCombatScreenState)
  const rangeInfo = combat.range ? RANGE_LABELS[combat.range] : null

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>Engagement</h1>
      <p className="summary">
        Two-range encounters. The ground belongs to whoever holds it longest.
      </p>

      {!combat.hasActiveCombat ? (
        <div className="combat-empty-state">
          <p className="summary">
            No encounter is active. The squad is waiting. Start a patrol clash here or commit from Contracts.
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
          {rangeInfo && (
            <div className={`range-indicator range-indicator-${combat.range}`}>
              <span className="range-indicator-label">{rangeInfo.label}</span>
              <span className="range-indicator-description">{rangeInfo.description}</span>
            </div>
          )}

          <div className="stats-grid">
            <article>
              <h2>Encounter State</h2>
              <p>Round {combat.round}</p>
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
              title={!combat.canAct ? 'Not your turn or combat is over' : undefined}
              onClick={() => dispatch(gameActions.performCombatAction('attack'))}
              type="button"
            >
              Attack
            </button>
            <button
              className="action-button"
              disabled={!combat.canAct}
              title={!combat.canAct ? 'Not your turn or combat is over' : undefined}
              onClick={() => dispatch(gameActions.performCombatAction('advance'))}
              type="button"
            >
              Advance
            </button>
            <button
              className="action-button"
              disabled={!combat.canAct}
              title={!combat.canAct ? 'Not your turn or combat is over' : undefined}
              onClick={() => dispatch(gameActions.performCombatAction('retreat'))}
              type="button"
            >
              Retreat
            </button>
            <button
              className="action-button"
              disabled={!combat.canAct}
              title={!combat.canAct ? 'Not your turn or combat is over' : undefined}
              onClick={() => dispatch(gameActions.performCombatAction('guard'))}
              type="button"
            >
              Guard
            </button>
            <button
              className="action-button"
              disabled={combat.outcome === 'ongoing'}
              title={combat.outcome === 'ongoing' ? 'Combat is still in progress' : undefined}
              onClick={() => dispatch(gameActions.concludeCombatEncounter())}
              type="button"
            >
              Conclude encounter
            </button>
          </div>

          <div className="combat-layout">
            <article className="detail-panel">
              <h2>Your Side</h2>
              <div className="mission-list">
                {combat.allies.map((combatant) => (
                  <div key={combatant.combatantId} className="mission-row">
                    <strong>{combatant.name}</strong>
                    <span>HP {combatant.health}/{combatant.maxHealth}</span>
                    <div className="hp-bar-track">
                      <div
                        className={`hp-bar-fill${combatant.health / combatant.maxHealth < 0.3 ? ' hp-bar-critical' : ''}`}
                        style={{ width: `${Math.round((combatant.health / combatant.maxHealth) * 100)}%` }}
                      />
                    </div>
                    <span>Morale {combatant.morale}</span>
                    <div className="badge-row">
                      <span className={`badge ${combatant.effectiveRange === combat.range ? 'badge-positive' : ''}`}>
                        {combatant.effectiveRange === combat.range ? '✓ ' : '✗ '}{combatant.effectiveRange}
                      </span>
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
                    <span>HP {combatant.health}/{combatant.maxHealth}</span>
                    <div className="hp-bar-track">
                      <div
                        className={`hp-bar-fill${combatant.health / combatant.maxHealth < 0.3 ? ' hp-bar-critical' : ''}`}
                        style={{ width: `${Math.round((combatant.health / combatant.maxHealth) * 100)}%` }}
                      />
                    </div>
                    <span>Morale {combatant.morale}</span>
                    {combatant.lore && (
                      <p className="enemy-lore">{combatant.lore}</p>
                    )}
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
            <h2>The Log</h2>
            <div className="combat-log-list">
              {combat.log.map((entry, index) => {
                const prevEntry = combat.log[index + 1]
                const isNewRound = !prevEntry || prevEntry.round !== entry.round

                return (
                  <div key={`${entry.round}-${entry.actorId}-${entry.summary}`}>
                    {isNewRound && (
                      <div className="combat-round-separator">Round {entry.round}</div>
                    )}
                    <div className="combat-log-entry">
                      <p>{entry.summary}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </article>

          {combat.outcome !== 'ongoing' && (
            <article className="detail-panel">
              <h2>
                Engagement Concluded —{' '}
                <span className={combat.outcome === 'victory' ? 'badge badge-positive' : 'badge badge-warning'}>
                  {combat.outcome === 'victory' ? 'Victory' : 'Defeat'}
                </span>
              </h2>
              <div className="combat-action-row">
                <button
                  className="action-button"
                  onClick={() => navigate('/dashboard')}
                  type="button"
                >
                  Return to Operations
                </button>
                <button
                  className="action-button"
                  onClick={() => navigate('/roster')}
                  type="button"
                >
                  View Roster
                </button>
              </div>
            </article>
          )}
        </>
      )}
    </section>
  )
}
