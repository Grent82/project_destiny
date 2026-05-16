import type { GameState } from '../../domain/game/contracts'
import type { NpcPairingPolicy } from '../../domain/game/contracts'
import { appendActivityLogEntry } from './activityLog'

const POLICY_LOG: Record<NpcPairingPolicy, string> = {
  open: 'The house does not intervene in personal bonds.',
  discouraged: 'Deep bonds are expected to remain private and uncomplicated.',
  forbidden: 'The house requires professional distance between its members.',
}

export function setNpcPairingPolicy(state: GameState, policy: NpcPairingPolicy): GameState {
  if (state.house.npcPairingPolicy === policy) return state
  const next: GameState = {
    ...state,
    house: { ...state.house, npcPairingPolicy: policy },
  }
  return appendActivityLogEntry(next, 'system', POLICY_LOG[policy])
}
