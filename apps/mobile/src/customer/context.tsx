import { createContext, useContext, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'

import { initialPreview, previewReducer } from './preview'
import type { PreviewAction, PreviewState } from './preview'

const PreviewContext = createContext<{
  state: PreviewState
  dispatch: Dispatch<PreviewAction>
} | null>(null)
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(previewReducer, initialPreview)
  return (
    <PreviewContext.Provider value={{ state, dispatch }}>
      {children}
    </PreviewContext.Provider>
  )
}
export function usePreview() {
  const context = useContext(PreviewContext)
  if (!context) throw new Error('Customer screens require PreviewProvider')
  return context
}
