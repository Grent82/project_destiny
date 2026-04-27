import {
  gameActions,
  selectActiveQuests,
  selectAvailableQuests,
  selectCompletedQuestIds,
} from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

const FACTION_SHORT_NAMES: Record<string, string> = {
  'faction-civic-compact': 'Compact',
  'faction-gilded-court': 'Court',
  'faction-foundry-league': 'League',
  'faction-tallow-ring': 'Ring',
  'faction-restored': 'Restored',
}

function FactionBadge({ factionId }: { factionId: string | null }) {
  if (!factionId) return <span className="badge">Independent</span>
  const label = FACTION_SHORT_NAMES[factionId] ?? factionId
  const modifierKey = factionId.replace('faction-', '')
  const modifierClass = `faction-badge--${modifierKey}`
  return (
    <span className={`faction-badge ${modifierClass}`}>
      {label}
    </span>
  )
}

export function ContractBoardScreen() {
  const dispatch = useAppDispatch()
  const availableQuests = useAppSelector(selectAvailableQuests)
  const activeQuests = useAppSelector(selectActiveQuests)
  const completedQuestIds = useAppSelector(selectCompletedQuestIds)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>The Contract Board</h1>
      <p className="summary">
        Structured engagements — briefings, obligations, and what the house stands to gain or lose.
      </p>

      <div className="overview-grid">

        <article className="detail-panel">
          <h2>Available Contracts</h2>
          {availableQuests.length === 0 ? (
            <p className="summary">No contracts currently on offer.</p>
          ) : (
            <div className="mission-list">
              {availableQuests.map((quest) => (
                <div key={quest.id} className="mission-row">
                  <div className="mission-row-header">
                    <strong>{quest.title}</strong>
                    <FactionBadge factionId={quest.employerFactionId} />
                    {quest.districtId && (
                      <span className="badge">
                        {quest.districtId.replace('district-', '').replace(/-/g, ' ')}
                      </span>
                    )}
                  </div>
                  <p className="quest-briefing">
                    {quest.briefing}
                  </p>
                  <div className="quest-meta">
                    <span>Reward: <strong>{quest.rewardMarks} Marks</strong></span>
                    {quest.timeLimitDays != null && (
                      <span>Time limit: <strong>{quest.timeLimitDays} days</strong></span>
                    )}
                    <span>Type: {quest.objectiveType}</span>
                  </div>
                  <button
                    className="action-button"
                    onClick={() => dispatch(gameActions.acceptQuest({ questId: quest.id }))}
                    type="button"
                  >
                    Accept Contract
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="detail-panel">
          <h2>Active Contracts</h2>
          {activeQuests.length === 0 ? (
            <p className="summary">No contracts currently in progress.</p>
          ) : (
            <div className="mission-list">
              {activeQuests.map(({ runtime, template }) => (
                <div key={runtime.questId} className="mission-row">
                  <div className="mission-row-header">
                    <strong>{template?.title ?? runtime.questId}</strong>
                    <FactionBadge factionId={template?.employerFactionId ?? null} />
                    <span className="badge badge-warning">Active</span>
                  </div>
                  {template?.timeLimitDays != null && (
                    <span className="quest-meta">
                      Time limit: {template.timeLimitDays} days (accepted day {runtime.acceptedOnDay})
                    </span>
                  )}
                  {template?.objectiveType === 'investigation' && (
                    <button
                      className="action-button"
                      onClick={() => dispatch(gameActions.completeQuest({ questId: runtime.questId }))}
                      type="button"
                    >
                      Mark Complete
                    </button>
                  )}
                  {template?.objectiveType !== 'investigation' && (
                    <p className="quest-briefing">
                      Resolves through deployment.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>

        {completedQuestIds.length > 0 && (
          <article className="detail-panel">
            <h2>Closed Contracts</h2>
            <div className="mission-list">
              {completedQuestIds.map((id) => (
                <div key={id} className="mission-row mission-row-header">
                  <span className="quest-closed-label">{id.replace('quest-', '').replace(/-/g, ' ')}</span>
                  <span className="badge--closed">
                    Closed
                  </span>
                </div>
              ))}
            </div>
          </article>
        )}

      </div>
    </section>
  )
}
