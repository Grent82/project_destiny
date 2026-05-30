import type { SiteAccessState, SiteRoomCondition, SiteRoomInstance } from '../../domain'
import type { PoiDefinition } from './contentCatalog'

function room(
  roomId: string,
  name: string,
  functionId: string | null,
  capacity: number,
  accessState: SiteAccessState,
  condition: SiteRoomCondition = 'intact',
  tags: string[] = [],
): SiteRoomInstance {
  return {
    roomId,
    name,
    functionId,
    condition,
    capacity,
    accessState,
    tags,
  }
}

function defaultRoomsForPoiType(poi: PoiDefinition): SiteRoomInstance[] {
  switch (poi.type) {
    case 'guild':
      return [
        room(`${poi.id}-hall`, 'Public Hall', 'reception', 18, 'open'),
        room(`${poi.id}-office`, 'Clerk Office', 'administration', 4, 'restricted'),
        room(`${poi.id}-records`, 'Records Room', 'records', 3, 'guarded', 'intact', ['paper-trail']),
        room(`${poi.id}-bunks`, 'Bunk Room', 'quarters', 6, 'restricted'),
      ]
    case 'tavern':
      return [
        room(`${poi.id}-common`, 'Common Room', 'hospitality', 24, 'open'),
        room(`${poi.id}-kitchen`, 'Kitchen', 'kitchen', 4, 'restricted'),
        room(`${poi.id}-private`, 'Private Booth Room', 'meeting', 4, 'restricted'),
        room(`${poi.id}-cellar`, 'Cellar', 'storage', 6, 'guarded'),
      ]
    case 'shop':
      return [
        room(`${poi.id}-front`, 'Front Counter', 'commerce', 8, 'open'),
        room(`${poi.id}-workroom`, 'Workroom', 'crafting', 3, 'restricted'),
        room(`${poi.id}-stock`, 'Stock Room', 'storage', 8, 'guarded'),
        room(`${poi.id}-back-office`, 'Back Office', 'records', 2, 'restricted'),
      ]
    case 'court':
      return [
        room(`${poi.id}-chamber`, 'Public Chamber', 'adjudication', 20, 'open'),
        room(`${poi.id}-registry`, 'Registry Room', 'records', 4, 'guarded', 'intact', ['paper-trail']),
        room(`${poi.id}-side-office`, 'Side Office', 'administration', 3, 'restricted'),
        room(`${poi.id}-holding`, 'Holding Room', 'holding', 4, 'guarded', 'intact', ['custody']),
      ]
    case 'residence':
      return [
        room(`${poi.id}-front-room`, 'Front Room', 'reception', 8, 'open'),
        room(`${poi.id}-kitchen`, 'Kitchen', 'kitchen', 4, 'restricted'),
        room(`${poi.id}-bedchamber`, 'Bedchamber', 'quarters', 2, 'restricted'),
        room(`${poi.id}-back-room`, 'Back Room', 'storage', 3, 'guarded'),
      ]
    case 'market':
      return [
        room(`${poi.id}-trade-floor`, 'Trade Floor', 'commerce', 25, 'open'),
        room(`${poi.id}-ledger-booth`, 'Ledger Booth', 'records', 3, 'restricted'),
        room(`${poi.id}-stores`, 'Store Shed', 'storage', 10, 'guarded'),
      ]
    case 'faction_hq':
      return [
        room(`${poi.id}-front-hall`, 'Front Hall', 'reception', 16, 'open'),
        room(`${poi.id}-operations`, 'Operations Room', 'administration', 6, 'restricted'),
        room(`${poi.id}-records`, 'Records Room', 'records', 4, 'guarded', 'intact', ['paper-trail']),
        room(`${poi.id}-guardroom`, 'Guardroom', 'security', 6, 'guarded'),
      ]
    case 'black_market':
      return [
        room(`${poi.id}-front`, 'Front Room', 'commerce', 10, 'discreet' as SiteAccessState),
        room(`${poi.id}-blind-corridor`, 'Blind Corridor', 'security', 3, 'guarded'),
        room(`${poi.id}-stock`, 'Hidden Stock Room', 'storage', 8, 'guarded', 'intact', ['contraband']),
        room(`${poi.id}-back-office`, 'Back Office', 'records', 2, 'restricted'),
      ]
  }
}

