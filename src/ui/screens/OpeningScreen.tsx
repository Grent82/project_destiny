import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Attributes, Skills, Traits } from '../../domain/npc/contracts'
import { gameActions } from '../../application'
import { useAppDispatch } from '../app/hooks'

// ── Background archetypes ────────────────────────────────────────────────────

interface Background {
  id: string
  title: string
  tagline: string
  description: string
  attributes: Attributes
  skills: Skills
}

const BACKGROUNDS: Background[] = [
  {
    id: 'blade',
    title: 'The Blade',
    tagline: 'You kept the family alive with your hands.',
    description: 'Your father kept you out of the ledgers and in the training yard. It was not cruelty — he knew what was coming. High might, endurance, and combat skills.',
    attributes: { might: 65, agility: 60, endurance: 65, intellect: 35, perception: 45, presence: 40, resolve: 50 },
    skills: { melee: 65, ranged: 45, survival: 55, security: 40, medicine: 20, administration: 15, engineering: 15, negotiation: 15, crafting: 20, performance: 15, academics: 15, intrigue: 25 },
  },
  {
    id: 'schemer',
    title: 'The Schemer',
    tagline: 'You read every letter that was never meant for you.',
    description: "Your education was unconventional — part formal, part espionage. You understood the Compact's politics years before it moved against you. High intellect, perception, and intrigue skills.",
    attributes: { might: 30, agility: 50, endurance: 40, intellect: 65, perception: 65, presence: 50, resolve: 55 },
    skills: { melee: 20, ranged: 25, survival: 20, security: 30, medicine: 25, administration: 55, engineering: 30, negotiation: 50, crafting: 20, performance: 30, academics: 60, intrigue: 65 },
  },
  {
    id: 'voice',
    title: 'The Voice',
    tagline: 'Rooms changed when you walked into them.',
    description: 'You were the face of House Valdris at every court function while your father worked the back channels. Alliances, marriages, social contracts — yours to manage. High presence, resolve, and negotiation skills.',
    attributes: { might: 35, agility: 45, endurance: 45, intellect: 55, perception: 50, presence: 70, resolve: 65 },
    skills: { melee: 20, ranged: 20, survival: 25, security: 35, medicine: 35, administration: 55, engineering: 20, negotiation: 65, crafting: 20, performance: 65, academics: 45, intrigue: 40 },
  },
]

// ── Personality traits ───────────────────────────────────────────────────────

const TRAIT_OPTIONS: { key: keyof Traits; label: string; description: string }[] = [
  { key: 'discipline',   label: 'Disciplined',  description: 'Steady under pressure. NPCs under your command hold longer.' },
  { key: 'ambition',     label: 'Ambitious',    description: 'You push harder than is wise. Bonus renown on every success.' },
  { key: 'empathy',      label: 'Empathetic',   description: 'You notice when people are suffering. Loyalty decays more slowly.' },
  { key: 'ruthlessness', label: 'Ruthless',     description: 'You do what has to be done. Contracts pay more; factions trust less.' },
  { key: 'prudence',     label: 'Prudent',      description: 'You measure twice. Fewer critical failures in high-risk operations.' },
  { key: 'curiosity',    label: 'Curious',      description: 'You ask questions others ignore. Better investigation outcomes.' },
  { key: 'dominance',    label: 'Dominant',     description: 'Authority reads clearly in your manner. Council votes weight heavier.' },
  { key: 'loyalty',      label: 'Loyal',        description: "You do not abandon your people. Marion's starting bond is stronger." },
  { key: 'vanity',       label: 'Vain',         description: 'Reputation matters to you. Renown gains are faster, losses sting more.' },
  { key: 'zeal',         label: 'Zealous',      description: 'You commit fully or not at all. Extremes of outcome on every mission.' },
]

const TRAIT_SELECTED_VALUE = 70
const TRAIT_DEFAULT_VALUE = 35

