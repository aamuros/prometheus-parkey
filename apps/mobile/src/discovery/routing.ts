import type { Coordinate } from '@parkey/shared-types'

import { config } from './config.ts'
import { isCoordinate, isObject } from './model.ts'

export type DrivingStep = {
  instruction: string
  road: string
  maneuver: string
  modifier: string
  distance: number
  location: Coordinate
}
export type DrivingRoute = {
  geometry: { type: 'LineString'; coordinates: Coordinate[] }
  distance: number
  duration: number
  steps: DrivingStep[]
}

class RoutingError extends Error {}

function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function roadName(step: Record<string, unknown>) {
  const name = typeof step.name === 'string' ? step.name.trim() : ''
  const ref = typeof step.ref === 'string' ? step.ref.trim() : ''
  return name || ref
}

function instruction(maneuver: Record<string, unknown>, road: string): string {
  const onto = road ? ` onto ${road}` : ''
  const along = road ? ` on ${road}` : ''
  const rawModifier =
    typeof maneuver.modifier === 'string' ? maneuver.modifier : ''
  const turns: Record<string, string> = {
    left: 'Turn left',
    right: 'Turn right',
    'slight left': 'Bear left',
    'slight right': 'Bear right',
    'sharp left': 'Turn sharply left',
    'sharp right': 'Turn sharply right',
    straight: 'Continue straight',
    uturn: 'Make a U-turn',
  }
  const modifier = Object.hasOwn(turns, rawModifier) ? rawModifier : ''
  const turn = turns[modifier] || 'Follow the route'
  const side = modifier.includes('left')
    ? ' left'
    : modifier.includes('right')
      ? ' right'
      : ''
  switch (maneuver.type) {
    case 'depart': {
      const bearing = maneuver.bearing_after
      const headings = [
        'north',
        'northeast',
        'east',
        'southeast',
        'south',
        'southwest',
        'west',
        'northwest',
      ]
      const heading =
        nonnegative(bearing) && bearing <= 360
          ? headings[Math.round(bearing / 45) % 8]
          : undefined
      return heading ? `Head ${heading}${along}` : `Start driving${along}`
    }
    case 'arrive':
      return `Arrive at your destination${side ? ` on the${side}` : ''}`
    case 'turn':
      return `${turn}${onto}`
    case 'end of road':
      return `At the end of the road, ${turn.toLowerCase()}${onto}`
    case 'merge':
      return `Merge${side}${onto}`
    case 'on ramp':
      return `Take the ramp${side}${onto}`
    case 'off ramp':
      return `Take the exit${side}${onto}`
    case 'fork':
      return side ? `Keep${side}${onto}` : `Continue${along}`
    case 'roundabout':
    case 'rotary':
      return typeof maneuver.exit === 'number' &&
        Number.isInteger(maneuver.exit) &&
        maneuver.exit > 0
        ? `At the roundabout, take exit ${maneuver.exit}${onto}`
        : `Enter the roundabout${along}`
    case 'roundabout turn':
      return `At the roundabout, ${turn.toLowerCase()}${onto}`
    case 'exit roundabout':
    case 'exit rotary':
      return `Exit the roundabout${onto}`
    case 'continue':
    case 'new name':
    case 'notification':
      return modifier === 'uturn' ? `Make a U-turn${onto}` : `Continue${along}`
    default:
      return `Follow the route${along}`
  }
}

