import { selectActiveEffectsSummary } from '../../application/selectors/activeEffects'
import { useAppSelector } from '../app/hooks'

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`
}

/**
 * Surfaces the player's item-driven effect state (destiny-y7jx): active statuses, temporary
 * stat boosts, training bonuses, and equipped tool skill bonuses. All four are written by
 * useItem.ts/equipItem.ts and expired by the daily end-of-day tick, but previously had no
 * player-facing display anywhere.
 */
export function ActiveEffectsPanel() {
  const effects = useAppSelector(selectActiveEffectsSummary)

  const isEmpty =
    effects.statuses.length === 0 &&
    effects.trainingBonuses.length === 0 &&
    effects.statBoosts.length === 0 &&
    effects.equippedTools.length === 0

  return (
    <article className="detail-panel active-effects-panel">
      <h2>Active Effects</h2>
      {isEmpty ? (
        <p className="quest-briefing">No active statuses, boosts, or bonuses right now.</p>
      ) : (
        <div className="mission-list">
          {effects.statuses.map((status) => (
            <div key={status.statusId} className="mission-row">
              <div className="mission-row-header">
                <strong>{status.statusId}</strong>
                {status.source && <span className="badge">{status.source}</span>}
                <span className="badge">
                  {status.remainingDuration === null
                    ? 'Until removed'
                    : `${status.remainingDuration}d left`}
                </span>
              </div>
            </div>
          ))}

          {effects.statBoosts.map((boost) => (
            <div key={boost.stat} className="mission-row">
              <div className="mission-row-header">
                <strong>
                  {boost.stat} {formatSigned(boost.value)}
                </strong>
                <span className="badge">{boost.remainingDays}d left</span>
              </div>
            </div>
          ))}

          {effects.trainingBonuses.map((bonus, index) => (
            <div key={`${bonus.skill}-${index}`} className="mission-row">
              <div className="mission-row-header">
                <strong>
                  {bonus.skill} training {formatSigned(bonus.value)}
                </strong>
                <span className="badge">{bonus.source}</span>
                <span className="badge">Expires today</span>
              </div>
            </div>
          ))}

          {effects.equippedTools.map((tool) => (
            <div key={tool.itemId} className="mission-row">
              <div className="mission-row-header">
                <strong>{tool.itemName}</strong>
                <span className="badge">
                  {tool.skill} {formatSigned(tool.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