const SPECIFIC_POI_BLUEPRINTS: Record<string, SiteRoomInstance[]> = {
  'poi-pale-the-ash': [
    room('ash-common-room', 'Common Room', 'hospitality', 18, 'open'),
    room('ash-rear-booth', 'Rear Booth', 'meeting', 4, 'restricted', 'intact', ['informants']),
    room('ash-kitchen', 'Kitchen', 'kitchen', 4, 'restricted'),
    room('ash-loft', 'Informer Loft', 'quarters', 3, 'guarded', 'intact', ['safe-drop']),
  ],
  'poi-pale-wren-safe-house': [
    room('wren-front-room', 'Borrowed Front Room', 'reception', 6, 'restricted'),
    room('wren-bedchamber', 'Safe Bedchamber', 'quarters', 2, 'guarded'),
    room('wren-lockbox-room', 'Lockbox Room', 'storage', 2, 'sealed', 'intact', ['documents', 'escape-fund']),
    room('wren-rear-exit', 'Rear Exit', 'security', 2, 'hidden', 'intact', ['escape-route']),
  ],
  'poi-warrens-the-restored': [
    room('restored-front-room', 'Front Shelter Room', 'sanctuary', 10, 'restricted'),
    room('restored-cot-room', 'Cot Room', 'quarters', 8, 'restricted', 'intact', ['displaced']),
    room('restored-kitchen', 'Kitchen', 'kitchen', 4, 'restricted'),
    room('restored-message-cellar', 'Message Cellar', 'records', 2, 'hidden', 'intact', ['safe-drop']),
  ],
  'poi-gilded-secure-vault': [
    room('court-vault-vestibule', 'Vestibule', 'security', 4, 'guarded'),
    room('court-vault-ledger-room', 'Ledger Room', 'records', 3, 'sealed', 'intact', ['paper-trail', 'debt-records']),
    room('court-vault-sealed-stacks', 'Sealed Stacks', 'storage', 5, 'sealed', 'intact', ['archives']),
    room('court-vault-audit-cell', 'Audit Cell', 'holding', 2, 'guarded', 'intact', ['custody']),
  ],
  'poi-hollows-detention-house': [
    room('detention-intake', 'Intake Room', 'administration', 4, 'guarded'),
    room('detention-false-residence', 'False Residence Room', 'quarters', 3, 'restricted', 'intact', ['cover-story']),
    room('detention-holding-room', 'Holding Room', 'holding', 4, 'guarded', 'intact', ['custody', 'off-book']),
    room('detention-ledger-nook', 'Ledger Nook', 'records', 2, 'guarded', 'intact', ['paper-trail']),
  ],
  'poi-pale-old-tannery': [
    room('tannery-yard', 'Yard', 'industrial', 10, 'restricted'),
    room('tannery-stripping-floor', 'Stripping Floor', 'industrial', 8, 'guarded', 'intact', ['workers']),
    room('tannery-holding-floor', 'Holding Floor', 'holding', 6, 'guarded', 'intact', ['custody']),
    room('tannery-inner-ring', 'Inner Ring', 'security', 4, 'guarded', 'intact', ['mira-arc']),
    room('tannery-drainage-cellar', 'Drainage Cellar', 'storage', 4, 'hidden', 'intact', ['escape-route']),
  ],
}

export function getPoiRoomBlueprints(poi: PoiDefinition): SiteRoomInstance[] {
  return SPECIFIC_POI_BLUEPRINTS[poi.id] ?? defaultRoomsForPoiType(poi)
}