export function parseDrivingRoute(value: unknown): DrivingRoute {
  if (
    isObject(value) &&
    (value.code === 'NoRoute' || value.code === 'NoSegment')
  )
    throw new RoutingError(
      'No driving route was found. Try another start or destination.',
    )
  const invalid = () =>
    new RoutingError('The routing service returned an invalid route.')
  if (!isObject(value) || value.code !== 'Ok' || !Array.isArray(value.routes))
    throw invalid()
  const route: unknown = value.routes[0]
  if (
    !isObject(route) ||
    !nonnegative(route.distance) ||
    !nonnegative(route.duration) ||
    !isObject(route.geometry) ||
    route.geometry.type !== 'LineString' ||
    !Array.isArray(route.geometry.coordinates) ||
    route.geometry.coordinates.length < 2 ||
    route.geometry.coordinates.length > 50000 ||
    !route.geometry.coordinates.every(isCoordinate) ||
    !Array.isArray(route.legs) ||
    route.legs.length !== 1
  )
    throw invalid()
  const leg: unknown = route.legs[0]
  if (
    !isObject(leg) ||
    !Array.isArray(leg.steps) ||
    !leg.steps.length ||
    leg.steps.length > 2000
  )
    throw invalid()
  const steps = leg.steps.map((step: unknown): DrivingStep => {
    if (
      !isObject(step) ||
      !nonnegative(step.distance) ||
      !isObject(step.maneuver) ||
      typeof step.maneuver.type !== 'string' ||
      !isCoordinate(step.maneuver.location)
    )
      throw invalid()
    return {
      instruction: instruction(step.maneuver, roadName(step)),
      road: roadName(step),
      maneuver: step.maneuver.type,
      modifier:
        typeof step.maneuver.modifier === 'string'
          ? step.maneuver.modifier
          : '',
      distance: step.distance,
      location: step.maneuver.location,
    }
  })
  return {
    geometry: { type: 'LineString', coordinates: route.geometry.coordinates },
    distance: route.distance,
    duration: route.duration,
    steps,
  }
}

export async function fetchDrivingRoute(
  from: Coordinate,
  to: Coordinate,
  signal: AbortSignal,
  {
    endpoint = config.routingUrl,
    fetcher = fetch,
    userAgent,
  }: { endpoint?: string; fetcher?: typeof fetch; userAgent?: string } = {},
): Promise<DrivingRoute> {
  if (!endpoint)
    throw new Error(
      'Directions aren’t available right now. Please try again later.',
    )
  if (!isCoordinate(from) || !isCoordinate(to))
    throw new Error('A valid start and destination are needed for directions.')
  let base: URL
  try {
    base = new URL(endpoint.endsWith('/') ? endpoint : `${endpoint}/`)
  } catch (error) {
    throw new Error(
      'Directions aren’t available right now. Please try again later.',
      {
        cause: error,
      },
    )
  }
  if (
    !['https:', 'http:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new Error(
      'Directions aren’t available right now. Please try again later.',
    )
  const url = new URL(
    `route/v1/driving/${from.join(',')};${to.join(',')}`,
    base,
  )
  url.search = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
    alternatives: 'false',
    generate_hints: 'false',
  }).toString()
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal.addEventListener('abort', cancel, { once: true })
  if (signal.aborted) controller.abort()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 15000)
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (userAgent) headers['User-Agent'] = userAgent
    const response = await fetcher(url.toString(), {
      headers,
      signal: controller.signal,
    })
    if (response.status === 429)
      throw new RoutingError(
        'The routing service is busy. Wait a moment and try again.',
      )
    if (!response.ok) {
      const value: unknown = await response.json().catch(() => null)
      if (
        isObject(value) &&
        (value.code === 'NoRoute' || value.code === 'NoSegment')
      )
        parseDrivingRoute(value)
      throw new RoutingError(
        'The routing service is unavailable. Try again shortly.',
      )
    }
    return parseDrivingRoute(await response.json())
  } catch (error) {
    if (timedOut)
      throw new Error('The route request took too long. Please try again.', {
        cause: error,
      })
    if (signal.aborted || error instanceof RoutingError) throw error
    throw new Error(
      'Directions could not be loaded. Check your connection and try again.',
      { cause: error },
    )
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', cancel)
  }
}

export function routeBounds(route: DrivingRoute): [Coordinate, Coordinate] {
  let west = 180,
    south = 90,
    east = -180,
    north = -90
  for (const [longitude, latitude] of route.geometry.coordinates) {
    west = Math.min(west, longitude)
    south = Math.min(south, latitude)
    east = Math.max(east, longitude)
    north = Math.max(north, latitude)
  }
  return [
    [west, south],
    [east, north],
  ]
}

export function routeDistance(meters: number) {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`
}

export function routeDuration(seconds: number) {
  if (seconds < 60) return '<1 min'
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ''}`
}
