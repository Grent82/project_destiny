import { useDispatch, useSelector, useStore } from 'react-redux'

import type { AppDispatch, GameStore, RootState } from '../../application'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore = useStore.withTypes<GameStore>()
