import type { Coordinate } from '@parkey/shared-types'

import { routeBearing, routeProgress } from './drive-math.ts'
import { distanceMeters, isCoordinate } from './model.ts'
import type { DrivingRoute } from './routing.ts'

export type NavigationFix = {
  point: Coordinate
  accuracy: number
  timestamp: number
  heading?: number | null
  speed?: number | null
}
type Evidence = { since: number; last: number; samples: number }
type Deviation = Evidence & { kind: 'off-route' | 'wrong-way' }
export type DriveTracker = {
  route: DrivingRoute | null
  fix: NavigationFix | null
  matchedFix: NavigationFix | null
  progress: ReturnType<typeof routeProgress> | null
  position: Coordinate | null
  heading: number | null
  deviation: Deviation | null
  arrival: Evidence | null
  arrived: boolean
}

export function createDriveTracker(): DriveTracker {
  return {
    route: null,
    fix: null,
    matchedFix: null,
    progress: null,
    position: null,
    heading: null,
    deviation: null,
    arrival: null,
    arrived: false,
  }
}

function usableFix(
  fix: NavigationFix,
  previous: NavigationFix | null,
  now: number,
) {
  if (
    !isCoordinate(fix.point) ||
    !Number.isFinite(fix.accuracy) ||
    fix.accuracy < 0 ||
    fix.accuracy > 100 ||
    !Number.isFinite(fix.timestamp) ||
    now - fix.timestamp > 10000 ||
    fix.timestamp - now > 1000 ||
    (previous && fix.timestamp <= previous.timestamp)
  )
    return false
  if (!previous) return true
  const elapsed = (fix.timestamp - previous.timestamp) / 1000
  // Allow road speeds up to 216 km/h plus both fixes' uncertainty. A single
  // teleported sample must not move the marker or skip maneuvers.
  return (
    distanceMeters(previous.point, fix.point) <=
    Math.max(30, elapsed * 60 + previous.accuracy + fix.accuracy)
  )
}

function travelHeading(fix: NavigationFix, previous: NavigationFix | null) {
  if (
    typeof fix.speed === 'number' &&
    Number.isFinite(fix.speed) &&
    fix.speed >= 2 &&
    fix.speed <= 60 &&
    typeof fix.heading === 'number' &&
    Number.isFinite(fix.heading) &&
    fix.heading >= 0 &&
    fix.heading <= 360
  )
    return fix.heading % 360
  if (
    previous &&
    fix.timestamp - previous.timestamp <= 10000 &&
    distanceMeters(previous.point, fix.point) >
      Math.max(10, previous.accuracy + fix.accuracy)
  )
    return routeBearing([previous.point, fix.point])
  return undefined
}

function addEvidence(previous: Evidence | null, timestamp: number): Evidence {
  return previous && timestamp - previous.last <= 3000
    ? { ...previous, last: timestamp, samples: previous.samples + 1 }
    : { since: timestamp, last: timestamp, samples: 1 }
}

/** Pure foreground navigation update, shared by native and browser watches. */
export function trackDriveFix(
  tracker: DriveTracker,
  route: DrivingRoute | null,
  fix: NavigationFix,
  now = Date.now(),
): DriveTracker {
  if (!usableFix(fix, tracker.fix, now)) return tracker
  const sameRoute = route === tracker.route
  const previous = sameRoute ? tracker.progress : null
  const anchor = sameRoute ? (tracker.matchedFix ?? tracker.fix) : null
  const uncertainty = fix.accuracy + (anchor?.accuracy ?? 0)
  const maxAdvance = anchor
    ? Math.min(
        ((fix.timestamp - anchor.timestamp) / 1000) * 60 + uncertainty,
        Math.max(
          35,
          distanceMeters(anchor.point, fix.point) * 1.5 + uncertainty,
        ),
      )
    : 75
  const heading = travelHeading(fix, tracker.fix)
  const progress = route
    ? routeProgress(route, fix.point, previous?.along ?? 0, {
        accuracy: fix.accuracy,
        maxAdvance,
        ...(heading === undefined ? {} : { heading }),
      })
    : null
  const fresh = now - fix.timestamp <= 2500
  let deviation: Deviation | null = null
  if (fresh && progress && fix.accuracy <= 40) {
    const kind =
      progress.distance > Math.max(50, fix.accuracy * 2)
        ? 'off-route'
        : progress.wrongWay && progress.distance <= 35
          ? 'wrong-way'
          : null
    if (kind)
      deviation = {
        ...addEvidence(
          sameRoute && tracker.deviation?.kind === kind
            ? tracker.deviation
            : null,
          fix.timestamp,
        ),
        kind,
      }
  }
  const endpoint = route?.geometry.coordinates.at(-1)
  const nearArrival =
    fresh &&
    endpoint &&
    progress?.matched &&
    fix.accuracy <= 25 &&
    progress.length - progress.along <= 20 &&
    distanceMeters(fix.point, endpoint) <= Math.max(12, fix.accuracy) &&
    !(typeof fix.speed === 'number' && fix.speed > 5)
  const arrival = nearArrival
    ? addEvidence(sameRoute ? tracker.arrival : null, fix.timestamp)
    : null
  return {
    route,
    fix,
    matchedFix: progress?.matched ? fix : sameRoute ? tracker.matchedFix : null,
    progress,
    position: progress?.matched ? progress.point : fix.point,
    heading: heading ?? null,
    deviation,
    arrival,
    arrived:
      !!arrival && arrival.samples >= 3 && arrival.last - arrival.since >= 2000,
  }
}

export function shouldReroute(tracker: DriveTracker, now = Date.now()) {
  const evidence = tracker.deviation
  return !!(
    evidence &&
    evidence.samples >= 3 &&
    evidence.last - evidence.since >= 5000 &&
    now - evidence.last <= 2500
  )
}
