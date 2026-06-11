/**
 * Plate I of the House Copy: the family seat as the surveyor drew it
 * before the Breach, corrected in the house hand. Ground floor at the
 * center, the rear block across the yard, the east wing hanging off
 * the side, the garret noted above, the sealed cellar below.
 */
export const HOUSE_MAP_VIEWBOX = '0 0 420 312'

export interface HouseRoomShape {
  roomId: string
  x: number
  y: number
  width: number
  height: number
  label: { x: number; y: number }
  /** Drawn outside the main block (garret above, cellar below). */
  annotation?: 'above' | 'below'
}

export const houseRoomShapes: HouseRoomShape[] = [
  // Garret — above the main block (annotation box)
  { roomId: 'room-garret', x: 304, y: 26, width: 56, height: 34, label: { x: 332, y: 42 }, annotation: 'above' },
  // Main block — north row
  { roomId: 'room-quarters', x: 60, y: 64, width: 80, height: 90, label: { x: 100, y: 105 } },
  { roomId: 'room-study', x: 140, y: 64, width: 80, height: 90, label: { x: 180, y: 105 } },
  { roomId: 'room-master-chamber', x: 220, y: 64, width: 80, height: 90, label: { x: 260, y: 105 } },
  // Main block — south row
  { roomId: 'room-kitchen', x: 60, y: 154, width: 80, height: 90, label: { x: 100, y: 195 } },
  { roomId: 'room-entrance-hall', x: 140, y: 154, width: 80, height: 90, label: { x: 180, y: 195 } },
  { roomId: 'room-bureau', x: 220, y: 154, width: 80, height: 90, label: { x: 260, y: 195 } },
  // Cellar / vault — below the hall (annotation box)
  { roomId: 'room-vault', x: 140, y: 258, width: 80, height: 44, label: { x: 180, y: 278 }, annotation: 'below' },
]

/** Fixed plan furniture: walls, the yard, the street door, the stair down. */
export const housePlanDecor = {
  /** Outer wall of the main block. */
  mainBlock: { x: 58, y: 62, width: 244, height: 184 },
  /** Yard line between the rear block and the main block. */
  yardPath: 'M180 60 V64 M230 60 V64',
  /** Street door notch at the south wall of the entrance hall. */
  doorPath: 'M148 246 h16',
  /** Stair from the hall down to the cellar annotation. */
  stairPath: 'M180 246 V256 M174 249 h12 M175 252 h10',
  yardLabel: { x: 40, y: 45 },
  streetLabel: { x: 92, y: 257 },
}
