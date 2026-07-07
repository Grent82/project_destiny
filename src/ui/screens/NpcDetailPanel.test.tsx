import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore, selectRosterDetail } from '../../application'
import { gameActions } from '../../application/store/gameSlice'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { initialStateWithIda } from '../../application/commands/testFixtures'
import { isDialogueChoiceAvailable } from '../../application/commands/dialogue'
import { contentCatalog } from '../../application/content/contentCatalog'
import { AppProviders } from '../app/AppProviders'
import { NpcDetailPanel } from './NpcDetailPanel'

const MARION_ID = 'npc-marion-vale'

// destiny-4d1u: Marion's ledger/vault-note choices gate on hasEnabledAction now, not hasItem
// (the document may already be archived by the time the House screen prompts these choices).
function renderMarionPanel(enabledActions: string[] = []) {
  const store = createGameStore({ ...initialGameStateSnapshot, enabledActions })
  const detail = selectRosterDetail(store.getState(), MARION_ID)
  if (!detail) throw new Error('Marion not on roster in initial state')
  render(
    <AppProviders store={store}>
      <MemoryRouter>
        <NpcDetailPanel detail={detail} />
      </MemoryRouter>
    </AppProviders>,
  )
  return store
}

function renderIdaPanel(storeState = initialStateWithIda) {
  const store = createGameStore(storeState)
  const detail = selectRosterDetail(store.getState(), 'npc-ida-rhys')
  if (!detail) throw new Error('Ida not on roster in test state')
  render(
    <AppProviders store={store}>
      <MemoryRouter>
        <NpcDetailPanel detail={detail} />
      </MemoryRouter>
    </AppProviders>,
  )
  return store
}

function withKitchenState<T extends typeof initialStateWithIda>(state: T, roomState: 'intact' | 'damaged') {
  return {
    ...state,
    house: {
      ...state.house,
      rooms: state.house.rooms.map((room) =>
        room.roomId === 'room-kitchen' ? { ...room, state: roomState } : room,
      ),
    },
  }
}

function stateWithPlayerHeldIda() {
  return {
    ...initialStateWithIda,
    npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
      npc.npcId === 'npc-ida-rhys'
        ? {
            ...npc,
            bondStatus: {
              holderId: 'player',
              contractValue: 40,
              termDays: 30,
              entryReason: 'debt-settlement' as const,
              alongsideFreeAssignmentDays: 0,
              lastEqualityNoticeDay: null,
              forSale: false,
              lastOfferDay: null,
              marketValue: 120,
              ownerType: 'player' as const,
              bondStartDay: 1,
            },
          }
        : npc,
    ),
  }
}

function stateWithTransferredIda() {
  return {
    ...initialStateWithIda,
    money: 500,
    bondedPersonsRegistry: {
      'buyer-compact-registrar': ['npc-ida-rhys'],
    },
    npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
      npc.npcId === 'npc-ida-rhys'
        ? {
            ...npc,
            assignment: 'transferred' as const,
            bondStatus: {
              holderId: 'buyer-compact-registrar',
              contractValue: 40,
              termDays: 30,
              entryReason: 'debt-settlement' as const,
              alongsideFreeAssignmentDays: 0,
              lastEqualityNoticeDay: null,
              forSale: false,
              lastOfferDay: 1,
              marketValue: 120,
              ownerType: 'npc' as const,
              bondStartDay: 1,
            },
          }
        : npc,
    ),
  }
}

describe('NpcDetailPanel — Marion clue discoverability', () => {
  it('shows no new-topic hint when the player holds no relevant items', () => {
    renderMarionPanel()
    expect(screen.queryByText(/Something on your mind worth raising/i)).toBeNull()
  })

  it('shows a new-topic hint when the bureau ledger chit has been examined', () => {
    renderMarionPanel(['examine-ledger-chit'])
    expect(screen.getByText(/Something on your mind worth raising/i)).toBeInTheDocument()
  })

  it('shows a new-topic hint when the arrangement note has been examined', () => {
    renderMarionPanel(['examine-vault-note'])
    expect(screen.getByText(/Something on your mind worth raising/i)).toBeInTheDocument()
  })
})

