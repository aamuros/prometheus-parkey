import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { Destination } from './data'
import {
  emptySearchHistory,
  parseSearchHistory,
  rememberSearch,
} from './search-history'
import type { SearchHistory } from './search-history'

const storageKey = 'parkey.search-history.v1'

export function useSearchHistory() {
  const [history, setHistory] = useState(emptySearchHistory)
  const [error, setError] = useState<string | null>(null)
  const current = useRef(emptySearchHistory)
  const pending = useRef(Promise.resolve())
  const readable = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    pending.current = AsyncStorage.getItem(storageKey)
      .then((raw) => {
        current.current = raw
          ? parseSearchHistory(JSON.parse(raw))
          : emptySearchHistory
        readable.current = true
        if (mounted.current) setHistory(current.current)
      })
      .catch(() => {
        if (mounted.current)
          setError('Recent searches are unavailable on this device.')
      })
    return () => {
      mounted.current = false
    }
  }, [])

  const update = useCallback(
    (change: (saved: SearchHistory) => SearchHistory) => {
      const task = pending.current.then(async () => {
        const next = change(current.current)
        if (next === current.current) return
        current.current = next
        if (mounted.current) setHistory(current.current)
        // Preserve unreadable storage instead of silently overwriting it.
        if (!readable.current) return
        try {
          await AsyncStorage.setItem(
            storageKey,
            JSON.stringify({ version: 1, ...current.current }),
          )
          if (mounted.current) setError(null)
        } catch {
          if (mounted.current)
            setError('Recent searches could not be saved on this device.')
        }
      })
      pending.current = task
      return task
    },
    [],
  )

  const noteSearch = useCallback(async () => {
    let firstSearch = false
    await update((saved) => {
      firstSearch = !saved.privacyShown
      return saved.privacyShown ? saved : { ...saved, privacyShown: true }
    })
    return firstSearch
  }, [update])

  return {
    recents: history.recents,
    error,
    remember: (destination: Destination) =>
      update((saved) => rememberSearch(saved, destination)),
    restore: (recents: Destination[]) =>
      update((saved) => ({ ...saved, recents })),
    clear: () => update((saved) => ({ ...saved, recents: [] })),
    noteSearch,
  }
}
