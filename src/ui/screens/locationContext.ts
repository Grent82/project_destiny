import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { contentCatalog } from '../../application/content/contentCatalog'

type VenueContext = {
  districtId: string
  districtName: string
  poiId: string
  poiName: string
}

export function buildVenueSearch(districtId: string, poiId: string) {
  return `?district=${encodeURIComponent(districtId)}&poi=${encodeURIComponent(poiId)}`
}

export function useVenueContext(): VenueContext | null {
  const [searchParams] = useSearchParams()

  return useMemo(() => {
    const districtId = searchParams.get('district')
    const poiId = searchParams.get('poi')
    if (!districtId || !poiId) {
      return null
    }

    const district = contentCatalog.districtsById.get(districtId)
    const poi = contentCatalog.poisById.get(poiId)
    if (!district || !poi || poi.districtId !== districtId) {
      return null
    }

    return {
      districtId,
      districtName: district.name,
      poiId,
      poiName: poi.name,
    }
  }, [searchParams])
}
