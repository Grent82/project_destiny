/**
 * Hand-authored survey geometry for the city overview map.
 *
 * The city sits on a river mouth. South of the river: the old city —
 * Gilded Heights and Harbor Ward on the bay, the Pale at the center,
 * Ironworks and the Warrens behind, the Hollows along the ruined
 * southern rim. North of the river: Ash Quay at the mouth, the
 * Northbank's registries, with Cinder Row and the Mireward behind
 * them. The Below has no official survey — it is drawn as the
 * surveyor's pencil annotation, beneath Cinder Row.
 */
export const CITY_VIEWBOX = '0 0 1200 800'

export interface CityDistrictShape {
  id: string
  /** SVG polygon points */
  points: string
  label: { x: number; y: number }
  /** Drawn with hatching and dashed outline (unofficial / underground). */
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

export const cityDistrictShapes: CityDistrictShape[] = [
  // ── North bank ────────────────────────────────────────────────
  {
    id: 'district-cinder-row',
    points: '70,85 372,85 372,172 70,172',
    label: { x: 221, y: 122 },
  },
  {
    id: 'district-the-mireward',
    points: '372,85 690,85 690,172 372,172',
    label: { x: 531, y: 122 },
  },
  {
    id: 'district-ash-quay',
    points: '70,172 372,172 372,266 70,266',
    label: { x: 221, y: 215 },
  },
  {
    id: 'district-the-northbank',
    points: '372,172 690,172 690,266 372,266',
    label: { x: 531, y: 215 },
  },
  {
    id: 'district-the-below',
    points: '730,100 968,100 968,250 730,250',
    label: { x: 849, y: 168 },
    unofficial: true,
  },
  // ── South of the river ────────────────────────────────────────
  {
    id: 'district-gilded-heights',
    points: '70,332 332,332 332,467 70,467',
    label: { x: 201, y: 392 },
  },
  {
    id: 'district-harbor',
    points: '70,467 332,467 332,630 70,630',
    label: { x: 208, y: 542 },
  },
  {
    id: 'district-the-pale',
    points: '332,332 622,332 622,533 332,533',
    label: { x: 477, y: 425 },
  },
  {
    id: 'district-ironworks',
    points: '332,533 622,533 622,655 332,655',
    label: { x: 477, y: 598 },
  },
  {
    id: 'district-the-warrens',
    points: '622,400 900,400 900,655 622,655',
    label: { x: 761, y: 522 },
  },
  {
    id: 'district-the-hollows',
    points: '70,630 332,630 332,655 900,655 900,700 70,700',
    label: { x: 470, y: 681 },
  },
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
    path: 'M468,266 L468,332 M492,266 L492,332',
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

/** Expedition destinations placed around the city as the near environs. */
export const cityEnvironMarkers: CityEnvironMarker[] = [
  { id: 'dest-green-corridor', x: 360, y: 38 },
  { id: 'dest-toll-road-ruins', x: 620, y: 38 },
  { id: 'dest-ruined-garrison', x: 1080, y: 90 },
  { id: 'dest-merrow-waypost', x: 1060, y: 296 },
  { id: 'dest-charnel-ravine', x: 1080, y: 470 },
  { id: 'dest-ashfields', x: 1060, y: 620 },
  { id: 'dest-breach-scar', x: 700, y: 758 },
  { id: 'dest-sunken-wharf', x: 240, y: 758 },
]
