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

export interface DistrictBlock {
  x: number
  y: number
  w: number
  h: number
  /** Rotation in degrees — grown cities are never square. */
  r: number
}

export interface DistrictMapGeometry {
  theme: DistrictMapTheme
  pois: DistrictPoiNode[]
  /** Hand-authored street network: every plate shows how you move through the ward. */
  streets: string[]
  /** Narrow alleys and back lanes cutting between the blocks. */
  lanes: string[]
  /** Building clusters — the grown fabric of the ward. */
  blocks: DistrictBlock[]
}

export const districtMapGeometry: Record<string, DistrictMapGeometry> = {
  'district-harbor': {
    theme: { surveyLayer: 'official', water: 'west', texture: 'docks', marginNote: 'Tide gates close at dusk.' },
    streets: [
      'M46,16 C54,90 52,160 48,230',
      'M48,72 C110,58 180,48 244,48 C282,48 312,54 334,64',
      'M50,138 C100,134 150,126 196,118 C240,112 268,118 298,126',
      'M196,122 C200,140 202,156 204,170',
      'M48,184 C58,186 64,188 70,190',
    ],
    lanes: [
      'M152,76 C150,96 150,112 152,128',
      'M244,80 C246,96 248,112 250,126',
      'M124,166 C124,178 124,188 122,198',
    ],
    blocks: [
      { x: 60, y: 28, w: 26, h: 16, r: -4 },
      { x: 96, y: 26, w: 30, h: 18, r: 3 },
      { x: 200, y: 26, w: 24, h: 16, r: -6 },
      { x: 300, y: 30, w: 22, h: 14, r: 5 },
      { x: 88, y: 84, w: 24, h: 16, r: 6 },
      { x: 170, y: 86, w: 28, h: 16, r: -3 },
      { x: 262, y: 88, w: 22, h: 14, r: 4 },
      { x: 150, y: 196, w: 26, h: 16, r: -5 },
      { x: 246, y: 196, w: 28, h: 16, r: 4 },
      { x: 120, y: 42, w: 22, h: 14, r: 2 },
      { x: 240, y: 44, w: 20, h: 12, r: -3 },
      { x: 60, y: 156, w: 24, h: 14, r: 4 },
      { x: 124, y: 168, w: 22, h: 14, r: -2 },
      { x: 220, y: 148, w: 24, h: 14, r: 3 },
      { x: 286, y: 176, w: 20, h: 12, r: -4 },
      { x: 156, y: 64, w: 20, h: 12, r: 5 },
      { x: 310, y: 102, w: 18, h: 12, r: -2 },
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
      'M30,42 Q180,30 330,42',
      'M30,80 Q180,68 330,80',
      'M30,122 Q180,110 330,122',
      'M30,168 Q180,156 330,168',
      'M30,206 Q180,194 330,206',
    ],
    lanes: [
      'M108,204 Q112,150 116,84',
      'M256,202 Q260,148 264,82',
    ],
    blocks: [
      { x: 52, y: 46, w: 30, h: 14, r: -2 },
      { x: 218, y: 44, w: 26, h: 14, r: 3 },
      { x: 60, y: 86, w: 26, h: 14, r: 2 },
      { x: 160, y: 82, w: 26, h: 14, r: -3 },
      { x: 288, y: 86, w: 24, h: 14, r: 2 },
      { x: 52, y: 128, w: 26, h: 14, r: -2 },
      { x: 150, y: 124, w: 26, h: 14, r: 3 },
      { x: 240, y: 126, w: 24, h: 14, r: -2 },
      { x: 60, y: 172, w: 24, h: 14, r: 2 },
      { x: 200, y: 170, w: 26, h: 14, r: -3 },
      { x: 108, y: 52, w: 22, h: 12, r: 2 },
      { x: 268, y: 48, w: 20, h: 12, r: -3 },
      { x: 116, y: 92, w: 22, h: 12, r: 3 },
      { x: 212, y: 118, w: 20, h: 12, r: -2 },
      { x: 96, y: 204, w: 22, h: 12, r: 2 },
      { x: 256, y: 198, w: 24, h: 12, r: -4 },
      { x: 316, y: 142, w: 18, h: 12, r: 3 },
      { x: 136, y: 164, w: 18, h: 12, r: -2 },
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
      'M16,210 C90,206 180,210 250,212 C290,212 320,208 336,204',
      'M20,100 C70,94 110,88 150,74 C170,62 195,50 232,52 C262,56 292,66 322,76',
      'M152,80 C170,104 188,124 204,138 C220,154 238,176 250,192',
      'M262,96 C278,112 292,126 300,136',
      'M104,158 C94,172 76,188 60,200',
    ],
    lanes: [
      'M118,88 C119,96 120,100 120,104',
      'M182,78 C183,90 184,98 185,106',
      'M258,100 C257,110 256,118 256,126',
    ],
    blocks: [
      { x: 60, y: 120, w: 30, h: 18, r: -4 },
      { x: 150, y: 120, w: 26, h: 16, r: 3 },
      { x: 226, y: 108, w: 26, h: 16, r: -3 },
      { x: 288, y: 100, w: 24, h: 16, r: 4 },
      { x: 74, y: 214, w: 26, h: 14, r: 3 },
      { x: 150, y: 216, w: 30, h: 14, r: -3 },
      { x: 282, y: 170, w: 24, h: 14, r: -4 },
      { x: 40, y: 60, w: 26, h: 16, r: 5 },
      { x: 86, y: 48, w: 28, h: 16, r: -4 },
      { x: 110, y: 156, w: 24, h: 14, r: 4 },
      { x: 186, y: 172, w: 22, h: 14, r: -3 },
      { x: 244, y: 188, w: 22, h: 12, r: 3 },
      { x: 104, y: 82, w: 24, h: 14, r: -4 },
      { x: 176, y: 68, w: 22, h: 12, r: 5 },
      { x: 260, y: 56, w: 20, h: 12, r: -2 },
      { x: 52, y: 186, w: 20, h: 12, r: 4 },
      { x: 316, y: 132, w: 18, h: 12, r: -3 },
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
      'M50,86 C100,92 140,96 180,100 C218,104 240,118 252,128',
      'M186,94 C198,76 210,58 226,46 C254,38 290,52 316,66',
      'M44,154 C84,140 104,132 124,128',
      'M130,130 C142,148 148,166 152,184',
      'M158,186 C200,190 256,186 296,176',
      'M260,130 C274,146 288,160 298,172',
      'M64,84 C56,108 50,134 46,154',
    ],
    lanes: [
      'M96,96 C98,112 100,124 102,134',
      'M226,64 C228,76 230,86 230,94',
      'M280,180 C272,168 264,158 258,150',
    ],
    blocks: [
      { x: 70, y: 108, w: 26, h: 16, r: 4 },
      { x: 140, y: 112, w: 24, h: 14, r: -3 },
      { x: 206, y: 118, w: 26, h: 16, r: 3 },
      { x: 74, y: 182, w: 26, h: 14, r: -4 },
      { x: 196, y: 168, w: 28, h: 16, r: 4 },
      { x: 262, y: 86, w: 24, h: 14, r: -5 },
      { x: 120, y: 54, w: 26, h: 14, r: 3 },
      { x: 40, y: 196, w: 24, h: 14, r: 5 },
      { x: 286, y: 128, w: 20, h: 12, r: -3 },
      { x: 100, y: 156, w: 22, h: 14, r: 3 },
      { x: 168, y: 192, w: 22, h: 12, r: -4 },
      { x: 232, y: 182, w: 20, h: 12, r: 4 },
      { x: 92, y: 68, w: 22, h: 12, r: -3 },
      { x: 156, y: 42, w: 20, h: 12, r: 5 },
      { x: 240, y: 62, w: 18, h: 12, r: -2 },
      { x: 50, y: 138, w: 18, h: 12, r: 4 },
      { x: 308, y: 168, w: 18, h: 12, r: -3 },
    ],
    pois: [
      { id: 'poi-pale-wren-safe-house', x: 46, y: 168 },
      { id: 'poi-pale-tallow-ring', x: 64, y: 70 },
      { id: 'poi-pale-the-ash', x: 122, y: 140 },
      { id: 'poi-pale-salvage-row', x: 152, y: 198 },
      { id: 'poi-pale-pale-market', x: 180, y: 100 },
      { id: 'poi-pale-the-pale-court', x: 222, y: 56 },
      { id: 'poi-pale-black-ledger', x: 256, y: 142 },
      { id: 'poi-pale-house-valdris', x: 300, y: 188 },
      { id: 'poi-pale-old-tannery', x: 318, y: 84 },
      { id: 'poi-pale-archive-chapel', x: 148, y: 64 },
      { id: 'poi-mireward-shrine', x: 90, y: 108 },
    ],
  },
  'district-the-warrens': {
    theme: { surveyLayer: 'official', texture: 'ruins', marginNote: 'Streets unnamed past the second bend.' },
    streets: [
      'M58,72 C84,62 108,76 130,108 C144,126 158,122 172,104 C188,88 196,90 204,92',
      'M206,90 C222,74 236,62 250,52',
      'M182,52 C190,64 196,74 202,84',
      'M210,98 C238,112 270,124 296,132',
      'M132,142 C118,162 106,176 96,186',
      'M246,170 C262,158 280,148 294,142',
      'M108,188 C148,180 196,176 232,174',
    ],
    lanes: [
      'M86,94 C92,108 100,118 110,126',
      'M214,104 C220,124 228,148 236,168',
    ],
    blocks: [
      { x: 96, y: 56, w: 22, h: 14, r: 8 },
      { x: 130, y: 80, w: 20, h: 12, r: -7 },
      { x: 160, y: 140, w: 22, h: 14, r: 6 },
      { x: 196, y: 120, w: 20, h: 12, r: -8 },
      { x: 236, y: 86, w: 22, h: 14, r: 7 },
      { x: 268, y: 108, w: 20, h: 12, r: -6 },
      { x: 124, y: 168, w: 22, h: 14, r: -7 },
      { x: 180, y: 196, w: 24, h: 14, r: 6 },
      { x: 262, y: 196, w: 22, h: 12, r: -5 },
      { x: 60, y: 120, w: 20, h: 12, r: 7 },
      { x: 76, y: 156, w: 18, h: 12, r: -6 },
      { x: 148, y: 188, w: 18, h: 12, r: 5 },
      { x: 216, y: 176, w: 20, h: 12, r: -7 },
      { x: 288, y: 164, w: 18, h: 12, r: 6 },
      { x: 108, y: 108, w: 18, h: 12, r: -5 },
      { x: 172, y: 68, w: 18, h: 12, r: 8 },
      { x: 304, y: 98, w: 16, h: 12, r: -4 },
      { x: 52, y: 86, w: 16, h: 12, r: 6 },
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
      'M50,74 C90,76 140,80 200,80 C224,76 244,66 262,70',
      'M272,72 C286,90 298,110 304,122',
      'M124,134 C106,154 96,170 90,180',
      'M138,128 C152,146 158,160 162,170',
      'M170,188 C192,194 214,198 228,198',
      'M206,88 C180,100 156,110 142,118',
      'M246,192 C268,172 288,152 300,142',
    ],
    lanes: [
      'M76,72 C80,92 84,112 88,132',
      'M212,92 C220,108 228,124 234,138',
    ],
    blocks: [
      { x: 100, y: 90, w: 24, h: 14, r: -6 },
      { x: 156, y: 92, w: 22, h: 12, r: 5 },
      { x: 230, y: 110, w: 22, h: 14, r: -5 },
      { x: 110, y: 156, w: 22, h: 12, r: 6 },
      { x: 196, y: 156, w: 24, h: 14, r: -4 },
      { x: 282, y: 86, w: 20, h: 12, r: 4 },
      { x: 60, y: 148, w: 20, h: 12, r: -5 },
      { x: 262, y: 164, w: 20, h: 12, r: 6 },
      { x: 136, y: 118, w: 18, h: 12, r: -4 },
      { x: 208, y: 132, w: 18, h: 12, r: 5 },
      { x: 84, y: 112, w: 16, h: 12, r: -6 },
      { x: 168, y: 68, w: 18, h: 12, r: 4 },
      { x: 250, y: 148, w: 16, h: 12, r: -5 },
      { x: 144, y: 184, w: 16, h: 12, r: 3 },
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
      'M14,176 C90,170 180,176 260,170 C292,168 322,162 344,156',
      'M40,128 C90,120 130,112 156,108',
      'M164,108 C190,124 212,142 228,154',
      'M186,62 V88',
      'M238,152 C258,136 276,122 290,116',
    ],
    lanes: [
      'M96,130 C94,136 92,140 92,146',
      'M120,116 C122,104 124,96 126,88',
    ],
    blocks: [
      { x: 52, y: 142, w: 26, h: 14, r: -4 },
      { x: 120, y: 128, w: 24, h: 14, r: 4 },
      { x: 206, y: 118, w: 26, h: 16, r: -3 },
      { x: 262, y: 134, w: 22, h: 12, r: 4 },
      { x: 120, y: 60, w: 26, h: 14, r: -3 },
      { x: 226, y: 72, w: 28, h: 16, r: 4 },
      { x: 60, y: 84, w: 24, h: 14, r: 3 },
      { x: 152, y: 156, w: 22, h: 12, r: -3 },
      { x: 284, y: 158, w: 20, h: 12, r: 4 },
      { x: 84, y: 108, w: 20, h: 12, r: -2 },
      { x: 172, y: 92, w: 18, h: 12, r: 3 },
      { x: 36, y: 118, w: 18, h: 12, r: -4 },
      { x: 248, y: 48, w: 20, h: 12, r: 5 },
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
      'M30,150 C70,136 92,130 120,128',
      'M126,124 C148,104 162,86 172,76',
      'M126,132 C166,136 206,138 240,138',
      'M252,138 C264,156 276,172 284,182',
      'M104,132 C98,152 92,168 88,180',
    ],
    lanes: [
      'M188,76 C200,90 214,106 234,120',
    ],
    blocks: [
      { x: 140, y: 148, w: 20, h: 12, r: 5 },
      { x: 210, y: 150, w: 20, h: 12, r: -4 },
      { x: 64, y: 162, w: 18, h: 10, r: 4 },
      { x: 156, y: 96, w: 18, h: 10, r: -5 },
      { x: 262, y: 150, w: 18, h: 10, r: 5 },
      { x: 108, y: 152, w: 18, h: 12, r: 3 },
      { x: 184, y: 172, w: 18, h: 12, r: -4 },
      { x: 236, y: 118, w: 16, h: 12, r: 4 },
      { x: 76, y: 128, w: 16, h: 12, r: -3 },
      { x: 288, y: 176, w: 16, h: 10, r: 5 },
    ],
    pois: [
      { id: 'poi-mireward-apothecary', x: 108, y: 118 },
      { id: 'poi-mireward-pawn-fence', x: 88, y: 190 },
      { id: 'poi-mireward-low-water-tavern', x: 248, y: 128 },
      { id: 'poi-mireward-physician', x: 290, y: 192 },
    ],
  },
  'district-cinder-row': {
    theme: { surveyLayer: 'official', texture: 'yards', marginNote: 'Coal dust settles on everything by noon.' },
    streets: [
      'M40,96 C70,92 88,90 102,88 C150,78 184,72 214,78 C248,76 276,98 290,110',
      'M108,98 C124,114 142,128 154,136',
      'M156,148 C132,162 106,176 90,182',
      'M168,148 C210,142 252,136 286,130',
      'M92,196 C150,202 220,204 286,196',
    ],
    lanes: [
      'M222,84 C223,96 224,104 224,112',
    ],
    blocks: [
      { x: 120, y: 104, w: 28, h: 16, r: -3 },
      { x: 190, y: 96, w: 26, h: 16, r: 4 },
      { x: 246, y: 108, w: 24, h: 14, r: -4 },
      { x: 116, y: 160, w: 26, h: 14, r: 3 },
      { x: 206, y: 160, w: 28, h: 16, r: -3 },
      { x: 60, y: 120, w: 22, h: 14, r: 4 },
      { x: 262, y: 170, w: 24, h: 14, r: 3 },
      { x: 148, y: 132, w: 20, h: 12, r: -2 },
      { x: 224, y: 144, w: 18, h: 12, r: 4 },
      { x: 88, y: 148, w: 18, h: 12, r: -3 },
      { x: 172, y: 184, w: 20, h: 12, r: 3 },
      { x: 280, y: 136, w: 16, h: 12, r: -4 },
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
      'M60,70 C100,62 150,50 202,46 C234,44 264,58 282,74',
      'M118,92 C106,116 96,136 90,148',
      'M244,156 C256,134 270,112 282,98',
      'M96,164 C140,170 188,172 232,172',
    ],
    lanes: [
      'M206,68 C208,86 210,104 212,122',
      'M150,64 C152,76 154,88 156,100',
    ],
    blocks: [
      { x: 76, y: 100, w: 28, h: 14, r: -2 },
      { x: 150, y: 108, w: 28, h: 14, r: 2 },
      { x: 216, y: 98, w: 26, h: 14, r: -2 },
      { x: 120, y: 128, w: 26, h: 14, r: 2 },
      { x: 190, y: 130, w: 28, h: 14, r: -2 },
      { x: 60, y: 38, w: 26, h: 14, r: 2 },
      { x: 150, y: 28, w: 28, h: 14, r: -2 },
      { x: 250, y: 30, w: 26, h: 14, r: 2 },
      { x: 104, y: 72, w: 22, h: 12, r: -3 },
      { x: 178, y: 64, w: 20, h: 12, r: 2 },
      { x: 244, y: 68, w: 22, h: 12, r: -2 },
      { x: 92, y: 156, w: 20, h: 12, r: 3 },
      { x: 276, y: 124, w: 18, h: 12, r: -2 },
      { x: 312, y: 96, w: 18, h: 12, r: 2 },
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
      'M52,76 C76,86 96,94 112,100',
      'M130,102 C156,114 180,122 194,126',
      'M214,122 C238,110 260,100 272,96',
      'M198,138 C186,152 174,164 166,170',
      'M52,78 C50,116 56,150 72,172 C96,190 126,188 150,182',
    ],
    lanes: [],
    blocks: [
      { x: 88, y: 120, w: 22, h: 12, r: 6 },
      { x: 226, y: 150, w: 22, h: 12, r: -5 },
      { x: 120, y: 52, w: 20, h: 10, r: -4 },
      { x: 244, y: 66, w: 20, h: 10, r: 5 },
      { x: 156, y: 92, w: 18, h: 10, r: 4 },
      { x: 188, y: 114, w: 18, h: 10, r: -3 },
      { x: 68, y: 148, w: 16, h: 10, r: 5 },
      { x: 276, y: 128, w: 16, h: 10, r: -4 },
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
