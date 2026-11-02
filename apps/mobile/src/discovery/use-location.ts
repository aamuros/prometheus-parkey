import type { Coordinate } from '@parkey/shared-types'
import * as Location from 'expo-location'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Platform } from 'react-native'

export function useLocation() {
  const [point, setPoint] = useState<Coordinate | null>(null)
  const [status, setStatus] = useState<
    'idle' | 'locating' | 'denied' | 'error'
  >('idle')
  const pending = useRef<Promise<Coordinate | null> | null>(null)
  const active = useRef(true)
  const request = useCallback(async (): Promise<Coordinate | null> => {
    setStatus('locating')
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      if (Platform.OS !== 'web') {
        const permission = await Location.requestForegroundPermissionsAsync()
        if (permission.status !== 'granted') {
          if (active.current) setStatus('denied')
          return null
        }
      }
      // Expo's web implementation permits an infinitely cached position. Parking
      // confirmation needs a fresh fix, never the last navigation/arrival sample.
      const request =
        Platform.OS === 'web'
          ? new Promise<Coordinate>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                (fix) => {
                  if (fix.coords.accuracy > 100) {
                    reject(new Error('Location is not accurate enough'))
                    return
                  }
                  resolve([fix.coords.longitude, fix.coords.latitude])
                },
                reject,
                { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
              )
            })
          : Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            }).then((fix): Coordinate => {
              if (fix.coords.accuracy === null || fix.coords.accuracy > 100)
                throw new Error('Location is not accurate enough')
              return [fix.coords.longitude, fix.coords.latitude]
            })
      const coordinate = await Promise.race([
        request,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Location timeout')), 15000)
        }),
      ])
      if (!active.current) return null
      setPoint(coordinate)
      setStatus('idle')
      return coordinate
    } catch (error) {
      const denied =
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 1
      if (active.current) setStatus(denied ? 'denied' : 'error')
      return null
    } finally {
      clearTimeout(timer)
    }
  }, [])
  const locate = useCallback((): Promise<Coordinate | null> => {
    if (pending.current) return pending.current
    const result = request()
    pending.current = result
    void result.finally(() => {
      pending.current = null
    })
    return result
  }, [request])
  useEffect(() => {
    active.current = true
    async function checkPermission() {
      try {
        const denied =
          Platform.OS === 'web'
            ? 'permissions' in navigator &&
              (await navigator.permissions.query({ name: 'geolocation' }))
                .state === 'denied'
            : (await Location.getForegroundPermissionsAsync()).status ===
              'denied'
        if (!active.current || pending.current) return
        if (denied) {
          setPoint(null)
          setStatus('denied')
        } else setStatus((current) => (current === 'denied' ? 'idle' : current))
      } catch {
        /* Unsupported permission queries leave manual search available. */
      }
    }
    void checkPermission()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkPermission()
    })
    return () => {
      active.current = false
      subscription.remove()
    }
  }, [])
  return { point, status, locate }
}
