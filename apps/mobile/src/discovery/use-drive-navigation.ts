import type { Coordinate } from '@parkey/shared-types'
import * as Location from 'expo-location'
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { routeProgress } from './drive-math'
import { distanceMeters } from './model'
import type { DrivingRoute } from './routing'

export type DrivePhase = 'preview' | 'navigating' | 'arrived'
type Fix = { point: Coordinate; accuracy: number; timestamp: number }

export function useDriveNavigation({
  route,
  destination,
  reroute,
  cancel,
}: {
  route: DrivingRoute | null
  destination: Coordinate | null
  reroute: (from: Coordinate, to: Coordinate) => Promise<unknown>
  cancel: () => void
}) {
  const [progressState, setProgressState] = useState<ReturnType<
    typeof routeProgress
  > | null>(null)
  const [phase, setPhase] = useState<DrivePhase>('preview')
  const [tracking, setTracking] = useState(false)
  const [starting, setStarting] = useState(false)
  const [position, setPosition] = useState<Coordinate | null>(null)
  const [following, setFollowing] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [resumable, setResumable] = useState(false)
  const [rerouting, setRerouting] = useState(false)
  const lastFix = useRef<Fix | null>(null)
  const smoothed = useRef<Coordinate | null>(null)
  const progress = useRef(0)
  const currentRoute = useRef(route)
  const offRouteSince = useRef<number | null>(null)
  const nextRequest = useRef(0)
  const pending = useRef(false)
  const generation = useRef(0)

  const start = useCallback(() => {
    setMessage(null)
    setDenied(false)
    setStarting(true)
    setProgressState(null)
    setFollowing(true)
    setResumable(false)
    lastFix.current = null
    smoothed.current = null
    offRouteSince.current = null
    // Includes the initial route request in the navigation request budget.
    nextRequest.current = Date.now() + 15000
    setTracking(true)
  }, [])
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
      lastFix.current = null
      smoothed.current = null
      setPosition(null)
      offRouteSince.current = null
    },
    [cancel],
  )
  useEffect(() => {
    if (!resumable) return
    const timer = setTimeout(() => setResumable(false), 5000)
    return () => clearTimeout(timer)
  }, [resumable])

  const acceptFix = useEffectEvent((fix: Fix) => {
    if (
      !tracking ||
      !Number.isFinite(fix.accuracy) ||
      fix.accuracy > 100 ||
      Date.now() - fix.timestamp > 15000
    )
      return
    lastFix.current = fix
    setStarting(false)
    setPhase('navigating')
    setMessage(null)
    if (currentRoute.current !== route) {
      currentRoute.current = route
      progress.current = 0
    }
    const state = route
      ? routeProgress(route, fix.point, progress.current)
      : null
    setProgressState(state)
    if (state) progress.current = state.along
    const before = smoothed.current
    const smooth: Coordinate =
      before && distanceMeters(before, fix.point) < 100
        ? [
            before[0] + (fix.point[0] - before[0]) * 0.65,
            before[1] + (fix.point[1] - before[1]) * 0.65,
          ]
        : fix.point
    smoothed.current = smooth
    const snapped = route ? routeProgress(route, smooth) : null
    setPosition(snapped && snapped.distance <= 25 ? snapped.point : smooth)
    if (
      destination &&
      (distanceMeters(fix.point, destination) <= 30 ||
        (state && state.distance <= 30 && state.length - state.along <= 15))
    ) {
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
      distanceMeters(fix.point, route.geometry.coordinates[0] ?? fix.point) >
        25 &&
      destination &&
      !pending.current
    ) {
      nextRequest.current = Date.now() + 15000
      pending.current = true
      setRerouting(true)
      cancel()
      const requestGeneration = generation.current
      void reroute(fix.point, destination).finally(() => {
        if (requestGeneration !== generation.current) return
        pending.current = false
        setRerouting(false)
        offRouteSince.current = null
      })
    }
    if (state && state.distance > 50) offRouteSince.current ??= Date.now()
    else offRouteSince.current = null
  })
  const fail = useEffectEvent((permissionDenied: boolean) => {
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
            distanceInterval: 2,
            timeInterval: 1000,
          },
          (fix) => {
            if (active)
              acceptFix({
                point: [fix.coords.longitude, fix.coords.latitude],
                accuracy: fix.coords.accuracy ?? Infinity,
                timestamp: fix.timestamp,
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
    const fix = lastFix.current
    if (
      !tracking ||
      phase !== 'navigating' ||
      !destination ||
      !fix ||
      Date.now() - fix.timestamp > 10000 ||
      offRouteSince.current === null ||
      Date.now() - offRouteSince.current < 5000 ||
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
    void reroute(fix.point, destination).finally(() => {
      if (requestGeneration !== generation.current) return
      pending.current = false
      setRerouting(false)
      offRouteSince.current = null
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
        offRouteSince.current = null
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
