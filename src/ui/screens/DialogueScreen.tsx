import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { gameActions } from '../../application/store/gameSlice'
import {
  selectActiveDialoguePresentation,
  type DialogueChoicePresentation,
} from '../../application/selectors/dialogue'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { VenueContextBanner } from './VenueContextBanner'
import { PortraitFallback } from '../components/PortraitFallback'
import { hasPortraitAvailable } from '../components/portraitUtils'

type DialogueBeat = {
  choiceLabel: string
  effectNotes: string[]
  kind: DialogueChoicePresentation['kind']
}

function DialogueBeatPanel(props: { beat: DialogueBeat; title: string }) {
  const { beat, title } = props

  return (
    <aside className="dialogue-shift-panel" aria-label={title}>
      <p className="dialogue-shift-eyebrow">{title}</p>
      <p className="dialogue-shift-choice">{beat.choiceLabel}</p>
      <ul className="dialogue-shift-list">
        {beat.effectNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <span className={`dialogue-choice-kind-badge dialogue-choice-kind-badge--${beat.kind}`}>
        {beat.kind}
      </span>
    </aside>
  )
}

export function DialogueScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const presentation = useAppSelector(selectActiveDialoguePresentation)
  const [recentBeat, setRecentBeat] = useState<DialogueBeat | null>(null)
  const [closingBeat, setClosingBeat] = useState<DialogueBeat | null>(null)

  function handleLeave() {
    setRecentBeat(null)
    setClosingBeat(null)
    dispatch(gameActions.endDialogue())
    navigate(-1)
  }

  function handleChoice(choice: DialogueChoicePresentation) {
    const beat = {
      choiceLabel: choice.label,
      effectNotes: choice.effectNotes,
      kind: choice.kind,
    }

    if (choice.nextNodeId === null) {
      setClosingBeat(beat)
      setRecentBeat(null)
    } else {
      setRecentBeat(beat)
      setClosingBeat(null)
    }

    dispatch(gameActions.selectDialogueChoice({ choiceId: choice.id }))
  }

  const hasExplicitLeaveChoice = useMemo(
    () => presentation?.choices.some((choice) => choice.kind === 'leave') ?? false,
    [presentation],
  )

  if (!presentation) {
    if (closingBeat) {
      return (
        <section className="screen-panel">
          <p className="eyebrow">Dialogue</p>
          <h1>The exchange closes.</h1>
          <p className="summary">
            The room settles after the last answer. What changed is entered below before you step away.
          </p>
          <DialogueBeatPanel beat={closingBeat} title="Conversation shift" />
          <button className="action-button" type="button" onClick={handleLeave}>
            Leave
          </button>
        </section>
      )
    }

    return (
      <section className="screen-panel">
        <p className="eyebrow">Dialogue</p>
        <h1>No active conversation.</h1>
        <button className="action-button" type="button" onClick={handleLeave}>
          Leave
        </button>
      </section>
    )
  }

  const isEndNode = presentation.choices.length === 0

  return (
    <section className="screen-panel">
      <p className="eyebrow">Dialogue</p>
      <VenueContextBanner />

      <div className="dialogue-scene-shell">
        <div className="dialogue-scene-column">
          <div className="dialogue-scene-card">
            {hasPortraitAvailable(presentation.npcId) ? (
              <div className="dialogue-scene-portrait npc-portrait-placeholder" aria-hidden="true">
                <img
                  src={presentation.portraitSrc ?? ''}
                  alt={presentation.npcName}
                  className="npc-portrait-img"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    ;(e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('hidden')
                  }}
                />
                <svg
                  viewBox="0 0 100 130"
                  xmlns="http://www.w3.org/2000/svg"
                  className="npc-silhouette"
                  style={{ display: 'none' }}
                >
                  <ellipse cx="50" cy="28" rx="16" ry="18" fill="currentColor" opacity="0.6" />
                  <path
                    d="M28 32 Q50 15 72 32 Q68 50 50 52 Q32 50 28 32Z"
                    fill="currentColor"
                    opacity="0.5"
                  />
                  <path d="M22 55 Q50 48 78 55 L85 130 H15 Z" fill="currentColor" opacity="0.45" />
                  <path
                    d="M18 58 Q30 52 50 50 Q70 52 82 58 L80 72 Q65 65 50 64 Q35 65 20 72Z"
                    fill="currentColor"
                    opacity="0.55"
                  />
                </svg>
              </div>
            ) : (
              <PortraitFallback
                npcId={presentation.npcId}
                factionId={presentation.factionId}
                nameOverride={presentation.npcName}
                isPrimary={presentation.npcId === 'npc-marion-vale'}
                size="large"
              />
            )}

            <div className="dialogue-scene-copy">
              <p className="dialogue-scene-location">{presentation.sceneLocation}</p>
              <h1 className="dialogue-scene-speaker">{presentation.npcName}</h1>
              <p className="dialogue-scene-direction">{presentation.stageDirection}</p>
              <p className="dialogue-scene-line">{presentation.lineText}</p>
            </div>
          </div>

          {recentBeat && <DialogueBeatPanel beat={recentBeat} title="Conversation shift" />}

          <div className="dialogue-choice-list">
            {!isEndNode &&
              presentation.choices.map((choice) => (
                <button
                  key={choice.id}
                  className={`dialogue-choice-button dialogue-choice-button--${choice.kind}`}
                  type="button"
                  onClick={() => handleChoice(choice)}
                >
                  <span className={`dialogue-choice-kind-badge dialogue-choice-kind-badge--${choice.kind}`}>
                    {choice.kind}
                  </span>
                  <span className="dialogue-choice-label">{choice.label}</span>
                  <span className="dialogue-choice-preview">{choice.effectNotes[0]}</span>
                </button>
              ))}

            {isEndNode && (
              <button className="action-button" type="button" onClick={handleLeave}>
                Leave
              </button>
            )}

            {!isEndNode && !hasExplicitLeaveChoice && (
              <button
                className="action-button action-button--ghost"
                type="button"
                onClick={handleLeave}
              >
                Leave
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
