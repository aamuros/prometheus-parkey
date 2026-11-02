import assert from 'node:assert/strict'
import test from 'node:test'

import { discoveryState, isNightNavigation } from './discovery-state.ts'

const browsing = {
  canQuery: true,
  locationDenied: false,
  filteredOut: false,
  loading: false,
  count: 4,
}

test('zoom recovery takes priority and cached records cannot show a nearby list at low zoom', () => {
  assert.equal(
    discoveryState({
      ...browsing,
      canQuery: false,
      locationDenied: true,
      loading: true,
    }),
    'zoomed-out',
  )
})

test('denied location keeps map records available while offering settings recovery', () => {
  assert.equal(
    discoveryState({ ...browsing, locationDenied: true }),
    'location-off',
  )
})

test('refreshing preserves existing nearby results instead of replacing them with skeletons', () => {
  assert.equal(discoveryState({ ...browsing, loading: true }), 'ready')
  assert.equal(
    discoveryState({ ...browsing, count: 0, loading: true, filteredOut: true }),
    'loading',
  )
})

test('filter-hidden and unmapped areas have distinct recovery states', () => {
  assert.equal(
    discoveryState({ ...browsing, count: 0, filteredOut: true }),
    'filtered',
  )
  assert.equal(discoveryState({ ...browsing, count: 0 }), 'empty')
})

test('night styling applies only during navigation and follows local time or dark appearance', () => {
  assert.equal(isNightNavigation(false, 21, 'dark'), false)
  assert.equal(isNightNavigation(true, 12, 'light'), false)
  assert.equal(isNightNavigation(true, 6, null), false)
  assert.equal(isNightNavigation(true, 18, 'light'), true)
  assert.equal(isNightNavigation(true, 5, undefined), true)
  assert.equal(isNightNavigation(true, 12, 'dark'), true)
})
