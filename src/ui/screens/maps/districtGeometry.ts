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
  /** 'hand' = not on the official Compact survey; drawn in the house hand. */
  surveyLayer: 'official' | 'hand'
  /** Decorative strokes: ruin hatching, terrace lines, tunnel walls. */
  texture: 'streets' | 'terraces' | 'ruins' | 'marsh' | 'yards' | 'tunnels' | 'docks'
  /** One margin note in the surveyor's voice. */
  marginNote: string
}

export interface DistrictMapGeometry {
  theme: DistrictMapTheme
  pois: DistrictPoiNode[]
  /** Hand-authored street network: every plate shows how you move through the ward. */
  streets: string[]
}

export const districtMapGeometry: Record<string, DistrictMapGeometry> = {
  'district-harbor': {
    theme: { surveyLayer: 'official', water: 'west', texture: 'docks', marginNote: 'Tide gates close at dusk.' },
    streets: [
      'M46,16 C54,90 52,160 48,230',
      'M48,86 C110,76 180,66 244,62 C280,60 310,64 334,72',
      'M50,154 C110,150 160,136 200,124 C236,114 270,122 298,134',
      'M48,196 H78',
      'M46,112 H66',
      'M206,126 V172',
      'M152,66 C152,90 154,110 156,134',
    ],
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
    theme: { surveyLayer: 'official', texture: 'terraces', marginNote: 'Clearance checked twice on the upper terrace.' },
    streets: [
      'M30,66 Q180,52 330,66',
      'M30,104 Q180,90 330,104',
      'M30,152 Q180,138 330,152',
      'M30,190 Q180,176 330,190',
      'M104,188 Q108,148 112,102',
      'M252,186 Q256,146 260,100',
    ],
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
    theme: { surveyLayer: 'official', water: 'south', texture: 'yards', marginNote: 'Slag canal runs the southern rim.' },
    streets: [
      'M16,196 C90,192 180,196 250,198 C280,199 310,196 336,192',
      'M20,116 C70,112 110,104 150,92 C180,82 210,70 236,72 C266,76 296,84 322,92',
      'M150,94 C170,112 190,130 204,142 C220,158 240,180 252,194',
      'M260,92 C278,110 296,128 306,144',
      'M92,170 C80,180 64,190 50,196',
      'M22,150 C50,158 72,164 90,168',
    ],
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
    theme: { surveyLayer: 'hand', texture: 'streets', marginNote: 'The vault under the house is still sealed.' },
    streets: [
      'M48,74 C110,84 150,94 178,98 C212,104 246,122 254,140',
      'M180,98 C196,80 210,64 224,58 C252,48 290,64 316,82',
      'M46,170 C90,152 108,146 122,142',
      'M124,144 C140,160 146,178 152,194',
      'M154,196 C200,202 256,198 298,190',
      'M256,144 C272,158 288,174 298,186',
      'M64,72 C56,104 50,136 48,166',
    ],
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
    theme: { surveyLayer: 'official', texture: 'ruins', marginNote: 'Streets unnamed past the second bend.' },
    streets: [
      'M62,88 C90,80 112,96 138,126 C152,142 162,138 176,118 C190,98 198,94 206,92',
      'M206,92 C226,76 244,64 262,60',
      'M174,46 C186,60 196,76 204,88',
      'M208,94 C238,108 270,124 300,136',
      'M140,134 C124,156 110,178 102,194',
      'M240,180 C260,166 282,152 298,140',
      'M104,192 C148,188 196,186 238,182',
    ],
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
    theme: { surveyLayer: 'hand', texture: 'ruins', marginNote: 'Survey abandoned past the detention house.' },
    streets: [
      'M52,62 C90,64 140,72 196,78 C222,74 244,64 266,58',
      'M268,60 C284,82 298,108 306,128',
      'M130,124 C108,148 96,168 90,186',
      'M132,122 C152,142 158,162 162,178',
      'M164,184 C190,192 216,198 238,198',
      'M198,82 C172,96 148,110 134,120',
      'M240,198 C264,176 288,152 304,134',
    ],
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
    theme: { surveyLayer: 'official', water: 'south', texture: 'docks', marginNote: "Merrow's seal on every bollard." },
    streets: [
      'M14,176 C90,170 180,176 260,170 C292,168 320,162 344,156',
      'M40,120 C90,112 130,104 158,98 C176,94 182,72 186,52',
      'M160,100 C188,118 214,140 232,156',
      'M234,154 C256,138 276,122 294,110',
      'M88,146 C90,156 90,166 90,174',
    ],
    pois: [
      { id: 'poi-ash-quay-customs-house', x: 88, y: 142 },
      { id: 'poi-ash-quay-berth-registry', x: 158, y: 96 },
      { id: 'poi-ash-quay-merrow-counting-house', x: 186, y: 48 },
      { id: 'poi-ash-quay-dock-market', x: 232, y: 158 },
      { id: 'poi-ash-quay-chandler-exchange', x: 296, y: 108 },
    ],
  },
  'district-the-mireward': {
    theme: { surveyLayer: 'official', texture: 'marsh', marginNote: 'Paths flood at the spring tide.' },
    streets: [
      'M30,150 C70,134 90,126 108,120 C142,110 162,86 178,68',
      'M110,120 C156,124 202,126 246,128',
      'M250,130 C266,150 278,170 290,188',
      'M106,122 C98,146 92,168 88,186',
      'M182,70 C204,86 226,108 246,126',
    ],
    pois: [
      { id: 'poi-mireward-apothecary', x: 108, y: 118 },
      { id: 'poi-mireward-pawn-fence', x: 88, y: 190 },
      { id: 'poi-mireward-shrine', x: 180, y: 66 },
      { id: 'poi-mireward-low-water-tavern', x: 248, y: 128 },
      { id: 'poi-mireward-physician', x: 290, y: 192 },
    ],
  },
  'district-cinder-row': {
    theme: { surveyLayer: 'official', texture: 'yards', marginNote: 'Coal dust settles on everything by noon.' },
    streets: [
      'M40,96 C70,92 88,88 104,86 C150,76 188,70 220,68 C252,68 280,94 296,118',
      'M104,90 C124,108 144,126 160,140',
      'M160,144 C134,160 106,176 84,186',
      'M164,142 C210,134 256,128 294,124',
      'M84,184 C140,190 220,192 290,184',
    ],
    pois: [
      { id: 'poi-cinder-tenements', x: 80, y: 188 },
      { id: 'poi-cinder-coal-yard', x: 102, y: 88 },
      { id: 'poi-cinder-tools-exchange', x: 162, y: 142 },
      { id: 'poi-cinder-ring-smelter', x: 222, y: 70 },
      { id: 'poi-cinder-abandoned-watchpost', x: 298, y: 122 },
    ],
  },
  'district-the-northbank': {
    theme: { surveyLayer: 'official', water: 'south', texture: 'streets', marginNote: 'Every door here keeps a ledger.' },
    streets: [
      'M16,182 C100,176 200,182 280,176 C310,174 330,170 346,166',
      'M60,84 C100,80 150,68 200,60 C232,56 264,72 284,88',
      'M122,82 C108,108 96,134 90,154',
      'M240,166 C252,140 268,112 284,92',
      'M92,158 C140,164 190,168 238,168',
    ],
    pois: [
      { id: 'poi-northbank-courier-post', x: 90, y: 158 },
      { id: 'poi-northbank-succession-registry', x: 122, y: 80 },
      { id: 'poi-northbank-advocates-row', x: 202, y: 58 },
      { id: 'poi-northbank-estate-gate', x: 240, y: 168 },
      { id: 'poi-northbank-private-club', x: 286, y: 90 },
    ],
  },
  'district-the-below': {
    theme: { surveyLayer: 'hand', texture: 'tunnels', marginNote: 'Not on the official survey. Keep it so.' },
    streets: [
      'M58,64 C80,76 100,84 120,90',
      'M124,94 C150,106 178,118 202,126',
      'M206,128 C232,114 258,100 280,94',
      'M204,130 C190,148 174,164 162,176',
      'M60,66 C56,110 60,150 76,178 C100,196 130,190 158,180',
    ],
    pois: [
      { id: 'poi-below-access-tunnel', x: 58, y: 62 },
      { id: 'poi-below-debtors-room', x: 122, y: 92 },
      { id: 'poi-below-lantern-shop', x: 160, y: 180 },
      { id: 'poi-below-underground-exchange', x: 204, y: 128 },
      { id: 'poi-below-apothecary', x: 282, y: 92 },
    ],
  },
}
