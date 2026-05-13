/**
 * TimeCostBadge — shows the time slot cost of an action before the player commits.
 * Usage: <TimeCostBadge cost={1} /> renders "⧖ 1 slot"
 */
export function TimeCostBadge({ cost }: { cost: number }) {
  const label = cost === 1 ? '1 slot' : `${cost} slots`
  return (
    <span className="time-cost-badge" aria-label={`Time cost: ${label}`}>
      ⧖ {label}
    </span>
  )
}
