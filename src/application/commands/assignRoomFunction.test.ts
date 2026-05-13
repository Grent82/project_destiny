import { describe, it, expect } from 'vitest'
import { assignRoomFunction } from './assignRoomFunction'
import { initialStateWithIda } from './testFixtures'

describe('assignRoomFunction', () => {
  const intactRoomId = initialStateWithIda.house.rooms.find((r) => r.state === 'intact')?.roomId

  it('assigns a function to an intact room', () => {
    if (!intactRoomId) return // skip if no intact rooms in fixture
    const result = assignRoomFunction(initialStateWithIda, intactRoomId, 'quarters')
    const room = result.house.rooms.find((r) => r.roomId === intactRoomId)
    expect(room?.roomFunction).toBe('quarters')
  })

  it('rejects assignment to a non-intact room', () => {
    const damagedRoom = initialStateWithIda.house.rooms.find((r) => r.state !== 'intact')
    if (!damagedRoom) return // skip if all rooms are intact
    expect(() =>
      assignRoomFunction(initialStateWithIda, damagedRoom.roomId, 'barracks'),
    ).toThrow(/intact/)
  })

  it('throws if room does not exist', () => {
    expect(() =>
      assignRoomFunction(initialStateWithIda, 'room-does-not-exist', 'kitchen'),
    ).toThrow(/not found/)
  })

  it('replaces existing function on re-assignment', () => {
    if (!intactRoomId) return
    const first = assignRoomFunction(initialStateWithIda, intactRoomId, 'quarters')
    const second = assignRoomFunction(first, intactRoomId, 'study')
    const room = second.house.rooms.find((r) => r.roomId === intactRoomId)
    expect(room?.roomFunction).toBe('study')
  })
})
