import type { GameState, HouseRoom, NpcSitePresence, SiteAccessState, SiteRuntime, SiteRoomInstance } from '../../domain'
import type { WorldHousehold } from '../../domain/world/contracts'
import type { PoiDefinition } from './contentCatalog'

export const PLAYER_HOUSE_SITE_ID = 'site-house-valdric'

function mapHouseRoomAccessState(room: HouseRoom): SiteAccessState {
  switch (room.state) {
    case 'locked':
      return 'sealed'
    case 'collapsed':
    case 'destroyed':
      return 'hidden'
    case 'intact':
      return 'open'
    case 'damaged':
    case 'stripped':
    default:
      return 'restricted'
  }
}

function deriveHouseRoomCapacity(room: HouseRoom): number {
  switch (room.roomId) {
    case 'room-marion-quarters':
    case 'room-master-chamber':
      return 1
    case 'room-servant-quarters':
      return 2
    case 'room-barracks':
      return 4
    default:
      return 0
  }
}

function toRoomInstance(room: HouseRoom): SiteRoomInstance {
  return {
    roomId: room.roomId,
    name: room.name,
    functionId: room.roomFunction,
    condition: room.state,
    capacity: deriveHouseRoomCapacity(room),
    accessState: mapHouseRoomAccessState(room),
    tags: room.searched ? ['searched'] : [],
  }
}

function mapPoiTypeToKind(poi: PoiDefinition): SiteRuntime['kind'] {
  switch (poi.type) {
    case 'tavern':
      return 'tavern'
    case 'guild':
      return 'guild'
    case 'market':
    case 'shop':
    case 'black_market':
      return 'market'
    case 'court':
      return 'court'
    case 'residence':
      return 'estate'
    case 'faction_hq':
      return 'mixed-use'
    default:
      return 'unknown'
  }
}

function mapHouseholdKind(household: WorldHousehold): SiteRuntime['kind'] {
  if (household.tags.includes('sanctuary')) return 'sanctuary'
  if (household.tags.includes('safehouse')) return 'safehouse'
  if (household.tags.includes('holding-site')) return 'holding-site'
  if (household.tags.includes('industrial')) return 'industrial'
  if (household.kind === 'household') return 'house'
  if (household.kind === 'faction_seat') return 'mixed-use'
  return 'unknown'
}

function mapSecurityToAccessState(security: number): SiteAccessState {
  if (security >= 80) return 'sealed'
  if (security >= 55) return 'guarded'
  if (security >= 30) return 'restricted'
  return 'open'
}

function roomInstancesFromWorldHousehold(household: WorldHousehold): SiteRoomInstance[] {
  return (household.rooms ?? []).map((room) => ({
    roomId: room.id,
    name: room.id,
    functionId: room.function,
    condition: 'intact',
    capacity: room.capacity,
    accessState: mapSecurityToAccessState(household.security),
    tags: [],
  }))
}

export function buildPlayerHouseSiteRuntime(state: Pick<GameState, 'house' | 'houseDistrictId' | 'householdLore'>): SiteRuntime {
  return {
    siteId: PLAYER_HOUSE_SITE_ID,
    sourceKind: 'player-house',
    sourceId: state.householdLore.houseName === 'House Valdric' ? 'house-valdric' : 'player-house',
    districtId: state.houseDistrictId,
    mode: 'concrete',
    kind: 'house',
    name: state.householdLore.houseName,
    ownerNpcId: null,
    controllingFactionId: null,
    securityScore: Math.min(100, state.house.fortificationLevel * 20),
    roomInstances: state.house.rooms.map(toRoomInstance),
    tags: ['player-controlled', state.house.exteriorState],
  }
}

export function buildWorldHouseholdSiteRuntime(household: WorldHousehold): SiteRuntime {
  return {
    siteId: `site-${household.id}`,
    sourceKind: 'world-household',
    sourceId: household.id,
    districtId: household.districtId,
    mode: 'abstract',
    kind: mapHouseholdKind(household),
    name: household.name,
    ownerNpcId: household.ownerNpcId,
    controllingFactionId: household.controllingFactionId,
    securityScore: household.security,
    roomInstances: roomInstancesFromWorldHousehold(household),
    tags: household.tags,
  }
}

export function buildPoiSiteRuntime(poi: PoiDefinition): SiteRuntime {
  return {
    siteId: `site-${poi.id}`,
    sourceKind: 'poi',
    sourceId: poi.id,
    districtId: poi.districtId,
    mode: 'abstract',
    kind: mapPoiTypeToKind(poi),
    name: poi.name,
    ownerNpcId: poi.npcId ?? null,
    controllingFactionId: poi.factionId ?? null,
    securityScore: poi.factionId ? 35 : 15,
    roomInstances: [],
    tags: [poi.type],
  }
}

export function selectSitePresences(
  presences: readonly NpcSitePresence[],
  siteId: string,
): NpcSitePresence[] {
  return presences.filter((presence) => presence.siteId === siteId)
}
