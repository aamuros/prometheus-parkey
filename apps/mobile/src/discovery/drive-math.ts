import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'

import { anchor, distanceMeters } from './model.ts'
import type { DrivingRoute } from './routing.ts'

/** Local geometry only. No location samples are persisted or transmitted here. */
export function projectOnRoute(point: Coordinate, coordinates: Coordinate[]) {
  let best = { point, distance: Infinity, along: 0, index: 0, length: 0 }
  let length = 0
  const scale = Math.cos((point[1] * Math.PI) / 180)
  for (let index = 0; index < coordinates.length - 1; index++) {
    const a = coordinates[index]
    const b = coordinates[index + 1]
    if (!a || !b) continue
    const x = (b[0] - a[0]) * scale
    const y = b[1] - a[1]
    const denominator = x * x + y * y
    const t = denominator
      ? Math.max(
          0,
          Math.min(
            1,
            ((point[0] - a[0]) * scale * x + (point[1] - a[1]) * y) /
              denominator,
          ),
        )
      : 0
    const projected: Coordinate = [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ]
    const distance = distanceMeters(point, projected)
    const segment = distanceMeters(a, b)
    if (distance < best.distance)
      best = {
        point: projected,
        distance,
        along: length + segment * t,
        index,
        length: 0,
      }
    length += segment
  }
  return { ...best, length }
}

export function routeProgress(
  route: DrivingRoute,
  point: Coordinate,
  previous = 0,
) {
  const projection = projectOnRoute(point, route.geometry.coordinates)
  // Keep maneuver progress monotonic, but never advance from a distant GPS fix.
  const along =
    projection.distance <= 50 ? Math.max(previous, projection.along) : previous
  const fraction = projection.length
    ? Math.min(1, along / projection.length)
    : 0
  let stepIndex = 0
  let stepAlong = 0
  for (let i = 1; i < route.steps.length; i++) {
    stepAlong += route.steps[i - 1]?.distance ?? 0
    // OSRM step distances and geometry length can differ slightly.
    if (stepAlong > fraction * route.distance + 12) break
    stepIndex = i
  }
  const nextIndex = Math.min(stepIndex + 1, route.steps.length - 1)
  const next = route.steps[nextIndex]
  const nextAt = route.steps
    .slice(0, nextIndex)
    .reduce((total, step) => total + step.distance, 0)
  return {
    ...projection,
    along,
    fraction,
    next,
    maneuverDistance: Math.max(0, nextAt - fraction * route.distance),
    remainingDistance: Math.max(0, route.distance * (1 - fraction)),
    remainingDuration: Math.max(0, route.duration * (1 - fraction)),
  }
}

export function splitRoute(route: DrivingRoute, along: number) {
  const traveled: Coordinate[] = []
  const remaining: Coordinate[] = []
  let length = 0
  for (let i = 0; i < route.geometry.coordinates.length - 1; i++) {
    const a = route.geometry.coordinates[i]
    const b = route.geometry.coordinates[i + 1]
    if (!a || !b) continue
    const segment = distanceMeters(a, b)
    if (length + segment < along) traveled.push(a)
    else if (length <= along) {
      const t = segment ? (along - length) / segment : 0
      const point: Coordinate = [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
      ]
      traveled.push(a, point)
      remaining.push(point, b)
    } else remaining.push(b)
    length += segment
  }
  if (!remaining.length) remaining.push(...route.geometry.coordinates.slice(-2))
  return { traveled, remaining }
}

export function nextParking(
  records: DiscoveryParking[],
  current: DiscoveryParking,
  from: Coordinate,
  rejected: ReadonlySet<string>,
) {
  return (
    records
      .filter(
        (record) =>
          record.id !== current.id &&
          !rejected.has(record.id) &&
          record.kind === current.kind &&
          record.sourceKind !== 'sample',
      )
      .sort(
        (a, b) =>
          distanceMeters(from, anchor(a.geometry)) -
          distanceMeters(from, anchor(b.geometry)),
      )[0] ?? null
  )
}

export function arrivalTime(seconds: number, now = Date.now()) {
  return new Date(now + seconds * 1000).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
