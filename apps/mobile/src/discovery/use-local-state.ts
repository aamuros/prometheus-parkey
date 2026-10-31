import { useCallback, useEffect, useRef, useState } from 'react'
import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'

import { localStore } from './local-storage'
import {
  emptyLocalState,
  rememberViewed,
  setParkedSpot,
  toggleFavorite,
} from './local-state'
import type { LocalState } from './local-state'

export function useLocalState() {
  const [state, setState] = useState(emptyLocalState)
  const current = useRef(emptyLocalState)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const ready = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(Promise.resolve())
  const active = useRef(true)
  const read = useCallback(async () => {
    ready.current = false
    setStatus('loading')
    try {
      const saved = await localStore.read()
      if (!active.current) return
      current.current = saved
      ready.current = true
      setState(saved)
      setStatus('ready')
      setError(null)
    } catch {
      if (active.current) {
        setStatus('error')
        setError(
          'Saved places could not be read. Try again, or clear saved data on this device.',
        )
      }
    }
  }, [])
  useEffect(() => {
    active.current = true
    pending.current = read()
    return () => {
      active.current = false
    }
  }, [read])
  const update = useCallback(
    (change: (state: LocalState) => LocalState): Promise<boolean> => {
      const task = pending.current.then(async () => {
        if (!ready.current || !active.current) return false
        setBusy(true)
        try {
          const next = change(current.current)
          await localStore.write(next)
          current.current = next
          if (active.current) {
            setState(next)
            setError(null)
          }
          return true
        } catch {
          if (active.current)
            setError(
              'Your changes could not be saved on this device. Please try again.',
            )
          return false
        } finally {
          if (active.current) setBusy(false)
        }
      })
      pending.current = task.then(() => undefined)
      return task
    },
    [],
  )
  async function clear() {
    if (busy) return
    ready.current = false
    setBusy(true)
    try {
      await pending.current
      await localStore.clear()
      current.current = emptyLocalState
      ready.current = true
      setState(emptyLocalState)
      setStatus('ready')
      setError(null)
    } catch {
      setError('Saved data could not be cleared. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return {
    state,
    status,
    error,
    busy,
    retry: read,
    clear,
    favorite: (record: DiscoveryParking) =>
      update((state) => toggleFavorite(state, record)),
    viewed: (record: DiscoveryParking) =>
      update((state) => rememberViewed(state, record)),
    park: (coordinate: Coordinate | null) =>
      update((state) => setParkedSpot(state, coordinate)),
    remove: (key: string, list: 'favorites' | 'recents') =>
      update((state) => ({
        ...state,
        [list]: state[list].filter((item) => item.key !== key),
      })),
  }
}
