import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network'
import { useCallback, useEffect, useState } from 'react'

export function useConnectivity() {
  const [offline, setOffline] = useState(false)
  const recheck = useCallback(async () => {
    try {
      const state = await getNetworkStateAsync()
      const disconnected =
        state.isConnected === false || state.isInternetReachable === false
      setOffline(disconnected)
      return !disconnected
    } catch {
      /* Retain the last known state when the platform cannot check. */
      return false
    }
  }, [])
  useEffect(() => {
    let active = true
    void getNetworkStateAsync()
      .then((state) => {
        if (active)
          setOffline(
            state.isConnected === false || state.isInternetReachable === false,
          )
      })
      .catch(() => undefined)
    const listener = addNetworkStateListener((state) =>
      setOffline(
        state.isConnected === false || state.isInternetReachable === false,
      ),
    )
    return () => {
      active = false
      listener.remove()
    }
  }, [])
  return { offline, recheck }
}
