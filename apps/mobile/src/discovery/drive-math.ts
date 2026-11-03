import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'

import { anchor, distanceMeters } from './model.ts'
import type { DrivingRoute } from './routing.ts'

type MatchOptions = {
  previous?: number
  maxAdvance?: number
  accuracy?: number
  heading?: number
}
type RouteSegment = {
  a: Coordinate
  b: Coordinate
  scale: number
  x: number
  y: number
  length: number
  start: number
  index: number
  bearing: number
}
type GeometryIndex = { segments: RouteSegment[]; length: number }
// Provider geometry is immutable. Index it once, rather than measuring every
// segment several times on every GPS update.
const geometryIndexes = new WeakMap<Coordinate[], GeometryIndex>()

function geometryIndex(coordinates: Coordinate[]): GeometryIndex {
  const cached = geometryIndexes.get(coordinates)
  if (cached) return cached
  const segments: RouteSegment[] = []
  let length = 0
  for (let index = 0; index < coordinates.length - 1; index++) {
    const a = coordinates[index]
    const b = coordinates[index + 1]
    if (!a || !b) continue
    const scale = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180)
    const x = (b[0] - a[0]) * scale
    const y = b[1] - a[1]
    const segmentLength = distanceMeters(a, b)
    if (segmentLength)
      segments.push({
        a,
        b,
        scale,
        x,
        y,
        length: segmentLength,
        start: length,
        index,
        bearing: ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360,
      })
    length += segmentLength
  }
  const result = { segments, length }
  geometryIndexes.set(coordinates, result)
  return result
}

export function headingDifference(a: number, b: number) {
  return Math.abs(((a - b + 540) % 360) - 180)
}

/** Local, history-aware matching. No GPS samples are stored or sent anywhere. */
export function projectOnRoute(
  point: Coordinate,
  coordinates: Coordinate[],
  options: MatchOptions = {},
) {
  const geometry = geometryIndex(coordinates)
  const first = coordinates[0]
  let best = {
    point: first ?? point,
    distance:
      !geometry.length && first ? distanceMeters(point, first) : Infinity,
    along: 0,
    index: 0,
    bearing: 0,
  }
  let bestScore = Infinity
  const minimum = Math.max(
    0,
    (options.previous ?? 0) - Math.max(20, (options.accuracy ?? 10) * 1.5),
  )
  const maximum = Math.min(
    geometry.length,
    (options.previous ?? 0) + (options.maxAdvance ?? Infinity),
  )
  for (const segment of geometry.segments) {
    const { a, b, x, y, scale, start, length, index, bearing } = segment
    if (start + length < minimum || start > maximum) continue
    const denominator = x * x + y * y
    const t = Math.max(
      0,
      (minimum - start) / length,
      Math.min(
        1,
        (maximum - start) / length,
        ((point[0] - a[0]) * scale * x + (point[1] - a[1]) * y) / denominator,
      ),
    )
    const projected: Coordinate = [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ]
    const distance = distanceMeters(point, projected)
    const along = start + length * t
    const continuity =
      options.previous === undefined
        ? 0
        : Math.abs(along - options.previous) * 0.12
    const direction =
      options.heading === undefined
        ? 0
        : (headingDifference(options.heading, bearing) / 180) * 40
    const score = distance + continuity + direction
    if (score < bestScore) {
      bestScore = score
      best = {
        point: projected,
        distance,
        along,
        index,
        bearing,
      }
    }
  }
  return { ...best, length: geometry.length }
}

type RouteMetrics = {
  offsets: number[]
  distances: number[]
  durations: number[]
}
const metricsIndexes = new WeakMap<DrivingRoute, RouteMetrics>()

