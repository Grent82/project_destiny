import type { GameState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { addPlayerItem } from './inventory/inventoryHelpers'
import { getHouseDiscovery } from '../content/houseDiscoveries'
import { ROOM_IDS } from '../content/ids'

const VAULT_CLUE_ITEM_IDS = ['item-chit-ledger-removal', 'item-note-arrangement-below'] as const

function hasInventoryItem(state: GameState, itemId: string) {
  return state.inventoryState.player.bagContainers.some((container) =>
    container.slots.some((slot) => slot.itemInstanceId === itemId)
  )
}

function cloneHouseState(state: GameState): GameState {
  return {
    ...state,
    activityLog: [...state.activityLog],
    mainQuest: { ...state.mainQuest },
    house: {
      ...state.house,
      rooms: state.house.rooms.map((room) => ({ ...room })),
    },
  }
}

function unlockVaultFromClues(state: GameState): GameState {
  if (state.house.vaultUnlocked) return state

  const hasAllClues = VAULT_CLUE_ITEM_IDS.every((itemId) => hasInventoryItem(state, itemId))
  if (!hasAllClues) return state

  const next = {
    ...state,
    house: {
      ...state.house,
      vaultUnlocked: true,
      rooms: state.house.rooms.map((room) =>
        room.roomId === ROOM_IDS.VAULT
          ? { ...room, state: 'intact' as const }
          : room,
      ),
    },
  }

  return appendActivityLogEntry(
    next,
    'system',
    'Comparing the bureau chit against the note about "the arrangement below," Marion finds the hidden release behind the cellar stones. The vault can now be opened.',
  )
}

export function searchHouseRoom(
  state: GameState,
  roomId: string,
): GameState {
  const room = state.house.rooms.find((entry) => entry.roomId === roomId)
  if (!room || room.searched) return state
  if (room.state === 'locked' || room.state === 'collapsed' || room.state === 'destroyed') return state

  let next = cloneHouseState(state)
  const nextRoom = next.house.rooms.find((entry) => entry.roomId === roomId)
  if (!nextRoom) return state
  nextRoom.searched = true

  const discovery = getHouseDiscovery(nextRoom.roomId, next.house.vaultUnlocked)
  if (!discovery) {
    return next
  }

  if (discovery.marks > 0) {
    next.money += discovery.marks
  }

  for (const artifact of discovery.actionableFinds) {
      if (!hasInventoryItem(next, artifact.itemId)) {
        next = addPlayerItem(next, artifact.itemId, 1)
      }
    }

  let afterSearch = appendActivityLogEntry(next, 'system', discovery.message)

  if (discovery.mainQuestHint) {
    afterSearch = {
      ...afterSearch,
      mainQuest: {
        ...afterSearch.mainQuest,
        lastClue: discovery.mainQuestHint,
      },
    }
  }

  if (nextRoom.roomId === ROOM_IDS.VAULT && afterSearch.house.vaultUnlocked) {
    afterSearch = {
      ...afterSearch,
      mainQuest: {
        ...afterSearch.mainQuest,
        stage: 'lead-found',
        lastClue: discovery.mainQuestHint ?? afterSearch.mainQuest.lastClue,
      },
    }
  }

  return unlockVaultFromClues(afterSearch)
}
