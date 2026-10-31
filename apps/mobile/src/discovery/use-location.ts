import type { Coordinate } from '@parkey/shared-types'
import * as Location from 'expo-location'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

export function useLocation() {
  const [point, setPoint] = useState<Coordinate | null>(null)
  const [status, setStatus] = useState<
    'idle' | 'locating' | 'denied' | 'error'
  >('idle')
  const busy = useRef(false)
  const active = useRef(true)
  const locate = useCallback(async (): Promise<Coordinate | null> => {
    if (busy.current) return null
    busy.current = true
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
      busy.current = false
      clearTimeout(timer)
    }
  }, [])
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  return { point, status, locate }
}
