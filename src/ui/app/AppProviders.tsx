import { useState, type PropsWithChildren } from 'react'
import { Provider } from 'react-redux'

import { createGameStore, type GameStore } from '../../application'
import { createBrowserSaveSnapshotStore } from '../../infrastructure/persistence/localSaveSnapshot'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'

interface AppProvidersProps extends PropsWithChildren {
  store?: GameStore
}

export function AppProviders(props: AppProvidersProps) {
  const { children, store } = props

  const [resolvedStore] = useState<GameStore>(() => {
    if (store) return store

    // Try to load saved state on boot
    const saveStore = createBrowserSaveSnapshotStore()
    const savedState = saveStore.load()

    // Use saved state if available, otherwise use initial state
    const preloadedState = savedState ?? initialGameStateSnapshot

    return createGameStore(preloadedState)
  })

  return <Provider store={resolvedStore}>{children}</Provider>
}
