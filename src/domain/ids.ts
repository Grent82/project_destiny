/**
 * Branded ID types for all entity categories.
 *
 * These are zero-runtime-cost type wrappers. At runtime every value is still a
 * plain string; the brand only exists in TypeScript's type system to prevent
 * accidentally passing, e.g., a QuestId where an NpcId is expected.
 *
 * Usage:
 *   - ID constants in src/application/content/ids/ cast to the correct brand.
 *   - Domain functions that deal with a specific category of ID should accept
 *     the narrower branded type, not the wider `string`.
 *   - Values read from GameState (Zod schemas still infer `string`) can be cast
 *     with the type-guard helpers below when crossing a typed boundary.
 */

declare const __brand: unique symbol

type Brand<B> = { readonly [__brand]: B }

export type NpcId = string & Brand<'NpcId'>
export type QuestId = string & Brand<'QuestId'>
export type FactionId = string & Brand<'FactionId'>
export type DistrictId = string & Brand<'DistrictId'>
export type EventId = string & Brand<'EventId'>
export type ItemId = string & Brand<'ItemId'>
export type TitleId = string & Brand<'TitleId'>
export type RoomId = string & Brand<'RoomId'>

/** Cast a plain string to NpcId. Use only at validated trust boundaries. */
export function asNpcId(id: string): NpcId {
  return id as NpcId
}

export function asQuestId(id: string): QuestId {
  return id as QuestId
}

export function asFactionId(id: string): FactionId {
  return id as FactionId
}

export function asDistrictId(id: string): DistrictId {
  return id as DistrictId
}

export function asEventId(id: string): EventId {
  return id as EventId
}

export function asItemId(id: string): ItemId {
  return id as ItemId
}

export function asTitleId(id: string): TitleId {
  return id as TitleId
}

export function asRoomId(id: string): RoomId {
  return id as RoomId
}
