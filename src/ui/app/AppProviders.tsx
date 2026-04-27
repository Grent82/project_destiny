import { useState, type PropsWithChildren } from 'react'
import { Provider } from 'react-redux'

import { createGameStore, type GameStore } from '../../application'

interface AppProvidersProps extends PropsWithChildren {
  store?: GameStore
}

export function AppProviders(props: AppProvidersProps) {
  const { children, store } = props
  const [resolvedStore] = useState<GameStore>(() => store ?? createGameStore())

  return <Provider store={resolvedStore}>{children}</Provider>
}
