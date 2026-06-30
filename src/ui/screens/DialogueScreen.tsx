import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { gameActions } from '../../application/store/gameSlice'
import {
  selectActiveDialoguePresentation,
  type DialogueChoicePresentation,
} from '../../application/selectors/dialogue'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { VenueContextBanner } from './VenueContextBanner'
import { PortraitFallback } from '../components/PortraitFallback'

export function DialogueScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const presentation = useAppSelector(selectActiveDialoguePresentation)

  function handleLeave() {
    dispatch(gameActions.endDialogue())
    navigate(-1)
  }

  function handleChoice(choice: DialogueChoicePresentation) {
    dispatch(gameActions.selectDialogueChoice({ choiceId: choice.id }))
  }

  const hasExplicitLeaveChoice = useMemo(
    () => presentation?.choices.some((choice) => choice.kind === 'leave') ?? false,
    [presentation],
  )

  if (!presentation) {
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
            <PortraitFallback
              npcId={presentation.npcId}
              factionId={presentation.factionId}
              nameOverride={presentation.npcName}
              isPrimary={presentation.npcId === 'npc-marion-vale'}
              size="large"
            />

            <div className="dialogue-scene-copy">
              <p className="dialogue-scene-location">{presentation.sceneLocation}</p>
              <h1 className="dialogue-scene-speaker">{presentation.npcName}</h1>
              <p className="dialogue-scene-direction">{presentation.stageDirection}</p>
              <p className="dialogue-scene-line">{presentation.lineText}</p>
            </div>
          </div>

          <div className="dialogue-choice-list">
            {!isEndNode &&
              presentation.choices.map((choice) => (
                <button
                  key={choice.id}
                  className={`dialogue-choice-button dialogue-choice-button--${choice.kind}`}
                  type="button"
                  onClick={() => handleChoice(choice)}
                >
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
