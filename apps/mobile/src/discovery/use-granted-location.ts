import type { Coordinate } from '@parkey/shared-types'
import * as Location from 'expo-location'
import { useEffect } from 'react'
import { Platform } from 'react-native'

/** Reuse a grant; permission requests belong to a user action, never launch. */
export function useGrantedLocation(locate: () => Promise<Coordinate | null>) {
  useEffect(() => {
    let active = true
    async function reuse() {
      const granted =
        Platform.OS === 'web'
          ? 'permissions' in navigator &&
            (await navigator.permissions.query({ name: 'geolocation' }))
              .state === 'granted'
          : (await Location.getForegroundPermissionsAsync()).granted
      if (active && granted) await locate()
    }
    void reuse().catch(() => undefined)
    return () => {
      active = false
    }
  }, [locate])
}
