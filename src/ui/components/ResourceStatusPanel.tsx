import {
  selectEconomyOverview,
} from '../../application/selectors/economy'
import { useAppSelector } from '../app/hooks'
import { formatMarks } from '../../domain/game/currency'
import { Link } from 'react-router-dom'

function resourceLevel(value: number): 'stable' | 'stressed' | 'critical' {
  if (value >= 70) return 'stable'
  if (value >= 40) return 'stressed'
  return 'critical'
}

interface ResourceBarProps {
  label: string
  value: number
}

function ResourceBar({ label, value }: ResourceBarProps) {
  const level = resourceLevel(value)
  const colorClass =
    level === 'stable'
      ? 'resource-bar--stable'
      : level === 'stressed'
        ? 'resource-bar--stressed'
        : 'resource-bar--critical'

  return (
    <div className={`resource-bar ${colorClass}`}>
      <span className="resource-bar__label">{label}</span>
      <div className="resource-bar__track">
        <div className="resource-bar__fill" style={{ width: `${value}%` }} />
      </div>
      <span className="resource-bar__value">{value}</span>
    </div>
  )
}

export function ResourceStatusPanel() {
  const overview = useAppSelector(selectEconomyOverview)
  const corridorStatus = overview.corridorStatus

  const corridorClass =
    corridorStatus === 'open'
      ? 'badge badge--stable'
      : corridorStatus === 'disrupted'
        ? 'badge badge--stressed'
        : 'badge badge--critical'

  return (
    <article className="detail-panel resource-status-panel">
      <h2>City Resources</h2>
      <div className="resource-status-panel__headline">
        <div>
          <p className="resource-status-panel__kicker">Food reserves</p>
          <p className="resource-status-panel__headline-value">
            {overview.foodStock} / {overview.foodCapacity} stores
          </p>
        </div>
        <div>
          <p className="resource-status-panel__kicker">Market read</p>
          <p className="resource-status-panel__headline-value">
            {formatMarks(overview.foodPrice)} <span className="resource-status-panel__trend">{overview.foodPriceTrend}</span>
          </p>
        </div>
      </div>
      <ResourceBar label="Food Security" value={overview.foodSecurity} />
      <p className="resource-status-panel__bar-note">{overview.foodSecurity}% security</p>
      <ResourceBar label="Water Access" value={overview.waterAccess} />
      <ResourceBar label="Material Stock" value={overview.materialStock} />
      <div className="resource-corridor">
        <span className="resource-bar__label">Corridor</span>
        <span className={corridorClass}>
          {corridorStatus.charAt(0).toUpperCase() + corridorStatus.slice(1)}
        </span>
      </div>
      {corridorStatus !== 'open' ? (
        <p className="resource-status-panel__hint">
          {overview.corridorProgress.daysRemaining} clearance day
          {overview.corridorProgress.daysRemaining === 1 ? '' : 's'} remain before the next recovery step.
        </p>
      ) : null}
      <dl className="resource-status-panel__facts">
        <div>
          <dt>Daily demand</dt>
          <dd>{overview.dailyConsumption} rations</dd>
        </div>
        <div>
          <dt>Local output</dt>
          <dd>{overview.localOutput} rations/day</dd>
        </div>
        <div>
          <dt>Corridor imports</dt>
          <dd>{overview.corridorImport} rations/day</dd>
        </div>
        <div>
          <dt>Net food change</dt>
          <dd>{overview.netFoodDelta >= 0 ? '+' : ''}{overview.netFoodDelta}/day</dd>
        </div>
        <div>
          <dt>Pressure</dt>
          <dd>{overview.marketPressure}/100</dd>
        </div>
      </dl>
      <p className="resource-status-panel__hint">
        {overview.marketState}. Local production is contributing {overview.localOutput} rations a day; the rest of the city's breathing room depends on the Corridor staying open.
      </p>
      <div className="resource-status-panel__actions">
        <Link className="action-button action-button--secondary" to={overview.playerActions.contractsRoute}>
          Check available work
        </Link>
        <Link className="action-button action-button--secondary" to={overview.playerActions.marketRoute}>
          Review ward prices
        </Link>
      </div>
    </article>
  )
}
