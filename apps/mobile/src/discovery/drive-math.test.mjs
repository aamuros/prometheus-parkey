import assert from 'node:assert/strict'
import test from 'node:test'

import {
  nextParking,
  projectOnRoute,
  routeProgress,
  splitRoute,
} from './drive-math.ts'
import { parseDrivingRoute } from './routing.ts'

const coordinates = [
  [121, 14],
  [121, 14.001],
  [121.001, 14.001],
  [121.002, 14.001],
]
const route = {
  geometry: { type: 'LineString', coordinates },
  distance: 330,
  duration: 90,
  steps: coordinates.map((location, index) => ({
    location,
    distance: index === 3 ? 0 : 110,
    instruction: String(index),
    road: '',
    maneuver: index === 3 ? 'arrive' : 'turn',
    modifier: 'right',
  })),
}

test('projection measures distance to segments and progress along the route', () => {
  const near = projectOnRoute([121.0005, 14.0011], coordinates)
  assert.ok(near.distance > 10 && near.distance < 12)
  assert.ok(near.along > 160 && near.along < 170)
  assert.ok(near.length > 320 && near.length < 335)
  const far = projectOnRoute([121.0005, 14.002], coordinates)
  assert.ok(far.distance > 100)
})
test('passing a maneuver advances the next instruction and decreases estimates', () => {
  const before = routeProgress(route, coordinates[0])
  const after = routeProgress(route, [121.0003, 14.001])
  assert.equal(before.next.instruction, '1')
  assert.equal(after.next.instruction, '2')
  assert.ok(after.remainingDistance < before.remainingDistance)
  assert.ok(after.remainingDuration < before.remainingDuration)
  const jitter = routeProgress(route, coordinates[0], after.along)
  assert.equal(jitter.along, after.along)
  const off = routeProgress(route, [121.001, 14.01], after.along)
  assert.equal(off.along, after.along)
})
test('a turn remains active before and through the junction', () => {
  const before = routeProgress(route, [121, 14.00094])
  assert.equal(before.next.instruction, '1')
  assert.ok(before.maneuverDistance > 5 && before.maneuverDistance < 8)
  const at = routeProgress(route, coordinates[1], before.along)
  assert.equal(at.next.instruction, '1')
  assert.equal(at.maneuverDistance, 0)
  const after = routeProgress(route, [121.0001, 14.001], at.along)
  assert.equal(after.next.instruction, '2')
})
test('history prevents skipping ahead at a crossing even when the later road is closer', () => {
  const crossing = [
    [-0.001, 0],
    [0.001, 0],
    [0, -0.001],
    [0, 0.001],
  ]
  const point = [0, 0.00005]
  assert.equal(projectOnRoute(point, crossing).index, 2)
  const matched = projectOnRoute(point, crossing, {
    previous: 100,
    maxAdvance: 30,
    accuracy: 5,
    heading: 90,
  })
  assert.equal(matched.index, 0)
  assert.ok(matched.along > 110 && matched.along < 112)
})
test('travel direction distinguishes closely spaced opposing carriageways', () => {
  const parallel = [
    [0, 0],
    [0, 0.001],
    [0.0001, 0.001],
    [0.0001, 0],
  ]
  const point = [0.00008, 0.0005]
  assert.equal(projectOnRoute(point, parallel).index, 2)
  assert.equal(projectOnRoute(point, parallel, { heading: 0 }).index, 0)
  const returning = projectOnRoute(point, parallel, {
    previous: 150,
    maxAdvance: 50,
    heading: 180,
  })
  assert.equal(returning.index, 2)
})
test('remaining time uses each road step duration rather than a route-wide average speed', () => {
  const points = [
    [0, 0],
    [0, 0.001],
    [0.001, 0.001],
  ]
  const timed = {
    geometry: { type: 'LineString', coordinates: points },
    distance: 222,
    duration: 100,
    steps: points.map((location, index) => ({
      location,
      distance: index < 2 ? 111 : 0,
      duration: [10, 90, 0][index],
      instruction: String(index),
      road: '',
      maneuver: index === 2 ? 'arrive' : 'turn',
      modifier: '',
    })),
  }
  const firstRoad = routeProgress(timed, [0, 0.0005])
  const secondRoad = routeProgress(timed, [0.0005, 0.001])
  assert.ok(Math.abs(firstRoad.remainingDuration - 95) < 0.01)
  assert.ok(Math.abs(secondRoad.remainingDuration - 45) < 0.01)
})
test('maneuver geometry controls turn progress even when provider distances differ', () => {
  const differentDistances = {
    ...route,
    distance: 1000,
    steps: route.steps.map((step, index) => ({
      ...step,
      distance: [50, 450, 500, 0][index],
      geometryDistance:
        index < 3
          ? projectOnRoute(
              coordinates[index + 1],
              coordinates.slice(index, index + 2),
            ).length
          : 0,
    })),
  }
  const before = routeProgress(differentDistances, [121, 14.00094])
  assert.equal(before.next.instruction, '1')
  assert.ok(before.maneuverDistance > 2 && before.maneuverDistance < 4)
  const after = routeProgress(differentDistances, [121.0003, 14.001])
  assert.equal(after.next.instruction, '2')
})
test('the gray and remaining route join exactly at the traveled distance', () => {
  const along = projectOnRoute([121.0005, 14.001], coordinates).along
  const { traveled, remaining } = splitRoute(route, along)
  assert.deepEqual(traveled.at(-1), remaining[0])
  assert.ok(Math.abs(remaining[0][0] - 121.0005) < 0.000001)
  assert.deepEqual(remaining.at(-1), coordinates.at(-1))
})
test('next nearest excludes rejected, current, fictional, and other parking types', () => {
  const record = (id, kind, coordinate, sourceKind = 'osm') => ({
    id,
    kind,
    geometry: { type: 'Point', coordinates: coordinate },
    sourceKind,
  })
  const current = record('current', 'lot', [121, 14])
  const close = record('close', 'lot', [121.001, 14])
  const next = record('next', 'lot', [121.002, 14])
  const records = [
    current,
    close,
    next,
    record('garage', 'garage', [121, 14]),
    record('sample', 'lot', [121, 14], 'sample'),
  ]
  assert.equal(nextParking(records, current, [121, 14], new Set()).id, 'close')
  assert.equal(
    nextParking(records, current, [121, 14], new Set(['close'])).id,
    'next',
  )
  assert.equal(
    nextParking(records, current, [121, 14], new Set(['close', 'next'])),
    null,
  )
})
test('roundabout instructions omit onto for unnamed streets and preserve full names', () => {
  const parse = (name) =>
    parseDrivingRoute({
      code: 'Ok',
      routes: [
        {
          distance: 330,
          duration: 90,
          geometry: route.geometry,
          legs: [
            {
              steps: [
                {
                  name,
                  distance: 330,
                  maneuver: {
                    type: 'roundabout',
                    exit: 2,
                    location: coordinates[0],
                  },
                },
              ],
            },
          ],
        },
      ],
    }).steps[0].instruction
  assert.equal(parse('  '), 'At the roundabout, take exit 2')
  const name = 'A very long real road name '.repeat(12).trim()
  assert.equal(parse(name), `At the roundabout, take exit 2 onto ${name}`)
})

test('navigation marker bearing follows the upcoming route and tolerates duplicate points', async () => {
  const { routeBearing } = await import('./drive-math.ts')
  assert.equal(
    routeBearing([
      [0, 0],
      [0, 1],
    ]),
    0,
  )
  assert.equal(
    routeBearing([
      [0, 0],
      [1, 0],
    ]),
    90,
  )
  assert.equal(
    routeBearing([
      [0, 0],
      [0, -1],
    ]),
    180,
  )
  assert.equal(
    routeBearing([
      [0, 0],
      [-1, 0],
    ]),
    270,
  )
  assert.equal(
    routeBearing([
      [0, 0],
      [0, 0],
      [1, 0],
    ]),
    90,
  )
  assert.equal(routeBearing([]), 0)
})
