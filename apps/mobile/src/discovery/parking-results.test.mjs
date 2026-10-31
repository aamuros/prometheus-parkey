import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'

import { anchor } from './model.ts'
import {
  mergeParking,
  parkingLoadReducer,
  scheduleParkingRefresh,
} from './parking-results.ts'
import { sampleParking } from './sample-data.ts'

const view = {
  west: 121.024,
  south: 14.558,
  east: 121.041,
  north: 14.572,
  zoom: 15.5,
}
const initial = { records: sampleParking, truncated: true, status: 'idle' }

test('refreshes retain previous results until a successful replacement, including empty results', () => {
  const loading = parkingLoadReducer(initial, { type: 'loading' })
  assert.equal(loading.records, sampleParking)
  assert.equal(loading.truncated, true)
  assert.equal(loading.status, 'loading')
  const failed = parkingLoadReducer(loading, { type: 'error' })
  assert.equal(failed.records, sampleParking)
  assert.equal(failed.truncated, true)
  assert.equal(failed.status, 'error')
  assert.deepEqual(
    parkingLoadReducer(failed, {
      type: 'success',
      result: { records: [], truncated: false },
    }),
    { records: [], truncated: false, status: 'idle' },
  )
})

test('retained records stay viewport-limited and source-aware without merging unknown sources', () => {
  const original = {
    ...sampleParking[0],
    sourceUrl: 'https://example.test/osm/1',
  }
  const newer = { ...original, id: 'new', fees: null, hours: null }
  const unknown = { ...sampleParking[1], sourceUrl: null }
  const anotherUnknown = { ...sampleParking[2], sourceUrl: null }
  const outside = {
    ...sampleParking[0],
    id: 'outside',
    sourceUrl: 'https://example.test/outside',
    geometry: { type: 'Point', coordinates: [120, 14] },
  }
  const merged = mergeParking(
    [original, unknown],
    [newer, anotherUnknown, outside],
    view,
  )
  assert.deepEqual(
    merged.map((record) => record.id),
    [unknown.id, newer.id, anotherUnknown.id],
  )
  assert.equal(merged[1].fees, null)
  assert.equal(merged[1].hours, null)
  assert.deepEqual(mergeParking([original], [newer], { ...view, zoom: 10 }), [])
  const [lng, lat] = anchor(original.geometry)
  const distantView = {
    west: lng + 1,
    east: lng + 1.01,
    south: lat,
    north: lat + 0.01,
    zoom: 16,
  }
  assert.deepEqual(mergeParking([original], [newer], distantView), [])
})

test('refresh debounces requests, then publishes success or a recoverable failure', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let state = initial
  let requests = 0
  const dispatch = (event) => {
    state = parkingLoadReducer(state, event)
  }
  const cancel = scheduleParkingRefresh(async () => {
    requests++
    return { records: [], truncated: false }
  }, dispatch)
  t.after(cancel)
  t.mock.timers.tick(399)
  assert.equal(requests, 0)
  t.mock.timers.tick(1)
  assert.equal(state.status, 'loading')
  assert.equal(state.records, sampleParking)
  await setImmediate()
  assert.equal(requests, 1)
  assert.deepEqual(state, { records: [], truncated: false, status: 'idle' })
  const fail = scheduleParkingRefresh(async () => {
    throw new Error('offline')
  }, dispatch)
  t.after(fail)
  t.mock.timers.tick(400)
  await setImmediate()
  assert.equal(state.status, 'error')
  assert.deepEqual(state.records, [])
})

test('cancelled refreshes do not start or publish stale results after a newer request', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const events = []
  const cancelledBeforeStart = scheduleParkingRefresh(
    async () => {
      assert.fail('cancelled debounce must not fetch')
    },
    (event) => events.push(event),
  )
  cancelledBeforeStart()
  t.mock.timers.tick(400)
  assert.equal(events.length, 0)

  let oldSignal
  let completeOld
  const cancelOld = scheduleParkingRefresh(
    (signal) => {
      oldSignal = signal
      return new Promise((resolve) => {
        completeOld = resolve
      })
    },
    (event) => events.push(event),
  )
  t.mock.timers.tick(400)
  cancelOld()
  assert.equal(oldSignal.aborted, true)
  const cancelNew = scheduleParkingRefresh(
    async () => ({ records: [], truncated: false }),
    (event) => events.push(event),
  )
  t.after(cancelNew)
  t.mock.timers.tick(400)
  await setImmediate()
  completeOld({ records: sampleParking, truncated: true })
  await setImmediate()
  assert.deepEqual(
    events.map((event) => event.type),
    ['loading', 'loading', 'success'],
  )
  assert.deepEqual(events.at(-1).result.records, [])
})

test('timeout retains results and ignores a late response even if the provider ignores abort', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let state = initial
  let signal
  let complete
  const cancel = scheduleParkingRefresh(
    (requestSignal) => {
      signal = requestSignal
      return new Promise((resolve) => {
        complete = resolve
      })
    },
    (event) => {
      state = parkingLoadReducer(state, event)
    },
  )
  t.after(cancel)
  t.mock.timers.tick(400)
  t.mock.timers.tick(12000)
  assert.equal(signal.aborted, true)
  assert.equal(state.status, 'error')
  assert.equal(state.records, sampleParking)
  complete({ records: [], truncated: false })
  await setImmediate()
  assert.equal(state.status, 'error')
  assert.equal(state.records, sampleParking)
})
