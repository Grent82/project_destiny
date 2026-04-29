import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { gameActions } from '../../application'
import { useAppDispatch } from '../app/hooks'

export function OpeningScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [step, setStep] = useState<'name' | 'lore'>('name')

  function confirmName() {
    const trimmed = name.trim() || 'Valdric'
    dispatch(gameActions.setProtagonistName(trimmed))
    setStep('lore')
  }

  function confirmLore() {
    dispatch(gameActions.setHasSeenOpening(true))
    navigate('/dashboard')
  }

  return (
    <div className="opening-screen">
      <div className="opening-content">
        <p className="opening-house-name">House Valdris</p>
        {step === 'name' ? (
          <>
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
                  if (e.key === 'Enter') confirmName()
                }}
              />
            </div>
            <button className="opening-confirm action-button" onClick={confirmName} type="button">
              Continue →
            </button>
          </>
        ) : (
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
              Take the Ledger →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
