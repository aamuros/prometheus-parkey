import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDriveTracker,
  shouldReroute,
  trackDriveFix,
} from './drive-tracking.ts'

const epoch = 1000000
const makeRoute = (coordinates) => ({
  geometry: { type: 'LineString', coordinates },
  distance: 1000,
  duration: 120,
  steps: coordinates.map((location, index) => ({
    location,
    distance:
      index === coordinates.length - 1 ? 0 : 1000 / (coordinates.length - 1),
    instruction: String(index),
    road: '',
    maneuver: index === coordinates.length - 1 ? 'arrive' : 'turn',
    modifier: '',
  })),
})
const northbound = makeRoute([
  [0, 0],
  [0, 0.01],
])
const short = makeRoute([
  [0, 0],
  [0, 0.0005],
])
const fix = (point, seconds, options = {}) => ({
  point,
  accuracy: 5,
  timestamp: epoch + seconds * 1000,
  ...options,
})
function update(tracker, route, point, seconds, options) {
  return trackDriveFix(
    tracker,
    route,
    fix(point, seconds, options),
    epoch + seconds * 1000,
  )
}

test('invalid, stale, future, duplicate, out-of-order and teleported fixes cannot change navigation', () => {
  const tracker = update(createDriveTracker(), northbound, [0, 0], 0)
  const now = epoch + 1000
  const invalid = [
    fix([0, 0], 1, { accuracy: -1 }),
    fix([0, 0], 1, { accuracy: Infinity }),
    fix([0, 0], 1, { accuracy: 101 }),
    fix([NaN, 0], 1),
    fix([0, 90], 1),
    fix([0, 0], 1, { timestamp: NaN }),
    fix([0, 0], -11),
    fix([0, 0], 3),
    fix([0, 0], 0),
    fix([0, 0], -1),
    fix([0, 0.01], 1),
  ]
  for (const sample of invalid)
    assert.equal(trackDriveFix(tracker, northbound, sample, now), tracker)
})

test('uncertain fixes display their raw position and cannot advance guidance or confirm arrival', () => {
  let tracker = update(createDriveTracker(), short, [0, 0], 0)
  for (let seconds = 2; seconds <= 8; seconds++) {
    const point = [0, 0.0005]
    tracker = update(tracker, short, point, seconds, { accuracy: 80 })
    assert.deepEqual(tracker.position, point)
    assert.equal(tracker.progress.along, 0)
    assert.equal(tracker.progress.matched, false)
    assert.equal(tracker.arrived, false)
    assert.equal(shouldReroute(tracker, epoch + seconds * 1000), false)
  }
})

test('starting beside a destination does not finish a route that loops back to it', () => {
  const loop = makeRoute([
    [0, 0],
    [0, 0.001],
    [0.001, 0.001],
    [0.001, 0],
    [0, 0],
  ])
  let tracker = createDriveTracker()
  for (let seconds = 0; seconds <= 6; seconds++) {
    tracker = update(tracker, loop, [0, 0], seconds)
    assert.equal(tracker.progress.along, 0)
    assert.equal(tracker.arrived, false)
    assert.ok(tracker.progress.remainingDistance > 900)
  }
})

test('arrival requires multiple accurate fixes at the end of the route', () => {
  const endpoint = short.geometry.coordinates.at(-1)
  let tracker = createDriveTracker()
  for (let seconds = 0; seconds < 2; seconds++) {
    tracker = update(tracker, short, endpoint, seconds, { speed: 0 })
    assert.equal(tracker.arrived, false)
  }
  tracker = update(tracker, short, endpoint, 2, { speed: 0 })
  assert.equal(tracker.arrived, true)
})

