import { useEffect, useId, useState } from 'react'

interface IntimacyOptionsModalProps {
  npcName: string
  requiresConsent: boolean
  onConfirm: (options: { contraception: boolean; intent: 'want-pregnancy' | 'avoid-pregnancy' | 'neutral'; consentGiven: boolean }) => void
  onCancel: () => void
}

export function IntimacyOptionsModal({
  npcName,
  requiresConsent,
  onConfirm,
  onCancel,
}: IntimacyOptionsModalProps) {
  const headingId = useId()
  const [contraception, setContraception] = useState(false)
  const [intent, setIntent] = useState<'want-pregnancy' | 'avoid-pregnancy' | 'neutral'>('neutral')
  const [consentGiven, setConsentGiven] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  function handleConfirm() {
    if (requiresConsent && !consentGiven) return
    onConfirm({ contraception, intent, consentGiven })
  }

  return (
    <div className="event-modal-overlay" onClick={onCancel}>
      <div
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '32rem' }}
      >
        <p className="event-modal-kicker">Physical Intimacy</p>
        <h2 id={headingId} className="event-modal-title">Spend the Night with {npcName}</h2>

        {requiresConsent && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
            <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>Consent Required</p>
            <p style={{ fontSize: 'var(--size-sm)', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {npcName} requires explicit consent before intimacy. This is a sign of respect and trust.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
              />
              <span>I consent to engage in physical intimacy</span>
            </label>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>Contraception</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={contraception}
              onChange={(e) => setContraception(e.target.checked)}
              style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
            />
            <span>Use contraception (reduces pregnancy risk)</span>
          </label>
          <p style={{ fontSize: 'var(--size-sm)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Note: No method is 100% effective.
          </p>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>Pregnancy Intent</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="pregnancy-intent"
                value="want-pregnancy"
                checked={intent === 'want-pregnancy'}
                onChange={() => setIntent('want-pregnancy')}
                style={{ cursor: 'pointer' }}
              />
              <span>I hope for pregnancy</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="pregnancy-intent"
                value="avoid-pregnancy"
                checked={intent === 'avoid-pregnancy'}
                onChange={() => setIntent('avoid-pregnancy')}
                style={{ cursor: 'pointer' }}
              />
              <span>I want to avoid pregnancy</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="pregnancy-intent"
                value="neutral"
                checked={intent === 'neutral'}
                onChange={() => setIntent('neutral')}
                style={{ cursor: 'pointer' }}
              />
              <span>Neutral / not thinking about this</span>
            </label>
          </div>
        </div>

        <div className="event-modal-choices">
          <button
            className="action-button action-button--primary"
            type="button"
            onClick={handleConfirm}
            disabled={requiresConsent && !consentGiven}
          >
            Spend the Night
          </button>
          <button
            className="action-button"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
