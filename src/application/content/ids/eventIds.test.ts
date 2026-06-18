import { describe, expect, it } from 'vitest'

import { contentCatalog } from '../contentCatalog'
import { EVENT_IDS } from './eventIds'

describe('politics event ids content gate', () => {
  it('resolves the politics and debt event ids to authored event content', () => {
    const politicsEventIds = [
      EVENT_IDS.CITY_CRISIS,
      EVENT_IDS.DEBT_FACTION_WARNING,
      EVENT_IDS.GILDED_NOTICE,
    ]

    for (const eventId of politicsEventIds) {
      expect(contentCatalog.eventsById.has(eventId)).toBe(true)
    }
  })
})
