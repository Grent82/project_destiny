/**
 * POI placeholder utility functions - SVG path definitions for each POI type.
 */

/**
 * SVG path data for POI type icons.
 */
export interface PoiIconData {
  viewBox: string
  paths: Array<{ d: string; fill?: string; stroke?: string; strokeWidth?: string; fillOpacity?: string; strokeDasharray?: string }>
}

/**
 * Returns SVG path data for a POI type icon.
 */
export function getPoiTypeIcon(poiType: string): PoiIconData {
  const icons: Record<string, PoiIconData> = {
    guild: {
      viewBox: '0 0 64 64',
      paths: [
        { d: 'M8 56 L32 16 L56 56 M12 48 L32 16 L52 48', stroke: 'currentColor', strokeWidth: '3', fill: 'none', strokeDasharray: '' },
        { d: 'M20 48 L44 48', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M26 36 L38 36 L38 52 L26 52 Z', fill: 'currentColor', fillOpacity: '0.3' },
      ],
    },
    tavern: {
      viewBox: '0 0 64 64',
      paths: [
        { d: 'M16 20 L48 20 L44 52 L20 52 Z', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M16 20 L20 52 M48 20 L44 52', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M26 32 L38 32 L38 52 L26 52 Z', fill: 'currentColor', fillOpacity: '0.3' },
        { d: 'M20 16 L44 16', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
      ],
    },
    shop: {
      viewBox: '0 0 64 64',
      paths: [
        { d: 'M12 24 L52 24 L48 56 L16 56 Z', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M12 24 L16 56 M52 24 L48 56', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M24 36 L40 36 L40 56 L24 56 Z', fill: 'currentColor', fillOpacity: '0.3' },
        { d: 'M12 20 L52 20 L48 24 L16 24 Z', fill: 'currentColor', fillOpacity: '0.4' },
      ],
    },
    court: {
      viewBox: '0 0 64 64',
      paths: [
        { d: 'M8 56 L32 8 L56 56', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M16 56 L32 20 L48 56', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M24 44 L40 44 L40 56 L24 56 Z', fill: 'currentColor', fillOpacity: '0.3' },
        { d: 'M28 40 L36 40', stroke: 'currentColor', strokeWidth: '2', fill: 'none' },
      ],
    },
    residence: {
      viewBox: '0 0 64 64',
      paths: [
        { d: 'M8 56 L32 16 L56 56', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M24 40 L40 40 L40 56 L24 56 Z', fill: 'currentColor', fillOpacity: '0.3' },
        { d: 'M28 40 L28 32 L36 32 L36 40', stroke: 'currentColor', strokeWidth: '2', fill: 'none' },
      ],
    },
    market: {
      viewBox: '0 0 64 64',
      paths: [
        { d: 'M12 20 L24 20 L22 52 L14 52 Z', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M52 20 L40 20 L42 52 L50 52 Z', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M24 20 L32 28 L40 20', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M18 36 L26 36 L26 52 L18 52 Z', fill: 'currentColor', fillOpacity: '0.3' },
        { d: 'M38 36 L46 36 L46 52 L38 52 Z', fill: 'currentColor', fillOpacity: '0.3' },
      ],
    },
    faction_hq: {
      viewBox: '0 0 64 64',
      paths: [
        { d: 'M12 20 L52 20 L52 56 L12 56 Z', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M12 20 L32 8 L52 20', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M24 36 L40 36 L40 56 L24 56 Z', fill: 'currentColor', fillOpacity: '0.3' },
        { d: 'M26 28 L38 28 L38 32 L26 32 Z', fill: 'currentColor', fillOpacity: '0.5' },
      ],
    },
    black_market: {
      viewBox: '0 0 64 64',
      paths: [
        { d: 'M16 20 L48 20 L44 52 L20 52 Z', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
        { d: 'M20 28 L44 28', stroke: 'currentColor', strokeWidth: '2', fill: 'none', strokeDasharray: '4 2' },
        { d: 'M26 34 L38 34 L38 48 L26 48 Z', fill: 'currentColor', fillOpacity: '0.3' },
        { d: 'M24 20 L24 16 L40 16 L40 20', stroke: 'currentColor', strokeWidth: '2', fill: 'none' },
        { d: 'M29 39 L35 39 L35 45 L29 45 Z', fill: 'currentColor' },
      ],
    },
  }

  return icons[poiType] ?? {
    viewBox: '0 0 64 64',
    paths: [
      { d: 'M32 12 L52 32 L32 52 L12 32 Z', stroke: 'currentColor', strokeWidth: '3', fill: 'none', fillOpacity: '0.5' },
    ],
  }
}
