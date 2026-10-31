import type {
  Coordinate,
  DiscoveryParking,
  ParkingContribution,
  ParkingGeometry,
  ParkingKind,
} from '@parkey/shared-types'

export const PILOT_CENTER: Coordinate = [121.0308, 14.5653]
export type Viewport = {
  west: number
  south: number
  east: number
  north: number
  zoom: number
}
export const PILOT_VIEWPORT: Viewport = {
  west: 121.024,
  south: 14.558,
  east: 121.041,
  north: 14.572,
  zoom: 15.5,
}
export type ParkingReference = {
  coordinate: Coordinate
  label: 'destination' | 'your location' | 'map center'
}

export function parkingReference(
  destination: Coordinate | null,
  location: Coordinate | null,
  viewport: Viewport,
): ParkingReference {
  if (destination) return { coordinate: destination, label: 'destination' }
  if (location) return { coordinate: location, label: 'your location' }
  return {
    coordinate: [
      (viewport.west + viewport.east) / 2,
      (viewport.south + viewport.north) / 2,
    ],
    label: 'map center',
  }
}

export function inPilotCoverage(viewport: Viewport) {
  return (
    viewport.east >= PILOT_VIEWPORT.west &&
    viewport.west <= PILOT_VIEWPORT.east &&
    viewport.north >= PILOT_VIEWPORT.south &&
    viewport.south <= PILOT_VIEWPORT.north
  )
}
export type ParkingFilter = 'all' | 'street' | 'facilities'
export const kindLabels: Record<ParkingKind, string> = {
  street: 'Street parking',
  lot: 'Parking lot',
  garage: 'Garage',
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isCoordinate(value: unknown): value is Coordinate {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 85.051129
  )
}

export function isGeometry(value: unknown): value is ParkingGeometry {
  if (!isObject(value)) return false
  if (value.type === 'Point') return isCoordinate(value.coordinates)
  return (
    value.type === 'LineString' &&
    Array.isArray(value.coordinates) &&
    value.coordinates.length >= 2 &&
    value.coordinates.length <= 500 &&
    value.coordinates.every(isCoordinate) &&
    new Set(value.coordinates.map((point) => point.join(','))).size > 1
  )
}

export function geometryMatchesKind(
  geometry: ParkingGeometry,
  kind: ParkingKind,
) {
  return (kind === 'street') === (geometry.type === 'LineString')
}

export function anchor(geometry: ParkingGeometry): Coordinate {
  if (geometry.type === 'Point') return geometry.coordinates
  const middle = Math.floor((geometry.coordinates.length - 1) / 2)
  const first = geometry.coordinates[middle]
  const second = geometry.coordinates[middle + 1]
  if (!first || !second) throw new Error('A street segment needs two points')
  return [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2]
}

export function distanceMeters(a: Coordinate, b: Coordinate) {
  const rad = Math.PI / 180
  const latitude = Math.sin(((b[1] - a[1]) * rad) / 2) ** 2
  const longitude = Math.sin(((b[0] - a[0]) * rad) / 2) ** 2
  const h = latitude + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * longitude
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)))
}

export function distanceLabel(
  from: Coordinate | null,
  to: Coordinate,
  referenceLabel = 'your location',
) {
  if (!from) return 'Distance unavailable'
  const meters = distanceMeters(from, to)
  return meters < 1000
    ? `${Math.round(meters / 10) * 10} m from ${referenceLabel} · straight line`
    : `${(meters / 1000).toFixed(1)} km from ${referenceLabel} · straight line`
}

export function rankParking(
  records: DiscoveryParking[],
  reference: Coordinate,
) {
  return records
    .map((record) => ({
      record,
      distance: distanceMeters(reference, anchor(record.geometry)),
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        (a.record.id < b.record.id ? -1 : a.record.id > b.record.id ? 1 : 0),
    )
    .map(({ record }) => record)
}

export function dateLabel(date: string | null) {
  return date
    ? new Date(date).toLocaleDateString('en-PH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Information unavailable'
}

export function inViewport(geometry: ParkingGeometry, bounds: Viewport) {
  const points =
    geometry.type === 'Point' ? [geometry.coordinates] : geometry.coordinates
  // Bounding-box intersection includes lines crossing the viewport without a vertex inside.
  return (
    Math.max(...points.map((p) => p[0])) >= bounds.west &&
    Math.min(...points.map((p) => p[0])) <= bounds.east &&
    Math.max(...points.map((p) => p[1])) >= bounds.south &&
    Math.min(...points.map((p) => p[1])) <= bounds.north
  )
}

export function filterParking(
  records: DiscoveryParking[],
  filter: ParkingFilter,
) {
  return records.filter(
    (record) =>
      filter === 'all' ||
      (filter === 'street'
        ? record.kind === 'street'
        : record.kind !== 'street'),
  )
}

export function queryableViewport(view: Viewport) {
  return (
    view.zoom >= 12 &&
    [view.west, view.south, view.east, view.north, view.zoom].every(
      Number.isFinite,
    ) &&
    view.west >= -180 &&
    view.east <= 180 &&
    view.south >= -85.051129 &&
    view.north <= 85.051129 &&
    view.west < view.east &&
    view.south < view.north &&
    view.east - view.west <= 0.5 &&
    view.north - view.south <= 0.5
  )
}

export function directionsUrl(
  point: Coordinate,
  provider: 'apple' | 'google' | 'waze',
) {
  const position = `${point[1]},${point[0]}`
  if (provider === 'apple')
    return `https://maps.apple.com/?daddr=${position}&dirflg=d`
  if (provider === 'waze')
    return `https://waze.com/ul?ll=${position}&navigate=yes`
  return `https://www.google.com/maps/dir/?api=1&destination=${position}&travelmode=driving`
}

export function validateContribution(
  draft: ParkingContribution,
  existing: ParkingContribution[],
  now: number,
) {
  if (
    !isGeometry(draft.geometry) ||
    !geometryMatchesKind(draft.geometry, draft.kind)
  )
    return 'Choose a location, or at least two points for a street segment.'
  if (draft.geometry.type === 'LineString') {
    let length = 0
    for (let i = 1; i < draft.geometry.coordinates.length; i++) {
      const a = draft.geometry.coordinates[i - 1]
      const b = draft.geometry.coordinates[i]
      if (a && b) length += distanceMeters(a, b)
    }
    if (length < 5 || length > 1000)
      return 'Street segments must be between 5 m and 1 km long.'
  }
  if (draft.intent === 'correction' && !draft.targetId)
    return 'Choose the parking record to report.'
  if (
    (draft.intent === 'correction' && draft.name.trim().length < 3) ||
    draft.name.length > 100
  )
    return 'Use a name or street description between 3 and 100 characters.'
  if (
    [draft.restrictions, draft.hours, draft.fees].some(
      (value) => value.length > 500,
    )
  )
    return 'Keep each optional field under 500 characters.'
  if (draft.intent === 'correction' && !draft.restrictions.trim())
    return 'Describe what needs correcting.'
  if (existing.length >= 20)
    return 'This device has 20 local previews. Delete one before adding another.'
  if (existing.some((item) => now - Date.parse(item.createdAt) < 30000))
    return 'Please wait 30 seconds before saving another preview.'
  if (
    existing.some(
      (item) =>
        item.intent === draft.intent &&
        item.kind === draft.kind &&
        item.name.trim().toLowerCase() === draft.name.trim().toLowerCase() &&
        distanceMeters(anchor(item.geometry), anchor(draft.geometry)) < 15,
    )
  )
    return 'A similar preview is already saved on this device.'
  return null
}
