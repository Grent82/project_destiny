import { render } from '@testing-library/react'
import { contentCatalog } from '../../../application/content/contentCatalog'
import { FactionStamp } from './mapSymbols'

describe('FactionStamp — regression guard for destiny-e9tt', () => {
  it('renders a real emblem (not null) for every faction actually used as a district controller', () => {
    const controllingFactionIds = new Set(
      contentCatalog.districts
        .map((d) => d.controllingFactionId)
        .filter((id): id is string => Boolean(id)),
    )
    expect(controllingFactionIds.size).toBeGreaterThan(0)

    for (const factionId of controllingFactionIds) {
      const { container } = render(
        <svg>
          <FactionStamp factionId={factionId} x={12} y={12} size={24} />
        </svg>,
      )
      expect(container.querySelector('.map-seal'), `Expected a rendered seal for ${factionId}`).not.toBeNull()
    }
  })

  it('returns null for an unrecognized faction id, without throwing', () => {
    const { container } = render(
      <svg>
        <FactionStamp factionId="faction-does-not-exist" x={12} y={12} size={24} />
      </svg>,
    )
    expect(container.querySelector('.map-seal')).toBeNull()
  })
})
