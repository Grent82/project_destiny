interface CarryLimitBarProps {
  category: string
  current: number
  limit: number | null
}

function CarryLimitBar({ category, current, limit }: CarryLimitBarProps) {
  const isOver = limit !== null && current > limit
  const pct = limit !== null ? Math.min(100, (current / limit) * 100) : 0

  return (
    <div className={`carry-limit-bar ${isOver ? 'carry-limit-bar--over' : ''}`}>
      <span className="carry-limit-bar__label">{category}</span>
      {limit !== null ? (
        <>
          <div className="carry-limit-bar__track">
            <div className="carry-limit-bar__fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="carry-limit-bar__count">
            {current}/{limit}
            {isOver && ' ⚠'}
          </span>
        </>
      ) : (
        <span className="carry-limit-bar__count">{current} (no limit)</span>
      )}
    </div>
  )
}

export { CarryLimitBar }
