/**
 * Hand-authored survey geometry for the House Copy of the Compact survey.
 *
 * Valdenmoor sits on a river mouth. South of the river: the old city —
 * Gilded Heights and Harbor Ward on the bay, the Pale at the center,
 * Ironworks and the Warrens behind, the Hollows along the ruined
 * southern rim. North of the river: Ash Quay at the mouth, the
 * Northbank's registries, with Cinder Row and the Mireward behind them.
 *
 * Two ink layers: districts the Compact survey covers are drawn in the
 * clerk's clean hand ('official'); The Pale, The Hollows, and The Below
 * do not appear on the official map and are added in the house hand
 * ('hand') — rougher stroke, italic labels. Beyond the wall lies the
 * Waste: bearings and warnings, not survey.
 */
export const CITY_VIEWBOX = '0 0 1200 800'

export type SurveyLayer = 'official' | 'hand'

export interface CityDistrictShape {
  id: string
  /** SVG polygon points — irregular, inked by hand. */
  points: string
  label: { x: number; y: number }
  /** 'hand' = censored on the official survey, added in the house hand. */
  surveyLayer: SurveyLayer
  /** Drawn with hatching and dashed outline (underground annotation). */
  unofficial?: boolean
}

export interface CityTravelEdge {
  a: string
  b: string
  /** Marker position for the gate / bridge / ferry glyph. */
  x: number
  y: number
  /** Visual treatment; the legal border type still comes from content. */
  crossing: 'gate' | 'bridge' | 'ferry' | 'shaft'
  /** Optional dashed path (ferry route, tunnel shaft). */
  path?: string
}

export interface CityEnvironMarker {
  id: string
  x: number
  y: number
  /** Surveyor's bearing note — the survey ends at the wall. */
  bearing: string
}

export interface CityWaterFeature {
  id: string
  path: string
  kind: 'sea' | 'river'
}

export const cityWaterFeatures: CityWaterFeature[] = [
  {
    id: 'water-sea',
    kind: 'sea',
    // Western sea with the bay biting into Harbor Ward.
    path: 'M0,0 L60,0 L60,470 Q112,505 112,545 Q112,585 60,620 L60,800 L0,800 Z',
  },
  {
    id: 'water-river',
    kind: 'river',
    // The river: from the mouth at the sea, east across the map.
    path: 'M60,270 Q300,262 560,268 Q860,274 1200,264 L1200,322 Q860,332 560,326 Q300,320 60,328 Z',
  },
]

/** Shore hachure: short repeated strokes along the waterlines. */
export const cityShoreLines: string[] = [
  'M68,8 Q62,140 66,260',
  'M66,338 Q60,470 64,612',
  'M76,272 Q300,266 560,272 Q860,278 1196,268',
  'M76,324 Q300,318 560,322 Q860,328 1196,318',
]

export const cityDistrictShapes: CityDistrictShape[] = [
  // ── North bank ────────────────────────────────────────────────
  {
    id: 'district-cinder-row',
    points: '74,92 128,87 196,90 261,86 318,89 368,94 365,128 369,166 304,169 233,164 162,168 98,166 72,158 76,124',
    label: { x: 221, y: 122 },
    surveyLayer: 'official',
  },
  {
    id: 'district-the-mireward',
    points: '376,90 432,87 503,91 568,86 631,90 686,93 683,131 687,167 622,165 549,169 477,164 408,168 374,160 378,126',
    label: { x: 531, y: 122 },
    surveyLayer: 'official',
  },
  {
    id: 'district-ash-quay',
    points: '73,178 141,175 214,179 285,174 350,178 369,182 366,219 370,259 309,262 238,257 167,261 100,258 71,250 75,214',
    label: { x: 221, y: 215 },
    surveyLayer: 'official',
  },
  {
    id: 'district-the-northbank',
    points: '377,177 448,174 521,178 590,173 657,177 687,181 684,222 688,260 619,263 545,258 471,262 401,259 374,248 378,213',
    label: { x: 531, y: 215 },
    surveyLayer: 'official',
  },
  {
    id: 'district-the-below',
    points: '734,108 802,102 871,107 938,103 963,112 959,168 964,241 893,246 818,240 745,245 731,232 736,170',
    label: { x: 849, y: 168 },
    surveyLayer: 'hand',
    unofficial: true,
  },
  // ── South of the river ────────────────────────────────────────
  {
    id: 'district-gilded-heights',
    points: '74,339 137,335 205,338 269,334 327,340 329,381 325,422 330,461 263,464 196,459 131,463 73,460 76,398',
    label: { x: 201, y: 392 },
    surveyLayer: 'official',
  },
  {
    id: 'district-harbor',
    points: '73,473 139,470 207,474 272,469 328,473 325,514 330,556 326,599 329,625 262,628 193,623 127,627 72,621 75,547 71,508',
    label: { x: 208, y: 542 },
    surveyLayer: 'official',
  },
  {
    id: 'district-the-pale',
    points:
      '337,340 396,334 458,339 521,333 580,338 618,335 615,372 619,415 614,458 618,497 613,528 552,531 488,525 424,530 362,524 335,518 339,470 334,425 338,381',
    label: { x: 477, y: 425 },
    surveyLayer: 'hand',
  },
  {
    id: 'district-ironworks',
    points: '336,539 401,536 470,540 538,535 601,539 619,543 616,584 620,623 617,650 549,653 478,648 407,652 341,649 334,634 337,588',
    label: { x: 477, y: 598 },
    surveyLayer: 'official',
  },
  {
    id: 'district-the-warrens',
    points:
      '627,406 689,402 756,406 822,401 884,405 897,410 894,462 898,521 893,580 897,634 892,651 824,653 753,648 684,652 626,649 629,585 624,521 628,461',
    label: { x: 761, y: 522 },
    surveyLayer: 'official',
  },
  {
    id: 'district-the-hollows',
    points:
      '74,636 142,632 213,637 287,631 327,635 331,652 398,658 472,653 549,658 627,652 703,657 781,652 856,658 896,661 893,694 812,697 718,692 622,696 524,691 428,695 333,690 238,694 146,690 76,695 72,664',
    label: { x: 470, y: 681 },
    surveyLayer: 'hand',
  },
]

