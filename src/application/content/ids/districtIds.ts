/** Canonical IDs for city districts in data/definitions/districts.json. */
export const DISTRICT_IDS = {
  ASH_QUAY: 'district-ash-quay',
  CINDER_ROW: 'district-cinder-row',
  GILDED_HEIGHTS: 'district-gilded-heights',
  HARBOR: 'district-harbor',
  IRONWORKS: 'district-ironworks',
  THE_BELOW: 'district-the-below',
  THE_HOLLOWS: 'district-the-hollows',
  THE_MIREWARD: 'district-the-mireward',
  THE_NORTHBANK: 'district-the-northbank',
  THE_PALE: 'district-the-pale',
  THE_WARRENS: 'district-the-warrens',
} as const

export type DistrictId = typeof DISTRICT_IDS[keyof typeof DISTRICT_IDS]
