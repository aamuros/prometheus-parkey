import * as Location from 'expo-location'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Coordinate } from '@parkey/shared-types'

export function useLocation() {
  const [point, setPoint] = useState<Coordinate | null>(null)
  const [status, setStatus] = useState<
    'idle' | 'locating' | 'denied' | 'error'
  >('idle')
  const busy = useRef(false)
  const active = useRef(true)
  const watcher = useRef<Location.LocationSubscription | null>(null)
  const locate = useCallback(async (): Promise<Coordinate | null> => {
    if (busy.current) return null
    busy.current = true
    setStatus('locating')
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        if (active.current) setStatus('denied')
        return null
      }
      const position = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Location timeout')), 15000)
        }),
      ])
      const coordinate: Coordinate = [
        position.coords.longitude,
        position.coords.latitude,
      ]
      if (!active.current) return null
      setPoint(coordinate)
      setStatus('idle')
      watcher.current?.remove()
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 20,
          timeInterval: 10000,
        },
        (update) => {
          if (active.current)
            setPoint([update.coords.longitude, update.coords.latitude])
        },
      )
      if (active.current) watcher.current = subscription
      else subscription.remove()
      return coordinate
    } catch {
      if (active.current) setStatus('error')
      return null
    } finally {
      busy.current = false
      clearTimeout(timer)
    }
  }, [])
  useEffect(() => {
    active.current = true
    // Reuse an existing grant, but never prompt during first launch.
    void Location.getForegroundPermissionsAsync()
      .then((permission) => {
        if (permission.granted && active.current) void locate()
      })
      .catch(() => {
        /* Location remains optional if permissions cannot be read. */
      })
    return () => {
      active.current = false
      watcher.current?.remove()
    }
  }, [locate])
  return { point, status, locate }
}