test('passing the endpoint at driving speed and gaps in GPS do not confirm arrival', () => {
  const endpoint = short.geometry.coordinates.at(-1)
  let tracker = createDriveTracker()
  for (let seconds = 0; seconds < 4; seconds++) {
    tracker = update(tracker, short, endpoint, seconds, { speed: 12 })
    assert.equal(tracker.arrived, false)
  }
  tracker = update(tracker, short, endpoint, 4, { speed: 0 })
  tracker = update(tracker, short, endpoint, 8, { speed: 0 })
  assert.equal(tracker.arrived, false)
  tracker = update(tracker, short, endpoint, 9, { speed: 0 })
  assert.equal(tracker.arrived, false)
  tracker = update(tracker, short, endpoint, 10, { speed: 0 })
  assert.equal(tracker.arrived, true)
})

test('rerouting needs sustained fresh off-route samples, rather than elapsed time after one fix', () => {
  let tracker = update(createDriveTracker(), northbound, [0, 0], 0)
  tracker = update(tracker, northbound, [0.0006, 0], 2)
  assert.equal(shouldReroute(tracker, epoch + 8000), false)
  tracker = update(tracker, northbound, [0.0006, 0], 7)
  assert.equal(shouldReroute(tracker, epoch + 7000), false)
  for (let seconds = 8; seconds <= 12; seconds++)
    tracker = update(tracker, northbound, [0.0006, 0], seconds)
  assert.equal(shouldReroute(tracker, epoch + 12000), true)
  assert.equal(shouldReroute(tracker, epoch + 15000), false)
  tracker = update(tracker, northbound, [0.0006, 0], 13, { accuracy: 80 })
  assert.equal(shouldReroute(tracker, epoch + 13000), false)
})

test('persistent wrong-way travel triggers rerouting without advancing maneuvers', () => {
  let tracker = update(createDriveTracker(), northbound, [0, 0.0005], 0, {
    heading: 0,
    speed: 5,
  })
  const along = tracker.progress.along
  for (let seconds = 1; seconds <= 6; seconds++) {
    tracker = update(
      tracker,
      northbound,
      [0, 0.0005 - seconds * 0.00004],
      seconds,
      { heading: 180, speed: 5 },
    )
    assert.equal(tracker.progress.along, along)
    assert.equal(tracker.progress.wrongWay, true)
    assert.equal(tracker.heading, 180)
  }
  assert.equal(shouldReroute(tracker, epoch + 6000), true)
})

test('unreliable stationary compass headings cannot cause wrong-way reroutes', () => {
  let tracker = createDriveTracker()
  for (let seconds = 0; seconds <= 8; seconds++) {
    tracker = update(tracker, northbound, [0, 0.0002], seconds, {
      heading: 180,
      speed: 0,
    })
    assert.equal(tracker.progress.wrongWay, false)
    assert.equal(tracker.heading, null)
    assert.equal(tracker.progress.matched, true)
    assert.equal(shouldReroute(tracker, epoch + seconds * 1000), false)
  }
})

test('a replacement route resets progress and arrival evidence', () => {
  const endpoint = short.geometry.coordinates.at(-1)
  let tracker = update(createDriveTracker(), short, endpoint, 0)
  tracker = update(tracker, short, endpoint, 1)
  const replacement = makeRoute([endpoint, [0, 0.002]])
  tracker = update(tracker, replacement, endpoint, 2)
  assert.equal(tracker.progress.along, 0)
  assert.equal(tracker.progress.remainingDistance, replacement.distance)
  assert.equal(tracker.arrival, null)
  assert.equal(tracker.deviation, null)
  assert.equal(tracker.arrived, false)
})

test('zero-length routes and duplicate geometry points still allow accurate arrival', () => {
  const alreadyThere = makeRoute([
    [0, 0],
    [0, 0],
  ])
  alreadyThere.distance = 0
  alreadyThere.duration = 0
  alreadyThere.steps.forEach((step) => {
    step.distance = 0
  })
  let tracker = createDriveTracker()
  for (let seconds = 0; seconds <= 2; seconds++)
    tracker = update(tracker, alreadyThere, [0, 0], seconds)
  assert.equal(tracker.arrived, true)
  assert.equal(tracker.progress.remainingDistance, 0)
  assert.equal(tracker.progress.remainingDuration, 0)
  assert.equal(tracker.progress.matched, true)
})
