import type { GameState } from '../../domain/game/contracts'
import type {
  CorrespondenceMessage,
  CorrespondenceSensitivity,
} from '../../domain/correspondence/contracts'
import type { IntimacyStage } from '../../domain/relationships/contracts'

/**
 * Command: Generate and record private correspondence
 *
 * Pure function that creates a letter from sender to recipient based on
 * relationship context and sensitivity level.
 *
 * @param state - Current game state
 * @param fromId - Sender NPC/player ID
 * @param toId - Recipient NPC/player ID
 * @param text - Generated letter text
 * @param sensitivity - Sensitivity level of the correspondence
 * @param templateFamily - Optional template family identifier
 * @param modulesUsed - List of content modules used in generation
 * @param intimacyStageAtSend - Relationship stage at time of sending
 * @param isPlayerTarget - Whether recipient is the player
 * @returns Updated game state with new correspondence
 */
export function generateAndRecordCorrespondence(
  state: GameState,
  fromId: string,
  toId: string,
  text: string,
  sensitivity: CorrespondenceSensitivity,
  templateFamily?: string,
  modulesUsed: string[] = [],
  intimacyStageAtSend?: IntimacyStage,
  isPlayerTarget: boolean = false
): GameState {
  const newMessage: CorrespondenceMessage = {
    id: `letter-${crypto.randomUUID()}`,
    fromId,
    toId,
    sentOnDay: state.day,
    deliveredOnDay: null, // Will be set when processed
    text,
    modulesUsed,
    templateFamily,
    intimacyStageAtSend,
    sensitivity,
    status: 'sent',
    authenticity: 100,
    knownBy: [],
    interceptedBy: null,
    consequenceApplied: false,
    isPlayerTarget,
  }

  return {
    ...state,
    privateCorrespondence: [...state.privateCorrespondence, newMessage],
  }
}

/**
 * Command: Process mail delivery for a day
 *
 * Marks all 'sent' correspondence as 'delivered' for the current day.
 * Pure function - returns updated state.
 *
 * @param state - Current game state
 * @returns Updated game state with delivered letters
 */
export function processMailDelivery(state: GameState): GameState {
  const updatedCorrespondence = state.privateCorrespondence.map((msg) => {
    if (msg.status === 'sent' && msg.deliveredOnDay === null) {
      return {
        ...msg,
        status: 'delivered' as const,
        deliveredOnDay: state.day,
      }
    }
    return msg
  })

  return {
    ...state,
    privateCorrespondence: updatedCorrespondence,
  }
}

/**
 * Command: Intercept a letter
 *
 * Marks a letter as intercepted by a specific NPC/player.
 * The interceptor can now read or exploit the content.
 *
 * @param state - Current game state
 * @param messageId - ID of the letter to intercept
 * @param interceptorId - ID of the NPC/player intercepting
 * @returns Updated game state with intercepted letter
 */
export function applyInterception(
  state: GameState,
  messageId: string,
  interceptorId: string
): GameState {
  const updatedCorrespondence = state.privateCorrespondence.map((msg) => {
    if (msg.id === messageId && msg.status !== 'intercepted') {
      return {
        ...msg,
        status: 'intercepted' as const,
        interceptedBy: interceptorId,
        knownBy: msg.knownBy.includes(interceptorId)
          ? msg.knownBy
          : [...msg.knownBy, interceptorId],
      }
    }
    return msg
  })

  return {
    ...state,
    privateCorrespondence: updatedCorrespondence,
  }
}

/**
 * Command: Mark letter as read by someone
 *
 * Records that a specific NPC/player has read a letter.
 *
 * @param state - Current game state
 * @param messageId - ID of the letter
 * @param readerId - ID of the NPC/player reading
 * @returns Updated game state with read status
 */
export function applyReadLetter(
  state: GameState,
  messageId: string,
  readerId: string
): GameState {
  const updatedCorrespondence = state.privateCorrespondence.map((msg) => {
    if (msg.id === messageId && !msg.knownBy.includes(readerId)) {
      return {
        ...msg,
        knownBy: [...msg.knownBy, readerId],
      }
    }
    return msg
  })

  return {
    ...state,
    privateCorrespondence: updatedCorrespondence,
  }
}

/**
 * Command: Apply blackmail leverage from correspondence
 *
 * Uses compromising/intimate correspondence as blackmail leverage.
 * This is the exploitation path for discovered letters.
 *
 * @param state - Current game state
 * @param messageId - ID of the blackmail letter
 * @param holderId - NPC/player holding the letter
 * @param targetId - Target of the blackmail (the other party in the letter)
 * @param relationshipDelta - Relationship impact (negative for target)
 * @returns Updated game state with consequence applied
 */
export function applyBlackmailLeverage(
  state: GameState,
  messageId: string,
  _holderId: string,
  _targetId: string,
  _relationshipDelta: number
): GameState {
  const updatedCorrespondence = state.privateCorrespondence.map((msg) => {
    if (msg.id === messageId) {
      return {
        ...msg,
        consequenceApplied: true,
      }
    }
    return msg
  })

  // Relationship adjustment would be applied here via the relationship system
  // For now, we just mark the consequence as applied

  return {
    ...state,
    privateCorrespondence: updatedCorrespondence,
  }
}

/**
 * Command: Forge a letter
 *
 * Creates a forged copy of an existing message with reduced authenticity.
 *
 * @param state - Current game state
 * @param originalMessageId - ID of the message to forge
 * @param forgerId - ID of the NPC/player creating the forgery
 * @param forgedText - The forged text content
 * @param forgedFromId - Spoofed sender
 * @param forgedToId - Spoofed recipient
 * @returns Updated game state with forged letter
 */
export function applyForgery(
  state: GameState,
  originalMessageId: string,
  forgerId: string,
  forgedText: string,
  forgedFromId: string,
  forgedToId: string
): GameState {
  const original = state.privateCorrespondence.find(
    (msg) => msg.id === originalMessageId
  )

  if (!original) {
    return state
  }

  const forgedMessage: CorrespondenceMessage = {
    id: `letter-${crypto.randomUUID()}`,
    fromId: forgedFromId,
    toId: forgedToId,
    sentOnDay: state.day,
    deliveredOnDay: null,
    text: forgedText,
    modulesUsed: [...original.modulesUsed, 'forged'],
    templateFamily: original.templateFamily,
    intimacyStageAtSend: original.intimacyStageAtSend,
    sensitivity: original.sensitivity,
    status: 'forged',
    authenticity: 45, // Forgery detection threshold
    knownBy: [forgerId],
    interceptedBy: null,
    consequenceApplied: false,
    isPlayerTarget: forgedToId === 'player',
  }

  return {
    ...state,
    privateCorrespondence: [...state.privateCorrespondence, forgedMessage],
  }
}

/**
 * Selector helper: Get all correspondence for a specific party
 */
export function getCorrespondenceForParty(
  correspondence: CorrespondenceMessage[],
  partyId: string
): CorrespondenceMessage[] {
  return correspondence.filter(
    (msg) => msg.fromId === partyId || msg.toId === partyId
  )
}

/**
 * Selector helper: Get unread correspondence for a party
 */
export function getUnreadCorrespondence(
  correspondence: CorrespondenceMessage[],
  partyId: string
): CorrespondenceMessage[] {
  return correspondence.filter(
    (msg) =>
      (msg.fromId === partyId || msg.toId === partyId) &&
      !msg.knownBy.includes(partyId)
  )
}
