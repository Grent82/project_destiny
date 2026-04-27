import type { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'

import { createGameStore } from '../../application'

const store = createGameStore()

export function AppProviders(props: PropsWithChildren) {
  const { children } = props

  return <Provider store={store}>{children}</Provider>
}
