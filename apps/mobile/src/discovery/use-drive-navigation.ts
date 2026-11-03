import type { Coordinate } from '@parkey/shared-types'
import * as Location from 'expo-location'
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Platform } from 'react-native'

import {
  createDriveTracker,
  shouldReroute,
  trackDriveFix,
} from './drive-tracking'
import type { DriveTracker, NavigationFix } from './drive-tracking'
import { distanceMeters } from './model'
import type { DrivingRoute } from './routing'

export type DrivePhase = 'preview' | 'navigating' | 'arrived'

export function useDriveNavigation({
  route,
  destination,
  reroute,
  cancel,
}: {
  route: DrivingRoute | null
  destination: Coordinate | null
  reroute: (
    from: Coordinate,
    to: Coordinate,
    heading?: number,
  ) => Promise<unknown>
  cancel: () => void
}) {
  const [progressState, setProgressState] =
    useState<DriveTracker['progress']>(null)
  const [phase, setPhase] = useState<DrivePhase>('preview')
  const [tracking, setTracking] = useState(false)
  const [starting, setStarting] = useState(false)
  const [position, setPosition] = useState<Coordinate | null>(null)
  const [following, setFollowing] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [resumable, setResumable] = useState(false)
  const [rerouting, setRerouting] = useState(false)
  const tracker = useRef(createDriveTracker())
  const nextRequest = useRef(0)
  const pending = useRef(false)
  const generation = useRef(0)

  const start = useCallback(() => {
    generation.current++
    cancel()
    pending.current = false
    setRerouting(false)
    setMessage(null)
    setDenied(false)
    setStarting(true)
    setProgressState(null)
    setFollowing(true)
    setResumable(false)
    tracker.current = createDriveTracker()
    setPosition(null)
    // Includes the initial route request in the navigation request budget.
    nextRequest.current = Date.now() + 15000
    setTracking(true)
  }, [cancel])
  const stop = useCallback(
    (resume = true) => {
      generation.current++
      cancel()
      setTracking(false)
      setStarting(false)
      setPhase('preview')
      setResumable(resume)
      setRerouting(false)
      pending.current = false
      tracker.current = createDriveTracker()
      setPosition(null)
    },
    [cancel],
  )
  useEffect(() => {
    if (!resumable) return
    const timer = setTimeout(() => setResumable(false), 5000)
    return () => clearTimeout(timer)
  }, [resumable])

  const acceptFix = useEffectEvent((fix: NavigationFix) => {
    if (!tracking) return
    if (Platform.OS === 'web' && document.visibilityState !== 'visible') return
    const updated = trackDriveFix(tracker.current, route, fix)
    if (updated === tracker.current) return
    tracker.current = updated
    setStarting(false)
    setPhase('navigating')
    setMessage(null)
    const state = updated.progress
    setProgressState(state)
    setPosition(updated.position)
    if (destination && updated.arrived) {
      generation.current++
      cancel()
      setPosition(fix.point)
      setPhase('arrived')
      setTracking(false)
      setRerouting(false)
      pending.current = false
      return
    }
    if (
      starting &&
      state &&
      route &&
      fix.accuracy <= 40 &&
      distanceMeters(fix.point, route.geometry.coordinates[0] ?? fix.point) >
        Math.max(25, fix.accuracy) &&
      destination &&
      !pending.current
    ) {
      nextRequest.current = Date.now() + 15000
      pending.current = true
      setRerouting(true)
      cancel()
      const requestGeneration = generation.current
      void reroute(
        fix.point,
        destination,
        updated.heading ?? undefined,
      ).finally(() => {
        if (requestGeneration !== generation.current) return
        pending.current = false
        setRerouting(false)
        tracker.current = { ...tracker.current, deviation: null }
      })
    }
  })
  const fail = useEffectEvent((permissionDenied: boolean) => {
    tracker.current = { ...tracker.current, deviation: null, arrival: null }
    setDenied(permissionDenied)
    setMessage(
      permissionDenied
        ? 'Location permission was denied. Open directions in another app.'
        : 'Location unavailable. Keep the app open and check location services.',
    )
    if (starting || permissionDenied) {
      generation.current++
      cancel()
      pending.current = false
      setRerouting(false)
      setTracking(false)
      setStarting(false)
      setPhase('preview')
    }
  })
  useEffect(() => {
    if (!tracking) return
    let active = true
    let remove = () => undefined as void
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        fail(false)
        return
      }
      const id = navigator.geolocation.watchPosition(
        (fix) => {
          if (active)
            acceptFix({
              point: [fix.coords.longitude, fix.coords.latitude],
              accuracy: fix.coords.accuracy,
              timestamp: fix.timestamp,
              heading: fix.coords.heading,
              speed: fix.coords.speed,
            })
        },
        (error) => {
          if (active) fail(error.code === 1)
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      )
      remove = () => navigator.geolocation.clearWatch(id)
    } else {
      void (async () => {
        const permission = await Location.requestForegroundPermissionsAsync()
        if (!active) return
        if (!permission.granted) {
          fail(true)
          return
        }
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 0,
            timeInterval: 1000,
          },
          (fix) => {
            if (active)
              acceptFix({
                point: [fix.coords.longitude, fix.coords.latitude],
                accuracy: fix.coords.accuracy ?? Infinity,
                timestamp: fix.timestamp,
                heading: fix.coords.heading,
                speed: fix.coords.speed,
              })
          },
        )
        if (active) remove = () => subscription.remove()
        else subscription.remove()
      })().catch(() => {
        if (active) fail(false)
      })
    }
    return () => {
      active = false
      remove()
    }
  }, [tracking])

  const checkOffRoute = useEffectEvent(() => {
    const fix = tracker.current.fix
    if (
      !tracking ||
      phase !== 'navigating' ||
      !destination ||
      !fix ||
      !shouldReroute(tracker.current) ||
      Date.now() < nextRequest.current ||
      pending.current
    )
      return
    if (Platform.OS === 'web' && document.visibilityState !== 'visible') return
    nextRequest.current = Date.now() + 15000
    pending.current = true
    setRerouting(true)
    cancel()
    const requestGeneration = generation.current
    void reroute(
      fix.point,
      destination,
      tracker.current.heading ?? undefined,
    ).finally(() => {
      if (requestGeneration !== generation.current) return
      pending.current = false
      setRerouting(false)
      tracker.current = { ...tracker.current, deviation: null }
    })
  })
  useEffect(() => {
    if (!tracking) return
    const timer = setInterval(() => checkOffRoute(), 1000)
    return () => clearInterval(timer)
  }, [tracking])

  // A screen lock is best effort: unsupported browsers still navigate normally.
  useEffect(() => {
    if (Platform.OS !== 'web' || phase !== 'navigating') return
    let active = true
    let lock: WakeLockSentinel | null = null
    let acquiring = false
    async function acquire() {
      if (
        !active ||
        acquiring ||
        document.visibilityState !== 'visible' ||
        !('wakeLock' in navigator) ||
        (lock && !lock.released)
      )
        return
      acquiring = true
      try {
        const acquired = await navigator.wakeLock.request('screen')
        if (active && document.visibilityState === 'visible') lock = acquired
        else await acquired.release()
      } catch {
        /* Browser and battery policies may refuse a lock. */
      } finally {
        acquiring = false
      }
    }
    function visibility() {
      if (document.visibilityState === 'visible') {
        // A hidden interval is never evidence of continuous deviation.
        tracker.current = { ...tracker.current, deviation: null, arrival: null }
        void acquire()
      }
    }
    void acquire()
    document.addEventListener('visibilitychange', visibility)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', visibility)
      void lock?.release().catch(() => undefined)
    }
  }, [phase])

  return {
    phase,
    starting,
    tracking,
    position,
    following,
    message,
    denied,
    resumable,
    rerouting,
    progress: progressState,
    start,
    stop,
    pan: useCallback(() => setFollowing(false), []),
    recenter: useCallback(() => setFollowing(true), []),
  }
}
