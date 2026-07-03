import { useNavigate } from 'react-router-dom'
import { gameActions, selectCombatScreenState, selectLastEncounterSummary } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

const RANGE_LABELS: Record<string, { label: string; description: string }> = {
  close: {
    label: 'Close Range',
    description: 'Melee and short-range weapons have full effect. Rifles and crossbows are penalized.',
  },
  medium: {
    label: 'Medium Range',
    description: 'Neither line owns the ground. Balanced weapons perform best while melee closes and long guns set up.',
  },
  distant: {
    label: 'Distant Range',
    description: 'Ranged weapons operate at full effect. Melee weapons suffer a penalty.',
  },
}

const ACTION_BRIEFS = [
  {
    id: 'attack',
    label: 'Attack',
    detail: 'Auto-target the most vulnerable enemy in the current exchange.',
  },
  {
    id: 'advance',
    label: 'Advance',
    detail: 'Push the fight one band closer: distant → medium → close.',
  },
  {
    id: 'retreat',
    label: 'Retreat',
    detail: 'Give ground one band at a time: close → medium → distant.',
  },
  {
    id: 'guard',
    label: 'Guard',
    detail: 'Brace for the next hit, then lose that protection when this combatant acts again.',
  },
] as const

export function CombatScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const combat = useAppSelector(selectCombatScreenState)
  const lastEncounterSummary = useAppSelector(selectLastEncounterSummary)
  const inactiveReturnRoute = lastEncounterSummary?.linkedQuestId ? '/contracts' : '/dashboard'
  const inactiveReturnLabel = lastEncounterSummary?.linkedQuestId ? 'Return to Work Board' : 'Return to Dashboard'
  const commandStatusMessage = !combat.hasActiveCombat
    ? 'No combat commands are available until an encounter begins.'
    : combat.outcome !== 'ongoing'
      ? 'Combat is resolved. Conclude the encounter to return to operations.'
      : combat.canAct
        ? 'Command combat is auto-targeted. Choose how the active ally approaches the exchange.'
        : combat.activeCombatantName
          ? `${combat.activeCombatantName} is not under player control right now. Enemy turns and skipped turns resolve automatically.`
          : 'The encounter is resolving automatically.'

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>Engagement</h1>
      <p className="summary">
        Three-range command combat. You direct the line by issuing orders, not by manually picking targets.
      </p>

      {!combat.hasActiveCombat ? (
        <div className="combat-empty-state">
          <p className="summary">
            No encounter is active. Combat only begins after a contract or expedition has been taken on-site into preparation.
          </p>
          {lastEncounterSummary && (
            <article className="detail-panel combat-aftermath-recap">
              <h2>
                Last Engagement —{' '}
                <span className={lastEncounterSummary.outcome === 'victory' ? 'badge badge-positive' : 'badge badge-warning'}>
                  {lastEncounterSummary.label}
                </span>
              </h2>
              <p className="summary">Day {lastEncounterSummary.day}, {lastEncounterSummary.timeSlot}</p>
              {lastEncounterSummary.noteLines.length > 0 && (
                <ul className="combat-aftermath-notes">
                  {lastEncounterSummary.noteLines.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              )}
            </article>
          )}
          <button className="action-button" onClick={() => navigate(inactiveReturnRoute)} type="button">
            {inactiveReturnLabel}
          </button>
        </div>
      ) : (
        <>
          {combat.range && (
            <div className="combat-range-zones">
              {(['close', 'medium', 'distant'] as const).map((zone) => {
                const inZone = [...combat.allies, ...combat.enemies].filter(
                  (c) => c.effectiveRange === zone,
                )
                const isActive = zone === combat.range
                return (
                  <div key={zone} className={`range-zone${isActive ? ' range-zone--active' : ''}`}>
                    <h3 className="range-zone-label">{RANGE_LABELS[zone]?.label ?? zone}</h3>
                    {isActive && (
                      <p className="range-zone-description">{RANGE_LABELS[zone]?.description}</p>
                    )}
                    <div className="range-zone-combatants">
                      {inZone.length === 0 ? (
                        <span className="range-zone-empty">—</span>
                      ) : (
                        inZone.map((c) => (
                          <span
                            key={c.combatantId}
                            className={`range-zone-combatant range-zone-combatant--${c.side}`}
                          >
                            {c.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
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
            {ACTION_BRIEFS.map((action) => (
              <button
                key={action.id}
                className="action-button"
                disabled={!combat.canAct}
                onClick={() => dispatch(gameActions.performCombatAction(action.id))}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
          <dl className="combat-action-briefs">
            {ACTION_BRIEFS.map((action) => (
              <div key={action.id} className="combat-action-brief">
                <dt>{action.label}</dt>
                <dd>{action.detail}</dd>
              </div>
            ))}
          </dl>
          <p className="summary">{commandStatusMessage}</p>

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
                    <div className="hp-bar-track">
                      <div
                        className={`hp-bar-fill morale-bar-fill${combatant.morale < 30 ? ' hp-bar-critical' : ''}`}
                        style={{ width: `${combatant.morale}%` }}
                      />
                    </div>
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
                    <div className="hp-bar-track">
                      <div
                        className={`hp-bar-fill morale-bar-fill${combatant.morale < 30 ? ' hp-bar-critical' : ''}`}
                        style={{ width: `${combatant.morale}%` }}
                      />
                    </div>
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
              <p className="summary">Resolve the encounter to lock in aftermath and return to operations.</p>
              {combat.resolutionSummary ? (
                <div className="mission-list" style={{ marginBottom: '1rem' }}>
                  <p><strong>{combat.resolutionSummary.rewardsLabel}</strong></p>
                  <p>{combat.resolutionSummary.partyConditionLabel}</p>
                  <p>{combat.resolutionSummary.contractLabel}</p>
                  <p>Return destination: {combat.resolutionSummary.returnLabel}</p>
                </div>
              ) : null}
              <div className="combat-action-row">
                <button
                  className="action-button action-button--primary"
                  onClick={() => {
                    dispatch(gameActions.concludeCombatEncounter())
                    navigate(combat.resolutionSummary?.returnRoute ?? '/dashboard')
                  }}
                  type="button"
                >
                  {combat.resolutionSummary?.actionLabel ?? 'Conclude and Return'}
                </button>
                <button
                  className="action-button"
                  onClick={() => {
                    dispatch(gameActions.concludeCombatEncounter())
                    navigate('/roster')
                  }}
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