describe('Marion clue → dialogue choice availability', () => {
  it('ledger chit choice is gated behind hasEnabledAction and unavailable before the document is examined', () => {
    const tree = contentCatalog.dialoguesByNpcId.get(MARION_ID)!
    const chitChoice = tree.nodes
      .flatMap((n) => n.choices)
      .find((c) => c.id === 'marion-choice-ledger-chit')!

    expect(isDialogueChoiceAvailable(initialGameStateSnapshot, tree.id, chitChoice)).toBe(false)
  })

  it('ledger chit choice becomes available once the document has been examined (archived)', () => {
    const tree = contentCatalog.dialoguesByNpcId.get(MARION_ID)!
    const chitChoice = tree.nodes
      .flatMap((n) => n.choices)
      .find((c) => c.id === 'marion-choice-ledger-chit')!

    const stateWith = { ...initialGameStateSnapshot, enabledActions: ['examine-ledger-chit'] }
    expect(isDialogueChoiceAvailable(stateWith, tree.id, chitChoice)).toBe(true)
  })

  it('arrangement note choice becomes available once the document has been examined (archived)', () => {
    const tree = contentCatalog.dialoguesByNpcId.get(MARION_ID)!
    const noteChoice = tree.nodes
      .flatMap((n) => n.choices)
      .find((c) => c.id === 'marion-choice-arrangement-below')!

    const stateWith = { ...initialGameStateSnapshot, enabledActions: ['examine-vault-note'] }
    expect(isDialogueChoiceAvailable(stateWith, tree.id, noteChoice)).toBe(true)
  })
})

