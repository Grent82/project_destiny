/**
 * Environs map geometry for the ExpeditionPrepScreen.
 *
 * Shows the city as a small anchor, with expedition destinations positioned
 * around it as bearings into the Waste. Consistent with cityGeometry coordinates
 * but scaled down for the prep screen context.
 */
export const ENVIRONS_VIEWBOX = '0 0 600 400'

export interface EnvironDestination {
  id: string
  name: string
  x: number
  y: number
  dangerLevel: number
  durationDays: number
  bearing: string
}

/**
 * Scaled positions for expedition destinations around the city anchor.
 * Derived from cityEnvironMarkers but repositioned for the environs plate
 * (city centered at 300,200 with destinations in the surrounding Waste).
 */
export const environsDestinations: EnvironDestination[] = [
  { id: 'dest-green-corridor', name: 'Green Corridor', x: 300, y: 40, dangerLevel: 2, durationDays: 3, bearing: 'N' },
  { id: 'dest-toll-road-ruins', name: 'Toll Road Ruins', x: 520, y: 40, dangerLevel: 3, durationDays: 4, bearing: 'N-E' },
  { id: 'dest-ruined-garrison', name: 'Ruined Garrison', x: 560, y: 160, dangerLevel: 4, durationDays: 5, bearing: 'E' },
  { id: 'dest-merrow-waypost', name: 'Merrow Waypost', x: 560, y: 240, dangerLevel: 3, durationDays: 4, bearing: 'upriver' },
  { id: 'dest-charnel-ravine', name: 'Charnel Ravine', x: 540, y: 320, dangerLevel: 5, durationDays: 6, bearing: 'E-S-E' },
  { id: 'dest-ashfields', name: 'Ashfields', x: 480, y: 360, dangerLevel: 4, durationDays: 5, bearing: 'S-E' },
  { id: 'dest-breach-scar', name: 'Breach Scar', x: 300, y: 380, dangerLevel: 6, durationDays: 7, bearing: 'S' },
  { id: 'dest-sunken-wharf', name: 'Sunken Wharf', x: 120, y: 380, dangerLevel: 4, durationDays: 5, bearing: 'S-W' },
]

/** City anchor shape - simplified representation of Valdenmoor */
export const cityAnchorPoints = '260,160 300,155 340,160 350,180 340,200 300,210 260,200 250,180'

/** Danger markers for expedition destinations */
export function dangerPips(dangerLevel: number): string {
  return '▲'.repeat(dangerLevel)
}
