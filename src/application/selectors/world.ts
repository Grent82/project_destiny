import { contentCatalog } from '../content/contentCatalog'
import type { WorldHousehold } from '../../domain/world/contracts'

const STABILITY_TIERS = [
  { threshold: 75, label: 'Stable' },
  { threshold: 50, label: 'Strained' },
  { threshold: 25, label: 'Fragile' },
  { threshold: 0, label: 'Failing' },
] as const

const REPUTATION_TIERS = [
  { threshold: 75, label: 'Distinguished' },
  { threshold: 50, label: 'Known' },
  { threshold: 25, label: 'Obscure' },
  { threshold: 0, label: 'Disreputable' },
] as const

function toTier(
  value: number,
  tiers: readonly { threshold: number; label: string }[],
): string {
  return tiers.find((t) => value >= t.threshold)?.label ?? 'Unknown'
}

export interface HouseholdStatus {
  id: string
  name: string
  kind: WorldHousehold['kind']
  districtId: string
  stabilityScore: number
  stabilityTier: string
  reputationScore: number
  reputationTier: string
  securityScore: number
  tags: string[]
  ownerNpcId: string | null
  controllingFactionId: string | null
}

export function selectHouseholdById(id: string): WorldHousehold | undefined {
  return contentCatalog.worldHouseholdsById.get(id)
}

export function selectHouseholdsByDistrict(districtId: string): WorldHousehold[] {
  return contentCatalog.worldHouseholdsByDistrictId.get(districtId) ?? []
}

export function selectHouseholdStatus(id: string): HouseholdStatus | null {
  const household = contentCatalog.worldHouseholdsById.get(id)
  if (!household) return null
  return {
    id: household.id,
    name: household.name,
    kind: household.kind,
    districtId: household.districtId,
    stabilityScore: household.stability,
    stabilityTier: toTier(household.stability, STABILITY_TIERS),
    reputationScore: household.reputation,
    reputationTier: toTier(household.reputation, REPUTATION_TIERS),
    securityScore: household.security,
    tags: household.tags,
    ownerNpcId: household.ownerNpcId,
    controllingFactionId: household.controllingFactionId,
  }
}