describe('NpcDetailPanel — courtship loop', () => {
  it('shows a player-facing courtship action for romance-eligible NPCs at the house', () => {
    renderIdaPanel()

    expect(screen.getByRole('button', { name: 'Talk' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spend Time' })).toBeInTheDocument()
  })

  it('reveals conversation and activity actions only after choosing Talk or Spend Time', async () => {
    const user = userEvent.setup()
    renderIdaPanel()

    expect(screen.queryByRole('button', { name: 'Talk Deeply' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Court' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Offer Gift' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Talk' }))

    const talkMenu = screen.getByRole('group', { name: 'Talk options' })
    expect(within(talkMenu).getByRole('button', { name: 'Speak' })).toBeInTheDocument()
    expect(within(talkMenu).getByRole('button', { name: 'Talk Deeply' })).toBeInTheDocument()
    expect(within(talkMenu).getByRole('button', { name: 'Court' })).toBeInTheDocument()
    expect(within(talkMenu).getByText(/Talk Deeply and Court do not consume time slots/i)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Spend Time options' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Spend Time' }))

    const timeMenu = screen.getByRole('group', { name: 'Spend Time options' })
    expect(within(timeMenu).getByRole('button', { name: 'Offer Gift' })).toBeInTheDocument()
    expect(within(timeMenu).getByRole('button', { name: 'Propose Date' })).toBeInTheDocument()
    expect(within(timeMenu).getByRole('button', { name: 'Spend Night Together' })).toBeInTheDocument()
    expect(within(timeMenu).getByText(/Date-specific costs and duration are shown in the proposal list/i)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Talk options' })).toBeNull()
  })

  it('shows truthful disabled reasons and next-step guidance for social actions', async () => {
    const user = userEvent.setup()
    renderIdaPanel()

    await user.click(screen.getByRole('button', { name: 'Talk' }))

    expect(screen.getByRole('button', { name: 'Talk Deeply' })).toHaveAttribute(
      'title',
      expect.stringMatching(/meaningful conversation.*consume time slots/i),
    )
    expect(screen.getByRole('button', { name: 'Court' })).toHaveAttribute(
      'title',
      expect.stringMatching(/no time slot cost/i),
    )

    await user.click(screen.getByRole('button', { name: 'Spend Time' }))

    expect(screen.getByRole('button', { name: 'Offer Gift' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Offer Gift' })).toHaveAttribute(
      'title',
      expect.stringMatching(/Carry a gift item in player inventory/i),
    )
    expect(screen.getByRole('button', { name: 'Propose Date' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Propose Date' })).toHaveAttribute(
      'title',
      expect.stringMatching(/Build your relationship first/i),
    )
    expect(screen.getByRole('button', { name: 'Spend Night Together' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Spend Night Together' })).toHaveAttribute(
      'title',
      expect.stringMatching(/Build a deeper bond first/i),
    )
    expect(screen.getByText(/Consent and final options are confirmed in the next step/i)).toBeInTheDocument()
  })

  it('explains location blockers honestly when the player is away from the house', async () => {
    const user = userEvent.setup()
    renderIdaPanel({
      ...initialStateWithIda,
      currentDistrictId: 'district-harbor',
      relationships: {
        ...initialStateWithIda.relationships,
        'player-to-npc-ida-rhys': {
          affinity: 26,
          trust: 32,
          fear: 0,
          respect: 8,
          loyalty: 3,
          intimacyStage: 'affinity',
        },
      },
    })

    expect(screen.getByText(/Ida Rhys is at House Valdris/i)).toBeInTheDocument()
    expect(screen.getByText(/Return to the house before asking for private time together/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    expect(screen.getByRole('button', { name: 'Speak' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Talk Deeply' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Court' })).toBeDisabled()
    expect(screen.getByText(/Speak still works from here/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Spend Time' }))
    expect(screen.getByRole('button', { name: 'Propose Date' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Spend Night Together' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Propose Date' })).toHaveAttribute(
      'title',
      expect.stringMatching(/Return to the house before asking for private time together/i),
    )
  })

  it('blocks all conversation, not just private actions, for a captive NPC', async () => {
    const user = userEvent.setup()
    renderIdaPanel({
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-ida-rhys'
          ? {
              ...npc,
              captivityState: {
                status: 'captive' as const,
                holderId: 'holder-001',
                siteId: 'site-1',
                roomId: 'room-1',
                regime: 'guarded' as const,
                condition: 'hurt' as const,
                compliance: 'resistant' as const,
                bondType: 'fear' as const,
                timeHeldDays: 2,
                lastTransferDay: null,
                questTag: null,
                confiscatedItems: [],
                confiscatedMoney: null,
                confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
              },
            }
          : npc,
      ),
    })

    expect(screen.getByText(/held captive/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    expect(screen.getByRole('button', { name: 'Speak' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Talk Deeply' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Court' })).toBeDisabled()
    expect(screen.getByText(/No conversation is possible right now/i)).toBeInTheDocument()
  })

  it('closes Talk and Spend Time when the same menu button is clicked twice', async () => {
    const user = userEvent.setup()
    renderIdaPanel()

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    expect(screen.getByRole('group', { name: 'Talk options' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    expect(screen.queryByRole('group', { name: 'Talk options' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Spend Time' }))
    expect(screen.getByRole('group', { name: 'Spend Time options' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Spend Time' }))
    expect(screen.queryByRole('group', { name: 'Spend Time options' })).toBeNull()
  })

  it('records visible courtship aftermath after the player courts an NPC', async () => {
    const user = userEvent.setup()
    const store = renderIdaPanel({
      ...initialStateWithIda,
      relationships: {
        ...initialStateWithIda.relationships,
        'player-to-npc-ida-rhys': {
          affinity: 18,
          trust: 28,
          fear: 10,
          respect: 0,
          loyalty: 0,
        },
        'npc-ida-rhys-to-player': {
          affinity: 0,
          trust: 0,
          fear: 0,
          respect: 0,
          loyalty: 20,
        },
      },
    })

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    await user.click(screen.getByRole('button', { name: 'Court' }))

    expect(screen.getByRole('tab', { name: 'Relations', selected: true })).toBeInTheDocument()
    expect(screen.getByText(/Courtship History/i)).toBeInTheDocument()
    expect(screen.getByText(/You make time to court Ida Rhys/i)).toBeInTheDocument()
    expect(store.getState().game.relationships['player-to-npc-ida-rhys']?.intimacyStage).toBe('affinity')
  })

  it('opens Relations and shows deep-conversation aftermath after Talk Deeply', async () => {
    const user = userEvent.setup()
    const store = renderIdaPanel({
      ...initialStateWithIda,
      relationships: {
        ...initialStateWithIda.relationships,
        'player-to-npc-ida-rhys': {
          affinity: 12,
          trust: 22,
          fear: 4,
          respect: 3,
          loyalty: 0,
        },
        'npc-ida-rhys-to-player': {
          affinity: 4,
          trust: 6,
          fear: 0,
          respect: 0,
          loyalty: 12,
        },
      },
    })

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    await user.click(screen.getByRole('button', { name: 'Talk Deeply' }))

    expect(screen.getByRole('tab', { name: 'Relations', selected: true })).toBeInTheDocument()
    expect(screen.getByText(/Deep Conversation History/i)).toBeInTheDocument()
    expect(screen.getByText(/You sit down with Ida Rhys to talk about/i)).toBeInTheDocument()
    expect(store.getState().game.relationships['player-to-npc-ida-rhys']?.trust).toBeGreaterThan(22)
  })

  it('opens the date proposal modal from Spend Time when the bond is established', async () => {
    const user = userEvent.setup()
    renderIdaPanel({
      ...initialStateWithIda,
      relationships: {
        ...initialStateWithIda.relationships,
        'player-to-npc-ida-rhys': {
          affinity: 26,
          trust: 32,
          fear: 0,
          respect: 8,
          loyalty: 3,
          intimacyStage: 'affinity',
        },
      },
    })

    await user.click(screen.getByRole('button', { name: 'Spend Time' }))
    await user.click(screen.getByRole('button', { name: 'Propose Date' }))

    expect(screen.getByRole('heading', { name: /Propose a Date with Ida Rhys/i })).toBeInTheDocument()
    expect(screen.getByText(/Current bond: Affinity/i)).toBeInTheDocument()
  })

  it('opens the intimacy modal from Spend Time when the bond is established', async () => {
    const user = userEvent.setup()
    renderIdaPanel({
      ...initialStateWithIda,
      relationships: {
        ...initialStateWithIda.relationships,
        'player-to-npc-ida-rhys': {
          affinity: 31,
          trust: 38,
          fear: 0,
          respect: 10,
          loyalty: 4,
          intimacyStage: 'affinity',
        },
      },
    })

    await user.click(screen.getByRole('button', { name: 'Spend Time' }))
    await user.click(screen.getByRole('button', { name: 'Spend Night Together' }))

    expect(screen.getByRole('heading', { name: /Spend the Night with Ida Rhys/i })).toBeInTheDocument()
    expect(screen.getByText(/Pregnancy Intent/i)).toBeInTheDocument()
  })
})

describe('NpcDetailPanel — bond status visibility', () => {
  it('shows house-held bond details and an honest kitchen gate when the room is still damaged', () => {
    renderIdaPanel(stateWithPlayerHeldIda())

    expect(screen.getByRole('heading', { name: 'Bond Status' })).toBeInTheDocument()
    expect(screen.getByText(/Held by House Valdris/i)).toBeInTheDocument()
    expect(screen.getByText(/Debt settlement/i)).toBeInTheDocument()
    expect(screen.getByText(/Contract buyout: 40 Marks/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Release from bond' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Offer for transfer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Repair kitchen for food service' })).toBeDisabled()
    expect(screen.getByText(/Repair the kitchen before assigning food service/i)).toBeInTheDocument()
  })

  it('shows the food-service action once the kitchen is repaired', () => {
    renderIdaPanel(withKitchenState(stateWithPlayerHeldIda(), 'intact'))

    expect(screen.getByRole('button', { name: 'Place in food service' })).toBeInTheDocument()
  })

  it('shows transferred holder details and rescue actions for NPC-held bonds', () => {
    renderIdaPanel(stateWithTransferredIda())

    expect(screen.getByRole('heading', { name: 'Bond Status' })).toBeInTheDocument()
    expect(screen.getByText(/Transferred to Compact Registrar/i)).toBeInTheDocument()
    expect(screen.getByText(/Legal buyout: 180 Marks/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buy freedom' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Extract quietly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seize by force' })).toBeInTheDocument()
  })

  it('can place a player-held bonded NPC into kitchen food service', async () => {
    const user = userEvent.setup()
    const store = renderIdaPanel(withKitchenState(stateWithPlayerHeldIda(), 'intact'))

    await user.click(screen.getByRole('button', { name: 'Place in food service' }))

    const ida = store.getState().game.npcRuntimeStates.find((npc) => npc.npcId === 'npc-ida-rhys')
    expect(ida?.assignment).toBe('working')
    expect(ida?.dutyPostRoomId).toBe('room-kitchen')
  })
})

function stateWithCriticalFatigueIda() {
  return {
    ...initialStateWithIda,
    npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
      npc.npcId === 'npc-ida-rhys' ? { ...npc, states: { ...npc.states, fatigue: 90 } } : npc,
    ),
  }
}

describe('NpcDetailPanel — tab warning/notification indicators and keyboard nav (destiny-qak9)', () => {
  it('shows no States badge and no Relations badge when nothing is critical or new', () => {
    renderIdaPanel()
    const statesTab = screen.getByRole('tab', { name: /States/ })
    const relationsTab = screen.getByRole('tab', { name: /Relations/ })
    expect(within(statesTab).queryByText('⚠')).toBeNull()
    expect(within(relationsTab).queryByText('🔔')).toBeNull()
  })

  it('shows a warning badge on the States tab when a state exceeds its threshold', () => {
    renderIdaPanel(stateWithCriticalFatigueIda())
    const statesTab = screen.getByRole('tab', { name: /States/ })
    expect(within(statesTab).getByText('⚠')).toBeInTheDocument()
  })

  it('shows a notification badge on the Relations tab when new dialogue topics are available', () => {
    renderMarionPanel(['examine-ledger-chit'])
    const relationsTab = screen.getByRole('tab', { name: /Relations/ })
    expect(within(relationsTab).getByText('🔔')).toBeInTheDocument()
  })

  it('switches tabs via Ctrl+1 through Ctrl+5 keyboard shortcuts', async () => {
    const user = userEvent.setup()
    renderIdaPanel()

    expect(screen.getByRole('tab', { name: /Attributes/ })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Control>}3{/Control}')
    expect(screen.getByRole('tab', { name: /States/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Hunger')).toBeInTheDocument()

    await user.keyboard('{Control>}5{/Control}')
    expect(screen.getByRole('tab', { name: /Relations/ })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Control>}1{/Control}')
    expect(screen.getByRole('tab', { name: /Attributes/ })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('NpcDetailPanel — cooldown countdown feedback on Talk Deeply / Court (destiny-twzj)', () => {
  it('shows both buttons enabled, with no lock icon, before either action has been used today', async () => {
    const user = userEvent.setup()
    renderIdaPanel()

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    expect(screen.getByRole('button', { name: 'Talk Deeply' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Court' })).toBeEnabled()
  })

  it('disables Talk Deeply with a lock icon and explanatory tooltip after it has already fired today, without touching Court', async () => {
    const user = userEvent.setup()
    const store = renderIdaPanel()
    store.dispatch(gameActions.deepConversation({ npcId: 'npc-ida-rhys' }))

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    const lockedButton = screen.getByRole('button', { name: /🔒 Talk Deeply/ })
    expect(lockedButton).toBeDisabled()
    expect(lockedButton).toHaveAttribute('title', expect.stringContaining('Available again: tomorrow morning'))
    expect(screen.getByText(/Already had a deep conversation today\. Available again: tomorrow morning\./)).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Court' })).toBeEnabled()
  })

  it('disables Court with a lock icon and explanatory tooltip after it has already fired today, without touching Talk Deeply', async () => {
    const user = userEvent.setup()
    const store = renderIdaPanel()
    store.dispatch(gameActions.courtNpc({ npcId: 'npc-ida-rhys' }))

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    const lockedButton = screen.getByRole('button', { name: /🔒 Court/ })
    expect(lockedButton).toBeDisabled()
    expect(lockedButton).toHaveAttribute('title', expect.stringContaining('Available again: tomorrow morning'))
    expect(screen.getByText(/Already courted today\. Available again: tomorrow morning\./)).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Talk Deeply' })).toBeEnabled()
  })

  it('shows a combined cooldown note when both actions have already fired today', async () => {
    const user = userEvent.setup()
    const store = renderIdaPanel()
    store.dispatch(gameActions.deepConversation({ npcId: 'npc-ida-rhys' }))
    store.dispatch(gameActions.courtNpc({ npcId: 'npc-ida-rhys' }))

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    expect(screen.getByText(/Already spent private time together today\. Available again: tomorrow morning\./)).toBeInTheDocument()
  })

  it('does not carry a cooldown across days once endDay resets it', async () => {
    const user = userEvent.setup()
    const store = renderIdaPanel()
    store.dispatch(gameActions.deepConversation({ npcId: 'npc-ida-rhys' }))
    expect(store.getState().game.day).toBe(1)

    store.dispatch(gameActions.endDay())
    expect(store.getState().game.day).toBe(2)

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    expect(screen.getByRole('button', { name: 'Talk Deeply' })).toBeEnabled()
  })
})
