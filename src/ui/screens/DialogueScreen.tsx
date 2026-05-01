import { useNavigate } from 'react-router-dom'

import { gameActions } from '../../application/store/gameSlice'
import { contentCatalog } from '../../application/content/contentCatalog'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import type { DialogueChoice, DialogueCondition } from '../../domain/dialogue/contracts'

export function DialogueScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const gameState = useAppSelector((state) => state.game)
  const { activeDialogueId, activeDialogueNodeId } = gameState

  const tree = activeDialogueId ? contentCatalog.dialoguesById.get(activeDialogueId) : null
  const node = tree && activeDialogueNodeId
    ? tree.nodes.find((n) => n.id === activeDialogueNodeId)
    : null

  const npcDef = tree ? contentCatalog.npcsById.get(tree.npcId) : null

  function meetsCondition(cond: DialogueCondition): boolean {
    switch (cond.type) {
      case 'dayMin': return gameState.day >= (cond.value as number)
      case 'dayMax': return gameState.day <= (cond.value as number)
      case 'debtPaid': return gameState.debtPaid === (cond.value as boolean)
      case 'minRenown': return gameState.playerCharacter.renown >= (cond.value as number)
      case 'minNpcTrust': {
        if (!cond.npcId) return true
        const key = buildRelationshipKey('player', cond.npcId)
        return (gameState.relationships[key]?.trust ?? 0) >= (cond.value as number)
      }
      case 'minNpcLoyalty': {
        if (!cond.npcId) return true
        const key = buildRelationshipKey('player', cond.npcId)
        return (gameState.relationships[key]?.loyalty ?? 0) >= (cond.value as number)
      }
      default: return true
    }
  }

  function handleLeave() {
    dispatch(gameActions.endDialogue())
    navigate(-1)
  }

  function handleChoice(choice: DialogueChoice) {
    if (choice.outcome) {
      if (choice.outcome.type === 'loyalty' && typeof choice.outcome.value === 'number') {
        dispatch(
          gameActions.adjustRelationship({
            fromId: 'player',
            toId: tree!.npcId,
            axis: 'loyalty',
            delta: choice.outcome.value,
          }),
        )
      }
    }

    if (choice.nextNodeId === null) {
      dispatch(gameActions.endDialogue())
      navigate(-1)
    } else {
      dispatch(gameActions.advanceDialogue({ nodeId: choice.nextNodeId }))
    }
  }

  if (!tree || !node) {
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

  const portraitId = tree.npcId.replace('npc-', '')
  const visibleChoices = node.choices.filter((c) => !c.condition || meetsCondition(c.condition))
  const isEndNode = visibleChoices.length === 0

  return (
    <section className="screen-panel">
      <p className="eyebrow">Dialogue</p>

      <div
        style={{
          display: 'flex',
          gap: '2rem',
          alignItems: 'flex-start',
          maxWidth: '640px',
          margin: '0 auto',
        }}
      >
        <div
          className="npc-portrait-placeholder"
          aria-hidden="true"
          style={{ flexShrink: 0, width: '100px', height: '130px' }}
        >
          <img
            src={`/portraits/${portraitId}.jpg`}
            alt={npcDef?.name ?? tree.npcId}
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

        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 0.75rem', fontFamily: 'var(--font-display)' }}>
            {npcDef?.name ?? tree.npcId}
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem',
              lineHeight: '1.6',
            }}
          >
            {node.text}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {!isEndNode &&
              visibleChoices.map((choice) => (
                <button
                  key={choice.id}
                  className="action-button"
                  type="button"
                  onClick={() => handleChoice(choice)}
                >
                  {choice.label}
                </button>
              ))}

            {isEndNode && (
              <button className="action-button" type="button" onClick={handleLeave}>
                Leave
              </button>
            )}

            {!isEndNode && (
              <button
                className="action-button"
                type="button"
                style={{ marginTop: '0.5rem', opacity: 0.6 }}
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
