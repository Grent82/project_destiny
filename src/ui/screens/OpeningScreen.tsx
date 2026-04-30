import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { gameActions } from '../../application'
import { useAppDispatch } from '../app/hooks'

const STARTING_TRAITS = ['Ruthless', 'Diplomatic', 'Cautious', 'Ambitious', 'Loyal', 'Cunning']
const STAT_POOL = 6
const STAT_BASE = 3
const STAT_MAX = 8

export function OpeningScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [step, setStep] = useState<'name' | 'lore' | 'character'>('name')

  // Character creation state
  const [charName, setCharName] = useState('')
  const [stats, setStats] = useState({ strength: STAT_BASE, cunning: STAT_BASE, authority: STAT_BASE })
  const [selectedTraits, setSelectedTraits] = useState<string[]>([])

  const pointsUsed = (stats.strength - STAT_BASE) + (stats.cunning - STAT_BASE) + (stats.authority - STAT_BASE)
  const pointsRemaining = STAT_POOL - pointsUsed

  function adjustStat(stat: keyof typeof stats, delta: number) {
    const next = stats[stat] + delta
    if (next < STAT_BASE) return
    if (next > STAT_MAX) return
    if (delta > 0 && pointsRemaining <= 0) return
    setStats((s) => ({ ...s, [stat]: next }))
  }

  function toggleTrait(trait: string) {
    setSelectedTraits((prev) => {
      if (prev.includes(trait)) return prev.filter((t) => t !== trait)
      if (prev.length >= 2) return prev
      return [...prev, trait]
    })
  }

  function confirmName() {
    const trimmed = name.trim() || 'Valdric'
    dispatch(gameActions.setProtagonistName(trimmed))
    setCharName(trimmed)
    setStep('lore')
  }

  function confirmLore() {
    setStep('character')
  }

  function beginGame() {
    const finalName = charName.trim() || name.trim() || 'Valdric'
    dispatch(gameActions.setPlayerCharacter({ name: finalName, stats, traits: selectedTraits }))
    dispatch(gameActions.setProtagonistName(finalName))
    dispatch(gameActions.setHasSeenOpening(true))
    navigate('/dashboard')
  }

  return (
    <div className="opening-screen">
      <div className="opening-content">

        {/* Valdenmoor skyline — dark fantasy city silhouette */}
        <svg
          viewBox="0 0 400 120"
          xmlns="http://www.w3.org/2000/svg"
          className="opening-skyline"
          aria-hidden="true"
        >
          {/* Sky gradient */}
          <defs>
            <radialGradient id="moonGlow" cx="72%" cy="30%" r="18%">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.22"/>
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="400" height="120" fill="#0d0a07"/>
          <ellipse cx="288" cy="36" rx="18" ry="18" fill="url(#moonGlow)"/>
          {/* Moon disc */}
          <circle cx="288" cy="36" r="10" fill="#1e160d" stroke="#c9a84c" strokeWidth="1.2" opacity="0.85"/>

          {/* Far background spires */}
          <rect x="30" y="60" width="6" height="50" fill="#161009"/>
          <polygon points="30,60 33,48 36,60" fill="#161009"/>
          <rect x="55" y="52" width="8" height="58" fill="#161009"/>
          <polygon points="55,52 59,36 63,52" fill="#161009"/>
          {/* Broken spire — top snapped */}
          <rect x="80" y="58" width="7" height="52" fill="#161009"/>
          <polygon points="80,58 83.5,44 87,58" fill="#161009"/>
          <rect x="82" y="38" width="3" height="10" fill="#161009" transform="rotate(-18,83.5,43)"/>

          {/* Gate wall — center feature */}
          <rect x="130" y="72" width="140" height="48" fill="#1e160d"/>
          {/* Battlements */}
          <rect x="130" y="65" width="10" height="12" fill="#1e160d"/>
          <rect x="146" y="65" width="10" height="12" fill="#1e160d"/>
          <rect x="162" y="65" width="10" height="12" fill="#1e160d"/>
          <rect x="222" y="65" width="10" height="12" fill="#1e160d"/>
          <rect x="238" y="65" width="10" height="12" fill="#1e160d"/>
          <rect x="254" y="65" width="10" height="12" fill="#1e160d"/>
          {/* Gate arch */}
          <path d="M178 120 L178 92 Q200 78 222 92 L222 120Z" fill="#0d0a07"/>
          {/* Warm glow through gate */}
          <ellipse cx="200" cy="108" rx="14" ry="6" fill="#c9a84c" opacity="0.07"/>

          {/* Left tower */}
          <rect x="120" y="42" width="22" height="78" fill="#1e160d"/>
          <rect x="116" y="38" width="30" height="8" fill="#261c11"/>
          <rect x="118" y="30" width="8" height="14" fill="#1e160d"/>
          <rect x="130" y="30" width="8" height="14" fill="#1e160d"/>

          {/* Right tower */}
          <rect x="258" y="42" width="22" height="78" fill="#1e160d"/>
          <rect x="254" y="38" width="30" height="8" fill="#261c11"/>
          <rect x="256" y="30" width="8" height="14" fill="#1e160d"/>
          <rect x="268" y="30" width="8" height="14" fill="#1e160d"/>

          {/* Far right spires */}
          <rect x="320" y="55" width="8" height="55" fill="#161009"/>
          <polygon points="320,55 324,40 328,55" fill="#161009"/>
          <rect x="348" y="62" width="6" height="48" fill="#161009"/>
          <polygon points="348,62 351,50 354,62" fill="#161009"/>
          {/* Broken far right */}
          <rect x="370" y="58" width="7" height="52" fill="#161009"/>
          <polygon points="370,58 373.5,46 377,58" fill="#161009"/>
          <rect x="372" y="42" width="3" height="8" fill="#161009" transform="rotate(12,373.5,46)"/>

          {/* Ground line */}
          <rect x="0" y="115" width="400" height="5" fill="#1e160d"/>
          {/* Subtle gold horizon glow */}
          <rect x="0" y="113" width="400" height="2" fill="#c9a84c" opacity="0.12"/>
        </svg>

        <p className="opening-house-name">House Valdris</p>
        {step === 'name' ? (
          <>
            <div className="opening-intro-row">
              {/* Marion Vale portrait — use real image with SVG fallback */}
              <div
                className="npc-portrait-placeholder npc-portrait-placeholder--primary opening-marion-portrait"
                aria-label="Marion Vale"
              >
                <img
                  src="/portraits/marion-vale.jpg"
                  alt="Marion Vale"
                  className="npc-portrait-img"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('hidden');
                  }}
                />
                <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" className="npc-silhouette" hidden>
                  <ellipse cx="50" cy="28" rx="16" ry="18" fill="currentColor" opacity="0.6"/>
                  <path d="M28 32 Q50 15 72 32 Q68 50 50 52 Q32 50 28 32Z" fill="currentColor" opacity="0.5"/>
                  <path d="M22 55 Q50 48 78 55 L85 130 H15 Z" fill="currentColor" opacity="0.45"/>
                  <path d="M18 58 Q30 52 50 50 Q70 52 82 58 L80 72 Q65 65 50 64 Q35 65 20 72Z" fill="currentColor" opacity="0.55"/>
                </svg>
              </div>
              <p className="opening-text">
                Eighteen months since the Court moved against your family. Edric is dead. Mira is
                taken. Cael is in the ground. Marion Vale sits across from you in what remains of
                the administrative office — the one room the debt-claim seizure couldn't reach. She
                hasn't said anything yet. She's waiting to see what you intend.
              </p>
            </div>
            <div className="opening-name-field">
              <label className="opening-name-label" htmlFor="protagonist-name">
                Your name
              </label>
              <input
                className="opening-name-input"
                id="protagonist-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmName()
                }}
              />
            </div>
            <button className="opening-confirm action-button" onClick={confirmName} type="button">
              Continue →
            </button>
          </>
        ) : step === 'lore' ? (
          <>
            <div className="household-summary">
              <p>House Valdris. Your grandfather built it from nothing. Your father maintained it until the night of the Compact's purge. Edric is dead. Cael is in the ground. Mira — taken, not confirmed dead, which is the only mercy in any of this.</p>
              <p>Marion Vale remained. She had no reason to — the wages stopped weeks ago, the house name meant nothing in the city. She stayed anyway.</p>
              <p>Three days later, Ida Rhys knocked on the door. She said she heard you were hiring. She may be lying about something smaller.</p>
              <p>Two rooms in The Pale. A locked basement. A view of three competing flags.</p>
              <p>Mira is still out there. That is the only thing in the ledger that matters more than the debt.</p>
              <p>The ledger is yours.</p>
            </div>
            <button className="opening-confirm action-button" onClick={confirmLore} type="button">
              Continue →
            </button>
          </>
        ) : (
          <>
            <div className="character-creation">
              <h2 className="character-creation-title">Lord of House Valdris</h2>
              <div className="opening-name-field">
                <label className="opening-name-label" htmlFor="char-name">
                  Your name, Lord
                </label>
                <input
                  className="opening-name-input"
                  id="char-name"
                  type="text"
                  placeholder="Enter your name, Lord..."
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                />
              </div>

              <div className="stat-allocation">
                <p className="stat-allocation-header">
                  Distribute your nature — <strong>{pointsRemaining}</strong> point{pointsRemaining !== 1 ? 's' : ''} remaining
                </p>
                {(['strength', 'cunning', 'authority'] as const).map((stat) => (
                  <div key={stat} className="stat-row">
                    <span className="stat-label" style={{ textTransform: 'capitalize' }}>{stat}</span>
                    <button
                      className="action-button action-button--secondary"
                      onClick={() => adjustStat(stat, -1)}
                      disabled={stats[stat] <= STAT_BASE}
                      type="button"
                      aria-label={`Decrease ${stat}`}
                    >−</button>
                    <span className="stat-value">{stats[stat]}</span>
                    <button
                      className="action-button action-button--secondary"
                      onClick={() => adjustStat(stat, 1)}
                      disabled={pointsRemaining <= 0 || stats[stat] >= STAT_MAX}
                      type="button"
                      aria-label={`Increase ${stat}`}
                    >+</button>
                  </div>
                ))}
              </div>

              <div className="trait-selection">
                <p className="trait-selection-header">
                  Choose 2 traits — <strong>{selectedTraits.length}</strong>/2 selected
                </p>
                <div className="trait-grid">
                  {STARTING_TRAITS.map((trait) => (
                    <button
                      key={trait}
                      className={`trait-button${selectedTraits.includes(trait) ? ' trait-button--selected' : ''}`}
                      onClick={() => toggleTrait(trait)}
                      type="button"
                    >
                      {trait}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              className="opening-confirm action-button action-button--primary"
              onClick={beginGame}
              disabled={selectedTraits.length < 2}
              type="button"
            >
              Take the Ledger →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
