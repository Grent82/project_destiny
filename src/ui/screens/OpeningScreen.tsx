import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { gameActions } from '../../application'
import { useAppDispatch } from '../app/hooks'

export function OpeningScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [name, setName] = useState('Valdric')

  function confirm() {
    const trimmed = name.trim() || 'Valdric'
    dispatch(gameActions.setProtagonistName(trimmed))
    dispatch(gameActions.setHasSeenOpening(true))
    navigate('/dashboard')
  }

  return (
    <div className="opening-screen">
      <div className="opening-content">
        <p className="opening-house-name">House Valdric</p>
        <p className="opening-text">
          Eighteen months since the Court moved against your family. Edric is dead. Mira is
          taken. Cael is in the ground. Marion Vale sits across from you in what remains of
          the administrative office — the one room the debt-claim seizure couldn't reach. She
          hasn't said anything yet. She's waiting to see what you intend.
        </p>
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
              if (e.key === 'Enter') confirm()
            }}
          />
        </div>
        <button className="opening-confirm action-button" onClick={confirm} type="button">
          Take stock →
        </button>
      </div>
    </div>
  )
}
