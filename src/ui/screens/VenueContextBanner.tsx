import { useNavigate } from 'react-router-dom'

import { useVenueContext } from './locationContext'

export function VenueContextBanner() {
  const context = useVenueContext()
  const navigate = useNavigate()

  if (!context) {
    return null
  }

  return (
    <div
      className="detail-panel"
      style={{ marginBottom: '1rem', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}
    >
      <div>
        <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>
          {context.districtName} / {context.poiName}
        </p>
        <p className="summary" style={{ marginBottom: 0 }}>
          You are working from a specific place in the district rather than an abstract house menu.
        </p>
      </div>
      <button
        className="action-button action-button--secondary"
        type="button"
        onClick={() => navigate(`/district/${context.districtId}/poi/${context.poiId}`)}
      >
        ← Back to {context.poiName}
      </button>
    </div>
  )
}
