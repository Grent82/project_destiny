/**
 * Hand-authored surveyor pages: one map per district, POIs placed on a
 * 360×240 plate. Water, walls, and scars are per-district texture so each
 * page reads like its place — docks against the water line, the Below as
 * lamplit tunnels, the Hollows as a ruin field.
 */
export const DISTRICT_MAP_VIEWBOX = '0 0 360 240'

export interface DistrictPoiNode {
  id: string
  x: number
  y: number
}

export interface DistrictMapTheme {
  /** Where open water lies on the plate, if any. */
  water?: 'west' | 'north' | 'south'
  /** Decorative strokes: ruin hatching, terrace lines, tunnel walls. */
  texture: 'streets' | 'terraces' | 'ruins' | 'marsh' | 'yards' | 'tunnels' | 'docks'
  /** One margin note in the surveyor's voice. */
  marginNote: string
}

export interface DistrictMapGeometry {
  theme: DistrictMapTheme
  pois: DistrictPoiNode[]
}

export const districtMapGeometry: Record<string, DistrictMapGeometry> = {
  'district-harbor': {
    theme: { water: 'west', texture: 'docks', marginNote: 'Tide gates close at dusk.' },
    pois: [
      { id: 'poi-harbor-the-hold', x: 62, y: 110 },
      { id: 'poi-harbor-pier-seven', x: 70, y: 196 },
      { id: 'poi-harbor-the-berth', x: 124, y: 152 },
      { id: 'poi-harbor-guild-hall', x: 152, y: 62 },
      { id: 'poi-harbor-salt-market', x: 196, y: 118 },
      { id: 'poi-harbor-chandler-row', x: 206, y: 176 },
      { id: 'poi-harbor-compact-house', x: 244, y: 66 },
      { id: 'poi-harbor-admiralty-court', x: 292, y: 134 },
    ],
  },
  'district-gilded-heights': {
    theme: { texture: 'terraces', marginNote: 'Clearance checked twice on the upper terrace.' },
    pois: [
      { id: 'poi-gilded-advocates-row', x: 86, y: 152 },
      { id: 'poi-gilded-exchange', x: 120, y: 98 },
      { id: 'poi-gilded-armory-row', x: 152, y: 188 },
      { id: 'poi-gilded-the-consortium', x: 182, y: 58 },
      { id: 'poi-gilded-morke-offices', x: 206, y: 146 },
      { id: 'poi-gilded-the-gallery', x: 244, y: 96 },
      { id: 'poi-gilded-manor-row', x: 282, y: 180 },
      { id: 'poi-gilded-secure-vault', x: 296, y: 62 },
    ],
  },
  'district-ironworks': {
    theme: { water: 'south', texture: 'yards', marginNote: 'Slag canal runs the southern rim.' },
    pois: [
      { id: 'poi-ironworks-underground-cache', x: 48, y: 196 },
      { id: 'poi-ironworks-slag-tavern', x: 92, y: 168 },
      { id: 'poi-ironworks-the-forge', x: 120, y: 108 },
      { id: 'poi-ironworks-foundry-league', x: 182, y: 64 },
      { id: 'poi-ironworks-parts-market', x: 204, y: 138 },
      { id: 'poi-ironworks-the-smelter', x: 258, y: 88 },
      { id: 'poi-ironworks-watch-post', x: 252, y: 196 },
      { id: 'poi-ironworks-league-court', x: 306, y: 146 },
    ],
  },
  'district-the-pale': {
    theme: { texture: 'streets', marginNote: 'The vault under the house is still sealed.' },
    pois: [
      { id: 'poi-pale-wren-safe-house', x: 46, y: 168 },
      { id: 'poi-pale-tallow-ring', x: 64, y: 70 },
      { id: 'poi-pale-the-ash', x: 122, y: 140 },
      { id: 'poi-pale-salvage-row', x: 152, y: 198 },
      { id: 'poi-pale-pale-market', x: 180, y: 100 },
      { id: 'poi-pale-the-pale-court', x: 222, y: 56 },
      { id: 'poi-pale-black-ledger', x: 256, y: 142 },
      { id: 'poi-pale-house-valdric', x: 300, y: 188 },
      { id: 'poi-pale-old-tannery', x: 318, y: 84 },
    ],
  },
  'district-the-warrens': {
    theme: { texture: 'ruins', marginNote: 'Streets unnamed past the second bend.' },
    pois: [
      { id: 'poi-warrens-ring-den', x: 78, y: 82 },
      { id: 'poi-warrens-the-rubble', x: 100, y: 198 },
      { id: 'poi-warrens-the-pit', x: 142, y: 132 },
      { id: 'poi-warrens-pack-runners', x: 172, y: 44 },
      { id: 'poi-warrens-scratch-market', x: 204, y: 92 },
      { id: 'poi-warrens-back-alley-smith', x: 240, y: 182 },
      { id: 'poi-warrens-brands-block', x: 262, y: 58 },
      { id: 'poi-warrens-the-restored', x: 302, y: 138 },
    ],
  },
  'district-the-hollows': {
    theme: { texture: 'ruins', marginNote: 'Survey abandoned past the detention house.' },
    pois: [
      { id: 'poi-hollows-compact-hall', x: 70, y: 60 },
      { id: 'poi-hollows-the-sink', x: 90, y: 190 },
      { id: 'poi-hollows-the-grey-cup', x: 130, y: 122 },
      { id: 'poi-hollows-relief-station', x: 162, y: 182 },
      { id: 'poi-hollows-ash-market', x: 200, y: 80 },
      { id: 'poi-hollows-pawnbrokers', x: 240, y: 200 },
      { id: 'poi-hollows-detention-house', x: 268, y: 58 },
      { id: 'poi-hollows-municipal-court', x: 308, y: 132 },
    ],
  },
  'district-ash-quay': {
    theme: { water: 'south', texture: 'docks', marginNote: "Merrow's seal on every bollard." },
    pois: [
      { id: 'poi-ash-quay-customs-house', x: 88, y: 142 },
      { id: 'poi-ash-quay-berth-registry', x: 158, y: 96 },
      { id: 'poi-ash-quay-merrow-counting-house', x: 186, y: 48 },
      { id: 'poi-ash-quay-dock-market', x: 232, y: 158 },
      { id: 'poi-ash-quay-chandler-exchange', x: 296, y: 108 },
    ],
  },
  'district-the-mireward': {
    theme: { texture: 'marsh', marginNote: 'Paths flood at the spring tide.' },
    pois: [
      { id: 'poi-mireward-apothecary', x: 108, y: 118 },
      { id: 'poi-mireward-pawn-fence', x: 88, y: 190 },
      { id: 'poi-mireward-shrine', x: 180, y: 66 },
      { id: 'poi-mireward-low-water-tavern', x: 248, y: 128 },
      { id: 'poi-mireward-physician', x: 290, y: 192 },
    ],
  },
  'district-cinder-row': {
    theme: { texture: 'yards', marginNote: 'Coal dust settles on everything by noon.' },
    pois: [
      { id: 'poi-cinder-tenements', x: 80, y: 188 },
      { id: 'poi-cinder-coal-yard', x: 102, y: 88 },
      { id: 'poi-cinder-tools-exchange', x: 162, y: 142 },
      { id: 'poi-cinder-ring-smelter', x: 222, y: 70 },
      { id: 'poi-cinder-abandoned-watchpost', x: 298, y: 122 },
    ],
  },
  'district-the-northbank': {
    theme: { water: 'south', texture: 'streets', marginNote: 'Every door here keeps a ledger.' },
    pois: [
      { id: 'poi-northbank-courier-post', x: 90, y: 158 },
      { id: 'poi-northbank-succession-registry', x: 122, y: 80 },
      { id: 'poi-northbank-advocates-row', x: 202, y: 58 },
      { id: 'poi-northbank-estate-gate', x: 240, y: 168 },
      { id: 'poi-northbank-private-club', x: 286, y: 90 },
    ],
  },
  'district-the-below': {
    theme: { texture: 'tunnels', marginNote: 'Not on the official survey. Keep it so.' },
    pois: [
      { id: 'poi-below-access-tunnel', x: 58, y: 62 },
      { id: 'poi-below-debtors-room', x: 122, y: 92 },
      { id: 'poi-below-lantern-shop', x: 160, y: 180 },
      { id: 'poi-below-underground-exchange', x: 204, y: 128 },
      { id: 'poi-below-apothecary', x: 282, y: 92 },
    ],
  },
}