function routeMetrics(route: DrivingRoute): RouteMetrics {
  const cached = metricsIndexes.get(route)
  if (cached) return cached
  const { length, segments } = geometryIndex(route.geometry.coordinates)
  const vertices = new Map<string, number[]>()
  for (const segment of segments) {
    const key = segment.a.join(',')
    const at = vertices.get(key) ?? []
    at.push(segment.start)
    vertices.set(key, at)
  }
  const end = route.geometry.coordinates.at(-1)
  if (end) {
    const key = end.join(',')
    vertices.set(key, [...(vertices.get(key) ?? []), length])
  }
  const totalDistance = route.steps.reduce(
    (sum, step) => sum + step.distance,
    0,
  )
  const geometryLength = route.steps.reduce(
    (sum, step) => sum + (step.geometryDistance ?? 0),
    0,
  )
  const useStepGeometry =
    route.steps.every((step) => step.geometryDistance !== undefined) &&
    geometryLength > 0 &&
    Math.abs(geometryLength - length) <= Math.max(5, length * 0.01)
  const stepDurations = route.steps.map(
    (step) =>
      step.duration ??
      (totalDistance ? (step.distance / totalDistance) * route.duration : 0),
  )
  const totalDuration = stepDurations.reduce(
    (sum, duration) => sum + duration,
    0,
  )
  const offsets: number[] = []
  const distances: number[] = []
  const durations: number[] = []
  let traveled = 0
  let elapsed = 0
  let geometryTraveled = 0
  for (const [index, step] of route.steps.entries()) {
    const expected = totalDistance ? (traveled / totalDistance) * length : 0
    let offset = useStepGeometry
      ? (geometryTraveled / geometryLength) * length
      : expected
    // Full OSRM geometry contains maneuver vertices. This also supports older
    // responses without step geometry, including routes revisiting a junction.
    if (!useStepGeometry) {
      const candidates = vertices.get(step.location.join(',')) ?? []
      let closest = Infinity
      for (const at of candidates) {
        if (at < (offsets.at(-1) ?? 0)) continue
        if (Math.abs(at - expected) < closest) {
          closest = Math.abs(at - expected)
          offset = at
        }
      }
    }
    offsets.push(Math.max(offsets.at(-1) ?? 0, offset))
    distances.push(
      totalDistance ? (traveled / totalDistance) * route.distance : 0,
    )
    durations.push(
      totalDuration ? (elapsed / totalDuration) * route.duration : 0,
    )
    traveled += step.distance
    elapsed += stepDurations[index] ?? 0
    geometryTraveled += step.geometryDistance ?? 0
  }
  offsets.push(length)
  distances.push(route.distance)
  durations.push(route.duration)
  const result = { offsets, distances, durations }
  metricsIndexes.set(route, result)
  return result
}

export function routeProgress(
  route: DrivingRoute,
  point: Coordinate,
  previous?: number,
  options: Omit<MatchOptions, 'previous'> = {},
) {
  const projection = projectOnRoute(point, route.geometry.coordinates, {
    ...options,
    ...(previous === undefined ? {} : { previous }),
  })
  const wrongWay =
    projection.length > 0 &&
    options.heading !== undefined &&
    headingDifference(options.heading, projection.bearing) > 110
  const matched =
    (options.accuracy ?? 10) <= 40 &&
    projection.distance <=
      Math.min(35, Math.max(15, (options.accuracy ?? 10) * 1.5)) &&
    !wrongWay
  const along = matched
    ? Math.max(previous ?? 0, projection.along)
    : (previous ?? 0)
  const fraction = projection.length
    ? Math.min(1, along / projection.length)
    : 0
  const { offsets, distances, durations } = routeMetrics(route)
  let stepIndex = 0
  for (let i = 1; i < route.steps.length; i++) {
    // Keep a turn visible through the junction; GPS noise must not dismiss it
    // before the driver has actually passed it.
    if ((offsets[i] ?? 0) + 3 > along) break
    stepIndex = i
  }
  const nextIndex = Math.min(stepIndex + 1, route.steps.length - 1)
  const next = route.steps[nextIndex]
  let activeStep = 0
  while (
    activeStep < route.steps.length - 1 &&
    (offsets[activeStep + 1] ?? 0) <= along
  )
    activeStep++
  const start = offsets[activeStep] ?? 0
  const end = offsets[activeStep + 1] ?? projection.length
  const stepFraction =
    end > start ? Math.min(1, (along - start) / (end - start)) : 1
  const interpolate = (values: number[]) => {
    const a = values[activeStep] ?? 0
    const b = values[activeStep + 1] ?? a
    return a + (b - a) * stepFraction
  }
  const traveledDistance = interpolate(distances)
  return {
    ...projection,
    along,
    fraction,
    matched,
    wrongWay,
    next,
    maneuverDistance: Math.max(
      0,
      (distances[nextIndex] ?? 0) - traveledDistance,
    ),
    remainingDistance: Math.max(0, route.distance - traveledDistance),
    remainingDuration: Math.max(0, route.duration - interpolate(durations)),
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

/** Bearing of the next non-zero route segment, clockwise from north. */
export function routeBearing(coordinates: Coordinate[]): number {
  const first = coordinates[0]
  if (!first) return 0
  const next = coordinates.find(
    (point) => point[0] !== first[0] || point[1] !== first[1],
  )
  if (!next) return 0
  const east = (next[0] - first[0]) * Math.cos((first[1] * Math.PI) / 180)
  const north = next[1] - first[1]
  return ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360
}
