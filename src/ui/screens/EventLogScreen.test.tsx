import { render, screen } from '@testing-library/react'

import { createGameStore, gameActions } from '../../application'
import { AppProviders } from '../app/AppProviders'
import { EventLogScreen } from './EventLogScreen'

describe('EventLogScreen', () => {
  it('renders recorded economy and combat events from application state', () => {
    const store = createGameStore()

    store.dispatch(
      gameActions.purchaseItemFromShop({
        shopId: 'shop-harbor-provisions',
        itemId: 'item-medkit-field',
      }),
    )
    store.dispatch(gameActions.startCombatEncounter())

    render(
      <AppProviders store={store}>
        <EventLogScreen />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Event Log' })).toBeInTheDocument()
    expect(screen.getByText(/Purchased item-medkit-field/i)).toBeInTheDocument()
    expect(screen.getByText(/deploys into a hostile patrol encounter/i)).toBeInTheDocument()
    expect(screen.getByText(/Current encounter state/i)).toBeInTheDocument()
  })
})
