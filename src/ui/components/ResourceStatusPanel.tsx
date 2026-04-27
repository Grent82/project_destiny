import {
  selectCityResources,
  selectCorridorStatus,
} from '../../application'
import { useAppSelector } from '../app/hooks'

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
  const resources = useAppSelector(selectCityResources)
  const corridorStatus = useAppSelector(selectCorridorStatus)

  const corridorClass =
    corridorStatus === 'open'
      ? 'badge badge--stable'
      : corridorStatus === 'disrupted'
        ? 'badge badge--stressed'
        : 'badge badge--critical'

  return (
    <article className="detail-panel resource-status-panel">
      <h2>City Resources</h2>
      <ResourceBar label="Food Security" value={resources.foodSecurity} />
      <ResourceBar label="Water Access" value={resources.waterAccess} />
      <ResourceBar label="Material Stock" value={resources.materialStock} />
      <div className="resource-corridor">
        <span className="resource-bar__label">Corridor</span>
        <span className={corridorClass}>
          {corridorStatus.charAt(0).toUpperCase() + corridorStatus.slice(1)}
        </span>
      </div>
    </article>
  )
}
