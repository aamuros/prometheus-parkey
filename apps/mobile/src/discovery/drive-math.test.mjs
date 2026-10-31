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
