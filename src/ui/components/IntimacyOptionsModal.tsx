import { useEffect, useId, useRef, useState } from 'react'

interface IntimacyOptionsModalProps {
  npcName: string
  requiresConsent: boolean
  onConfirm: (options: { contraception: boolean; intent: 'want-pregnancy' | 'avoid-pregnancy' | 'neutral'}) => void
  onCancel: () => void
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function IntimacyOptionsModal({
  npcName,
  onConfirm,
  onCancel,
}: IntimacyOptionsModalProps) {
  const headingId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [contraception, setContraception] = useState(false)
  const [intent, setIntent] = useState<'want-pregnancy' | 'avoid-pregnancy' | 'neutral'>('neutral')

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
        return
      }
      if (e.key !== 'Tab') return

      const container = dialogRef.current
      if (!container) return
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled'),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
  }, [])

  function handleConfirm() {
    onConfirm({ contraception, intent })
  }

  return (
    <div className="event-modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '32rem' }}
      >
        <p className="event-modal-kicker">Physical Intimacy</p>
        <h2 id={headingId} className="event-modal-title">Spend the Night with {npcName}</h2>

        <section className="intimacy-section">
          <h3 className="intimacy-section-heading">
            Contraception
            <span
              className="intimacy-info-icon"
              title="No method is 100% effective. Baseline conception risk is roughly 1 in 5 per encounter; contraception meaningfully lowers that risk without removing it entirely."
              aria-label="No method is 100% effective. Baseline conception risk is roughly 1 in 5 per encounter; contraception meaningfully lowers that risk without removing it entirely."
            >
              ⓘ
            </span>
          </h3>
          <label className="intimacy-checkbox-row">
            <input
              type="checkbox"
              checked={contraception}
              onChange={(e) => setContraception(e.target.checked)}
            />
            <span>Use contraception (reduces pregnancy risk)</span>
          </label>
        </section>

        <section className="intimacy-section">
          <h3 className="intimacy-section-heading">Pregnancy Intent</h3>
          <div className="intimacy-radio-group" role="radiogroup" aria-label="Pregnancy intent">
            <label className="intimacy-radio-row">
              <input
                type="radio"
                name="pregnancy-intent"
                value="want-pregnancy"
                checked={intent === 'want-pregnancy'}
                onChange={() => setIntent('want-pregnancy')}
              />
              <span>
                Hope for pregnancy
                <span className="intimacy-radio-hint"> &mdash; increases conception chance</span>
              </span>
            </label>
            <label className="intimacy-radio-row">
              <input
                type="radio"
                name="pregnancy-intent"
                value="neutral"
                checked={intent === 'neutral'}
                onChange={() => setIntent('neutral')}
              />
              <span>
                Neutral
                <span className="intimacy-radio-hint"> &mdash; standard conception risk</span>
              </span>
            </label>
            <label className="intimacy-radio-row">
              <input
                type="radio"
                name="pregnancy-intent"
                value="avoid-pregnancy"
                checked={intent === 'avoid-pregnancy'}
                onChange={() => setIntent('avoid-pregnancy')}
              />
              <span>
                Avoid pregnancy
                <span className="intimacy-radio-hint"> &mdash; lower conception risk</span>
              </span>
            </label>
          </div>
        </section>

        <div className="event-modal-choices">
          <button
            className="action-button action-button--primary"
            type="button"
            onClick={handleConfirm}
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
