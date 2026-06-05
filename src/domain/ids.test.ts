/**
 * Type-safety demonstration for branded entity ID types.
 *
 * These tests verify the compile-time behaviour described in destiny-gsv5:
 * "passing an NpcId where a QuestId is expected produces a TypeScript error".
 *
 * Runtime assertions are trivial (branded types are transparent at runtime);
 * the real test is that `pnpm typecheck` passes with the @ts-expect-error
 * annotations in place — meaning TypeScript does reject the wrong category.
 */

import { describe, it, expect } from 'vitest'
import {
  type NpcId,
  type QuestId,
  type FactionId,
  type DistrictId,
  type EventId,
  type TitleId,
  type RoomId,
  asNpcId,
  asQuestId,
  asFactionId,
  asDistrictId,
  asEventId,
  asTitleId,
  asRoomId,
} from './ids'

// ── Helpers used only for type checking ──────────────────────────────────────

function requireNpcId(_id: NpcId): void {}
function requireQuestId(_id: QuestId): void {}
function requireFactionId(_id: FactionId): void {}
function requireDistrictId(_id: DistrictId): void {}
function requireEventId(_id: EventId): void {}
function requireTitleId(_id: TitleId): void {}
function requireRoomId(_id: RoomId): void {}

// ── Type-safety tests ─────────────────────────────────────────────────────────

describe('branded ID types', () => {
  it('accepts correctly branded values', () => {
    const npcId = asNpcId('npc-ida-rhys')
    const questId = asQuestId('quest-gilded-favor')
    const factionId = asFactionId('faction-compact')
    const districtId = asDistrictId('district-grey-market')
    const eventId = asEventId('event-city-crisis')
    const titleId = asTitleId('title-steward')
    const roomId = asRoomId('room-barracks')

    // These must all compile without error
    requireNpcId(npcId)
    requireQuestId(questId)
    requireFactionId(factionId)
    requireDistrictId(districtId)
    requireEventId(eventId)
    requireTitleId(titleId)
    requireRoomId(roomId)

    expect(npcId).toBe('npc-ida-rhys')
    expect(questId).toBe('quest-gilded-favor')
    expect(factionId).toBe('faction-compact')
  })

  it('rejects cross-category assignments at compile time', () => {
    const npcId = asNpcId('npc-ida-rhys')
    const questId = asQuestId('quest-gilded-favor')
    const factionId = asFactionId('faction-compact')

    // Each line below must be flagged by TypeScript.
    // @ts-expect-error QuestId is not assignable to NpcId
    requireNpcId(questId)

    // @ts-expect-error NpcId is not assignable to QuestId
    requireQuestId(npcId)

    // @ts-expect-error FactionId is not assignable to NpcId
    requireNpcId(factionId)

    // @ts-expect-error NpcId is not assignable to FactionId
    requireFactionId(npcId)

    // Runtime values are identical (zero-cost at runtime)
    expect(npcId as string).toBe('npc-ida-rhys')
    expect(questId as string).toBe('quest-gilded-favor')
  })

  it('rejects plain strings at compile time when branded type is required', () => {
    const plainString: string = 'npc-ida-rhys'

    // @ts-expect-error plain string is not assignable to NpcId
    requireNpcId(plainString)

    // The cast helper is the approved way to cross the trust boundary
    requireNpcId(asNpcId(plainString))
    expect(asNpcId(plainString) as string).toBe(plainString)
  })

  it('asXxx helpers return identity at runtime', () => {
    const raw = 'test-id'
    expect(asNpcId(raw)).toBe(raw)
    expect(asQuestId(raw)).toBe(raw)
    expect(asFactionId(raw)).toBe(raw)
    expect(asDistrictId(raw)).toBe(raw)
    expect(asEventId(raw)).toBe(raw)
    expect(asTitleId(raw)).toBe(raw)
    expect(asRoomId(raw)).toBe(raw)
  })
})
