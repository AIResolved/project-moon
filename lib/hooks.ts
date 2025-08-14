import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'

// These are typed versions of the regular Redux hooks
// They automatically know about our store's structure

// Use this instead of plain `useDispatch`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()

// Use this instead of plain `useSelector`
export const useAppSelector = useSelector.withTypes<RootState>()

// Example usage in a component:
// const dispatch = useAppDispatch()
// const counterValue = useAppSelector(state => state.counter.value) 