/**
 * The city wall — drawn in segments, broken at the river water-gates and
 * the four land gates out into the Waste.
 */
export const cityWallSegments: string[] = [
  // North bank circuit (sea → north gate → toll gate → east side → river)
  'M64,264 L64,80 L348,80',
  'M374,80 L606,80',
  'M632,80 L697,80 L697,262',
  // South bank circuit (river → east gate → south gate → sea)
  'M905,332 L905,470',
  'M905,496 L905,705 L712,705',
  'M686,705 L62,705 L62,632',
]

export const cityWallTowers: Array<{ x: number; y: number }> = [
  { x: 64, y: 80 },
  { x: 697, y: 80 },
  { x: 697, y: 262 },
  { x: 905, y: 332 },
  { x: 905, y: 705 },
  { x: 62, y: 705 },
]

/** Faint roads from the wall gates out into the Waste. */
export const cityWasteRoads: string[] = [
  'M361,78 C360,66 360,56 360,46',
  'M619,78 C620,66 620,56 620,46',
  'M905,483 C980,480 1020,492 1068,478',
  'M699,707 C700,724 700,738 700,750',
  'M62,640 C84,700 150,738 226,750',
]

export const cityTravelEdges: CityTravelEdge[] = [
  // Old city gates
  { a: 'district-harbor', b: 'district-gilded-heights', x: 200, y: 467, crossing: 'gate' },
  { a: 'district-gilded-heights', b: 'district-the-pale', x: 332, y: 400, crossing: 'gate' },
  { a: 'district-harbor', b: 'district-the-pale', x: 332, y: 500, crossing: 'gate' },
  { a: 'district-harbor', b: 'district-ironworks', x: 332, y: 585, crossing: 'gate' },
  { a: 'district-harbor', b: 'district-the-hollows', x: 200, y: 630, crossing: 'gate' },
  { a: 'district-the-pale', b: 'district-ironworks', x: 477, y: 533, crossing: 'gate' },
  { a: 'district-the-pale', b: 'district-the-warrens', x: 622, y: 460, crossing: 'gate' },
  { a: 'district-ironworks', b: 'district-the-warrens', x: 622, y: 595, crossing: 'gate' },
  { a: 'district-the-warrens', b: 'district-the-hollows', x: 760, y: 655, crossing: 'gate' },
  // River crossings
  {
    a: 'district-the-pale',
    b: 'district-the-northbank',
    x: 480,
    y: 297,
    crossing: 'bridge',
    path: 'M468,266 L468,332 M492,266 L492,332 M468,283 h24 M468,300 h24 M468,317 h24',
  },
  {
    a: 'district-harbor',
    b: 'district-ash-quay',
    x: 74,
    y: 360,
    crossing: 'ferry',
    path: 'M96,470 Q66,365 96,268',
  },
  // North bank streets
  { a: 'district-ash-quay', b: 'district-the-northbank', x: 372, y: 220, crossing: 'gate' },
  { a: 'district-ash-quay', b: 'district-cinder-row', x: 220, y: 172, crossing: 'gate' },
  { a: 'district-the-mireward', b: 'district-the-northbank', x: 531, y: 172, crossing: 'gate' },
  { a: 'district-cinder-row', b: 'district-the-mireward', x: 372, y: 128, crossing: 'gate' },
  // Down into the Below
  {
    a: 'district-cinder-row',
    b: 'district-the-below',
    x: 700,
    y: 92,
    crossing: 'shaft',
    path: 'M372,95 Q550,78 730,110',
  },
]

/**
 * Expedition destinations in the Waste. The survey ends at the wall —
 * these are bearings in the house hand, not measured positions.
 */
export const cityEnvironMarkers: CityEnvironMarker[] = [
  { id: 'dest-green-corridor', x: 360, y: 38, bearing: 'N' },
  { id: 'dest-toll-road-ruins', x: 620, y: 38, bearing: 'N-E, the old road' },
  { id: 'dest-ruined-garrison', x: 1052, y: 152, bearing: 'E beyond the mire' },
  { id: 'dest-merrow-waypost', x: 1060, y: 296, bearing: 'upriver' },
  { id: 'dest-charnel-ravine', x: 1080, y: 470, bearing: 'E-S-E' },
  { id: 'dest-ashfields', x: 1060, y: 620, bearing: 'E' },
  { id: 'dest-breach-scar', x: 700, y: 758, bearing: 'S' },
  { id: 'dest-sunken-wharf', x: 240, y: 758, bearing: 'S along the drowned coast' },
]
