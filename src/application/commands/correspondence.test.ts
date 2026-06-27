import { describe, it, expect } from 'vitest'
import {
  generateAndRecordCorrespondence,
  processMailDelivery,
  applyInterception,
  applyReadLetter,
  applyBlackmailLeverage,
  applyForgery,
  getCorrespondenceForParty,
  getUnreadCorrespondence,
} from './correspondence'
import { buildCorrespondenceKey, findCorrespondenceBetween, findBlackmailableCorrespondence } from '../../domain/correspondence/contracts'
import { initialStateWithIda } from './testFixtures'

describe('Correspondence Commands', () => {
  describe('generateAndRecordCorrespondence', () => {
    it('creates a new correspondence message with correct metadata', () => {
      const state = initialStateWithIda
      const result = generateAndRecordCorrespondence(
        state,
        'npc-test-sender',
        'npc-test-recipient',
        'Meine liebe Ida, ich denke an dich...',
        'intimate',
        'intimate-attraction',
        ['opening-intimate', 'attraction-confession'],
        'attachment',
        false
      )

      expect(result.privateCorrespondence).toHaveLength(1)
      const letter = result.privateCorrespondence[0]

      expect(letter.fromId).toBe('npc-test-sender')
      expect(letter.toId).toBe('npc-test-recipient')
      expect(letter.text).toBe('Meine liebe Ida, ich denke an dich...')
      expect(letter.sensitivity).toBe('intimate')
      expect(letter.templateFamily).toBe('intimate-attraction')
      expect(letter.modulesUsed).toHaveLength(2)
      expect(letter.sentOnDay).toBe(state.day)
      expect(letter.deliveredOnDay).toBeNull()
      expect(letter.authenticity).toBe(100)
      expect(letter.consequenceApplied).toBe(false)
      expect(letter.isPlayerTarget).toBe(false)
    })

    it('creates correspondence with mundane sensitivity', () => {
      const state = initialStateWithIda
      const result = generateAndRecordCorrespondence(
        state,
        'npc-sender',
        'player',
        'Hallo, wie geht es dir?',
        'mundane',
        'greeting',
        [],
        undefined,
        true
      )

      const letter = result.privateCorrespondence[0]
      expect(letter.sensitivity).toBe('mundane')
      expect(letter.isPlayerTarget).toBe(true)
    })

    it('creates compromising correspondence for blackmail scenarios', () => {
      const state = initialStateWithIda
      const result = generateAndRecordCorrespondence(
        state,
        'npc-blackmailer',
        'npc-target',
        'Ich weiß, was du getan hast. Bezahle oder ich erzähle es allen.',
        'compromising',
        'compromise-threat',
        ['opening-menacing', 'leverage-statement', 'ultimatum'],
        undefined,
        false
      )

      const letter = result.privateCorrespondence[0]
      expect(letter.sensitivity).toBe('compromising')
      expect(letter.modulesUsed).toHaveLength(3)
    })
  })

  describe('processMailDelivery', () => {
    it('marks sent correspondence as delivered', () => {
      const state = initialStateWithIda
      const stateWithLetter = generateAndRecordCorrespondence(
        state,
        'npc-sender',
        'npc-recipient',
        'Test letter',
        'mundane'
      )

      const result = processMailDelivery(stateWithLetter)
      const letter = result.privateCorrespondence[0]

      expect(letter.status).toBe('delivered')
      expect(letter.deliveredOnDay).toBe(stateWithLetter.day)
    })

    it('does not modify already delivered correspondence', () => {
      const state = initialStateWithIda
      const stateWithLetter = generateAndRecordCorrespondence(
        state,
        'npc-sender',
        'npc-recipient',
        'Test letter',
        'mundane'
      )
      const deliveredState = processMailDelivery(stateWithLetter)

      // Process again - should not change
      const result = processMailDelivery(deliveredState)
      const letter = result.privateCorrespondence[0]

      expect(letter.deliveredOnDay).toBe(state.day) // Not changed to new day
    })
  })

  describe('applyInterception', () => {
    it('marks letter as intercepted and records interceptor', () => {
      const state = initialStateWithIda
      const stateWithLetter = generateAndRecordCorrespondence(
        state,
        'npc-sender',
        'npc-recipient',
        'Secret letter',
        'compromising'
      )
      const letterId = stateWithLetter.privateCorrespondence[0].id

      const result = applyInterception(stateWithLetter, letterId, 'npc-interceptor')
      const letter = result.privateCorrespondence[0]

      expect(letter.status).toBe('intercepted')
      expect(letter.interceptedBy).toBe('npc-interceptor')
      expect(letter.knownBy).toContain('npc-interceptor')
    })

    it('adds interceptor to knownBy without duplicates', () => {
      const state = initialStateWithIda
      const stateWithLetter = generateAndRecordCorrespondence(
        state,
        'npc-sender',
        'npc-recipient',
        'Secret letter',
        'compromising'
      )
      const letterId = stateWithLetter.privateCorrespondence[0].id

      // Intercept twice by same person
      const result1 = applyInterception(stateWithLetter, letterId, 'npc-interceptor')
      const result2 = applyInterception(result1, letterId, 'npc-interceptor')

      const letter = result2.privateCorrespondence[0]
      expect(letter.knownBy.filter((k) => k === 'npc-interceptor')).toHaveLength(1)
    })
  })

  describe('applyReadLetter', () => {
    it('adds reader to knownBy list', () => {
      const state = initialStateWithIda
      const stateWithLetter = generateAndRecordCorrespondence(
        state,
        'npc-sender',
        'npc-recipient',
        'Private letter',
        'intimate'
      )
      const letterId = stateWithLetter.privateCorrespondence[0].id

      const result = applyReadLetter(stateWithLetter, letterId, 'npc-reader')
      const letter = result.privateCorrespondence[0]

      expect(letter.knownBy).toContain('npc-reader')
    })

    it('does not add duplicate readers', () => {
      const state = initialStateWithIda
      const stateWithLetter = generateAndRecordCorrespondence(
        state,
        'npc-sender',
        'npc-recipient',
        'Private letter',
        'intimate'
      )
      const letterId = stateWithLetter.privateCorrespondence[0].id

      const result1 = applyReadLetter(stateWithLetter, letterId, 'npc-reader')
      const result2 = applyReadLetter(result1, letterId, 'npc-reader')

      const letter = result2.privateCorrespondence[0]
      expect(letter.knownBy.filter((k) => k === 'npc-reader')).toHaveLength(1)
    })
  })

  describe('applyBlackmailLeverage', () => {
    it('marks correspondence consequence as applied', () => {
      const state = initialStateWithIda
      const stateWithLetter = generateAndRecordCorrespondence(
        state,
        'npc-holder',
        'npc-target',
        'Your secret is safe with me... for a price.',
        'compromising'
      )
      const letterId = stateWithLetter.privateCorrespondence[0].id

      const result = applyBlackmailLeverage(
        stateWithLetter,
        letterId
      )
      const letter = result.privateCorrespondence[0]

      expect(letter.consequenceApplied).toBe(true)
    })

    it('only affects the specified letter', () => {
      const state = initialStateWithIda
      const stateWithLetters = generateAndRecordCorrespondence(
        state,
        'npc-sender',
        'npc-recipient',
        'Letter 1',
        'mundane'
      )
      const stateWithTwoLetters = generateAndRecordCorrespondence(
        stateWithLetters,
        'npc-sender2',
        'npc-recipient2',
        'Letter 2',
        'compromising'
      )

      const letterId = stateWithTwoLetters.privateCorrespondence[1].id
      const result = applyBlackmailLeverage(
        stateWithTwoLetters,
        letterId
      )

      expect(result.privateCorrespondence[0].consequenceApplied).toBe(false)
      expect(result.privateCorrespondence[1].consequenceApplied).toBe(true)
    })
  })

  describe('applyForgery', () => {
    it('creates a forged letter with reduced authenticity', () => {
      const state = initialStateWithIda
      const stateWithLetter = generateAndRecordCorrespondence(
        state,
        'npc-original-sender',
        'npc-original-recipient',
        'Original message',
        'political',
        'political-alliance'
      )
      const letterId = stateWithLetter.privateCorrespondence[0].id

      const result = applyForgery(
        stateWithLetter,
        letterId,
        'npc-forger',
        'Forged message content',
        'npc-spoofed-sender',
        'npc-spoofed-recipient'
      )

      expect(result.privateCorrespondence).toHaveLength(2)
      const forged = result.privateCorrespondence[1]

      expect(forged.fromId).toBe('npc-spoofed-sender')
      expect(forged.toId).toBe('npc-spoofed-recipient')
      expect(forged.text).toBe('Forged message content')
      expect(forged.authenticity).toBe(45)
      expect(forged.knownBy).toContain('npc-forger')
      expect(forged.modulesUsed).toContain('forged')
    })

    it('copies template family and sensitivity from original', () => {
      const state = initialStateWithIda
      const stateWithLetter = generateAndRecordCorrespondence(
        state,
        'npc-sender',
        'npc-recipient',
        'Original',
        'intimate',
        'intimate-attraction'
      )
      const letterId = stateWithLetter.privateCorrespondence[0].id

      const result = applyForgery(
        stateWithLetter,
        letterId,
        'npc-forger',
        'Forged',
        'npc-sender',
        'npc-recipient'
      )

      const forged = result.privateCorrespondence[1]
      expect(forged.templateFamily).toBe('intimate-attraction')
      expect(forged.sensitivity).toBe('intimate')
    })

    it('returns unchanged state if original not found', () => {
      const state = initialStateWithIda
      const result = applyForgery(
        state,
        'non-existent-id',
        'npc-forger',
        'Forged message',
        'npc-sender',
        'npc-recipient'
      )

      expect(result.privateCorrespondence).toHaveLength(0)
    })
  })

  describe('getCorrespondenceForParty', () => {
    it('returns all correspondence involving a party', () => {
      const state = initialStateWithIda
      const state1 = generateAndRecordCorrespondence(
        state,
        'npc-a',
        'npc-b',
        'Letter 1',
        'mundane'
      )
      const letter1Id = state1.privateCorrespondence[0].id
      const state2 = generateAndRecordCorrespondence(
        state1,
        'npc-b',
        'npc-c',
        'Letter 2',
        'political'
      )
      const letter2Id = state2.privateCorrespondence[1].id
      const state3 = generateAndRecordCorrespondence(
        state2,
        'npc-d',
        'npc-b',
        'Letter 3',
        'intimate'
      )

      const correspondence = state3.privateCorrespondence
      const result = getCorrespondenceForParty(correspondence, 'npc-b')

      expect(result).toHaveLength(3)
      const resultIds = result.map((l) => l.id).sort()
      const expectedIds = [letter1Id, letter2Id, state3.privateCorrespondence[2].id].sort()
      expect(resultIds).toEqual(expectedIds)
    })
  })

  describe('getUnreadCorrespondence', () => {
    it('returns correspondence not yet known by the party', () => {
      const state = initialStateWithIda
      const state1 = generateAndRecordCorrespondence(
        state,
        'npc-sender',
        'npc-recipient',
        'Unread letter',
        'mundane'
      )
      const state2 = applyReadLetter(state1, state1.privateCorrespondence[0].id, 'npc-recipient')

      const state3 = generateAndRecordCorrespondence(
        state2,
        'npc-sender2',
        'npc-recipient',
        'Still unread',
        'political'
      )

      const correspondence = state3.privateCorrespondence
      const result = getUnreadCorrespondence(correspondence, 'npc-recipient')

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Still unread')
    })
  })

  describe('buildCorrespondenceKey', () => {
    it('creates consistent bidirectional keys', () => {
      const key1 = buildCorrespondenceKey('npc-a', 'npc-b')
      const key2 = buildCorrespondenceKey('npc-b', 'npc-a')

      expect(key1).toBe(key2)
      expect(key1).toBe('npc-a↔npc-b')
    })
  })

  describe('findCorrespondenceBetween', () => {
    it('finds correspondence in both directions', () => {
      const state = initialStateWithIda
      const state1 = generateAndRecordCorrespondence(
        state,
        'npc-a',
        'npc-b',
        'A to B',
        'mundane'
      )
      const state2 = generateAndRecordCorrespondence(
        state1,
        'npc-b',
        'npc-a',
        'B to A',
        'political'
      )
      const state3 = generateAndRecordCorrespondence(
        state2,
        'npc-a',
        'npc-c',
        'A to C',
        'mundane'
      )

      const result = findCorrespondenceBetween(
        state3.privateCorrespondence,
        'npc-a',
        'npc-b'
      )

      expect(result).toHaveLength(2)
    })
  })

  describe('findBlackmailableCorrespondence', () => {
    it('finds compromising and intimate correspondence without consequence', () => {
      const state = initialStateWithIda
      const state1 = generateAndRecordCorrespondence(
        state,
        'npc-holder',
        'npc-target',
        'Compromising content',
        'compromising'
      )
      const state2 = generateAndRecordCorrespondence(
        state1,
        'npc-holder2',
        'npc-target2',
        'Intimate content',
        'intimate'
      )
      const state3 = generateAndRecordCorrespondence(
        state2,
        'npc-holder3',
        'npc-target3',
        'Mundane content',
        'mundane'
      )

      const result = findBlackmailableCorrespondence(
        state3.privateCorrespondence,
        'npc-holder'
      )

      expect(result).toHaveLength(1)
      expect(result[0].sensitivity).toBe('compromising')
    })

    it('excludes correspondence with consequence already applied', () => {
      const state = initialStateWithIda
      const state1 = generateAndRecordCorrespondence(
        state,
        'npc-holder',
        'npc-target',
        'Compromising content',
        'compromising'
      )
      const letterId = state1.privateCorrespondence[0].id
      const state2 = applyBlackmailLeverage(state1, letterId)

      const result = findBlackmailableCorrespondence(
        state2.privateCorrespondence,
        'npc-holder'
      )

      expect(result).toHaveLength(0)
    })

    it('excludes low authenticity forgeries', () => {
      const state = initialStateWithIda
      const state1 = generateAndRecordCorrespondence(
        state,
        'npc-holder',
        'npc-target',
        'Compromising content',
        'compromising'
      )
      const letterId = state1.privateCorrespondence[0].id
      const state2 = applyForgery(
        state1,
        letterId,
        'npc-forger',
        'Forged compromising content',
        'npc-holder',
        'npc-target'
      )

      // Forgery has authenticity 45, below 80 threshold
      const result = findBlackmailableCorrespondence(
        state2.privateCorrespondence,
        'npc-forger'
      )

      expect(result).toHaveLength(0)
    })
  })
})