function buildTraits(selected: (keyof Traits)[]): Traits {
  const base: Traits = {
    discipline: TRAIT_DEFAULT_VALUE, ambition: TRAIT_DEFAULT_VALUE, empathy: TRAIT_DEFAULT_VALUE,
    ruthlessness: TRAIT_DEFAULT_VALUE, prudence: TRAIT_DEFAULT_VALUE, curiosity: TRAIT_DEFAULT_VALUE,
    dominance: TRAIT_DEFAULT_VALUE, loyalty: TRAIT_DEFAULT_VALUE, vanity: TRAIT_DEFAULT_VALUE, zeal: TRAIT_DEFAULT_VALUE,
  }
  for (const key of selected) base[key] = TRAIT_SELECTED_VALUE
  return base
}

// ── Component ────────────────────────────────────────────────────────────────

export function OpeningScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [step, setStep] = useState<'name' | 'lore' | 'character'>('name')

  const [selectedBackground, setSelectedBackground] = useState<string | null>(null)
  const [selectedTraitKeys, setSelectedTraitKeys] = useState<(keyof Traits)[]>([])

  function toggleTrait(key: keyof Traits) {
    setSelectedTraitKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= 2) return prev
      return [...prev, key]
    })
  }

  function confirmName() {
    const trimmed = name.trim() || 'Valdric'
    dispatch(gameActions.setProtagonistName(trimmed))
    setStep('lore')
  }

  function confirmLore() {
    setStep('character')
  }

  function beginGame() {
    const bg = BACKGROUNDS.find((b) => b.id === selectedBackground)
    if (!bg || selectedTraitKeys.length < 2) return
    const finalName = name.trim() || 'Valdric'
    dispatch(gameActions.setPlayerCharacter({
      name: finalName,
      attributes: bg.attributes,
      skills: bg.skills,
      traits: buildTraits(selectedTraitKeys),
    }))
    dispatch(gameActions.setProtagonistName(finalName))
    dispatch(gameActions.setHasSeenOpening(true))
    navigate('/dashboard')
  }

  const canBegin = selectedBackground !== null && selectedTraitKeys.length === 2

  return (
    <div className="opening-screen">
      <div className="opening-content">

        {/* Valdenmoor skyline */}
        <svg viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" className="opening-skyline" aria-hidden="true">
          <defs>
            <radialGradient id="moonGlow" cx="72%" cy="30%" r="18%">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.22"/>
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="400" height="120" fill="#0d0a07"/>
          <ellipse cx="288" cy="36" rx="18" ry="18" fill="url(#moonGlow)"/>
          <circle cx="288" cy="36" r="10" fill="#1e160d" stroke="#c9a84c" strokeWidth="1.2" opacity="0.85"/>
          <rect x="30" y="60" width="6" height="50" fill="#161009"/>
          <polygon points="30,60 33,48 36,60" fill="#161009"/>
          <rect x="55" y="52" width="8" height="58" fill="#161009"/>
          <polygon points="55,52 59,36 63,52" fill="#161009"/>
          <rect x="80" y="58" width="7" height="52" fill="#161009"/>
          <polygon points="80,58 83.5,44 87,58" fill="#161009"/>
          <rect x="82" y="38" width="3" height="10" fill="#161009" transform="rotate(-18,83.5,43)"/>
          <rect x="130" y="72" width="140" height="48" fill="#1e160d"/>
          <rect x="130" y="65" width="10" height="12" fill="#1e160d"/>
          <rect x="146" y="65" width="10" height="12" fill="#1e160d"/>
          <rect x="162" y="65" width="10" height="12" fill="#1e160d"/>
          <rect x="222" y="65" width="10" height="12" fill="#1e160d"/>
          <rect x="238" y="65" width="10" height="12" fill="#1e160d"/>
          <rect x="254" y="65" width="10" height="12" fill="#1e160d"/>
          <path d="M178 120 L178 92 Q200 78 222 92 L222 120Z" fill="#0d0a07"/>
          <ellipse cx="200" cy="108" rx="14" ry="6" fill="#c9a84c" opacity="0.07"/>
          <rect x="120" y="42" width="22" height="78" fill="#1e160d"/>
          <rect x="116" y="38" width="30" height="8" fill="#261c11"/>
          <rect x="118" y="30" width="8" height="14" fill="#1e160d"/>
          <rect x="130" y="30" width="8" height="14" fill="#1e160d"/>
          <rect x="258" y="42" width="22" height="78" fill="#1e160d"/>
          <rect x="254" y="38" width="30" height="8" fill="#261c11"/>
          <rect x="256" y="30" width="8" height="14" fill="#1e160d"/>
          <rect x="268" y="30" width="8" height="14" fill="#1e160d"/>
          <rect x="320" y="55" width="8" height="55" fill="#161009"/>
          <polygon points="320,55 324,40 328,55" fill="#161009"/>
          <rect x="348" y="62" width="6" height="48" fill="#161009"/>
          <polygon points="348,62 351,50 354,62" fill="#161009"/>
          <rect x="370" y="58" width="7" height="52" fill="#161009"/>
          <polygon points="370,58 373.5,46 377,58" fill="#161009"/>
          <rect x="372" y="42" width="3" height="8" fill="#161009" transform="rotate(12,373.5,46)"/>
          <rect x="0" y="115" width="400" height="5" fill="#1e160d"/>
          <rect x="0" y="113" width="400" height="2" fill="#c9a84c" opacity="0.12"/>
        </svg>

        <p className="opening-house-name">House Valdris</p>

        {step === 'name' ? (
          <>
            <div className="opening-intro-row">
              <div
                className="npc-portrait-placeholder npc-portrait-placeholder--primary opening-marion-portrait"
                aria-label="Marion Vale"
              >
                <img
                  src="/portraits/marion-vale.jpg"
                  alt="Marion Vale"
                  className="npc-portrait-img"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    const svg = e.currentTarget.nextElementSibling as HTMLElement | null
                    if (svg) svg.style.display = 'block'
                  }}
                />
                <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" className="npc-silhouette" style={{ display: 'none' }}>
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
              <label className="opening-name-label" htmlFor="protagonist-name">Your name</label>
              <input
                className="opening-name-input"
                id="protagonist-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmName() }}
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
              <div className="char-section">
                <p className="char-section-label">Who were you, before all this?</p>
                <div className="background-grid">
                  {BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      className={`background-card${selectedBackground === bg.id ? ' background-card--selected' : ''}`}
                      onClick={() => setSelectedBackground(bg.id)}
                      type="button"
                    >
                      <span className="background-card-title">{bg.title}</span>
                      <span className="background-card-tagline">{bg.tagline}</span>
                      <span className="background-card-desc">{bg.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="char-section">
                <p className="char-section-label">
                  What drives you — <strong>{selectedTraitKeys.length}</strong>/2 chosen
                </p>
                {selectedTraitKeys.length >= 2 && (
                  <p className="char-hint">Click a chosen trait to deselect it.</p>
                )}
                <div className="trait-grid">
                  {TRAIT_OPTIONS.map(({ key, label, description }) => (
                    <button
                      key={key}
                      className={`trait-card${selectedTraitKeys.includes(key) ? ' trait-card--selected' : ''}`}
                      onClick={() => toggleTrait(key)}
                      type="button"
                      disabled={selectedTraitKeys.length >= 2 && !selectedTraitKeys.includes(key)}
                      title={
                        selectedTraitKeys.length >= 2 && !selectedTraitKeys.includes(key)
                          ? 'Two traits already chosen. Deselect one to pick another.'
                          : undefined
                      }
                    >
                      <span className="trait-card-label">{label}</span>
                      <span className="trait-card-desc">{description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="opening-confirm action-button action-button--primary"
              onClick={beginGame}
              disabled={!canBegin}
              title={
                !canBegin
                  ? selectedBackground === null && selectedTraitKeys.length < 2
                    ? 'Choose a background and two traits to begin.'
                    : selectedBackground === null
                      ? 'Choose a background to begin.'
                      : 'Choose two traits to begin.'
                  : undefined
              }
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
