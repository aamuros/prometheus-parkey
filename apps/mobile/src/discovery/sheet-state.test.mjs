import assert from 'node:assert/strict'
import test from 'node:test'

import {
  initialSheetState,
  createSheetDragGuard,
  discoveryCameraPadding,
  sheetHeights,
  sheetReducer,
  snapSheet,
} from './sheet-state.ts'
import { sampleParking } from './sample-data.ts'

test('drag-generated clicks cannot undo a sheet snap, while taps and keyboard activation still work', () => {
  const guard = createSheetDragGuard()
  guard.reset()
  assert.equal(guard.allowPress(), true)
  guard.start()
  assert.equal(guard.allowPress(), false)
  assert.equal(guard.allowPress(true), true)
  guard.reset()
  assert.equal(guard.allowPress(), true)
})

test('selecting parking opens a preview and dismissal restores the browsing position', () => {
  const browsing = sheetReducer(initialSheetState, {
    type: 'snap',
    position: 'expanded',
  })
  const selected = sheetReducer(browsing, {
    type: 'select',
    parking: sampleParking[0],
  })
  assert.equal(selected.position, 'medium')
  assert.equal(selected.parking, sampleParking[0])
  const gallery = sheetReducer(selected, { type: 'snap', position: 'expanded' })
  assert.equal(gallery.parking, sampleParking[0])
  const switched = sheetReducer(gallery, {
    type: 'select',
    parking: sampleParking[1],
  })
  assert.equal(switched.position, 'medium')
  assert.equal(switched.parking, sampleParking[1])
  assert.deepEqual(sheetReducer(switched, { type: 'browse' }), browsing)
  assert.equal(initialSheetState.position, 'compact')
  assert.equal(initialSheetState.parking, null)
})

test('selected parking cannot collapse into an empty summary or lose its browsing position', () => {
  const selected = sheetReducer(initialSheetState, {
    type: 'select',
    parking: sampleParking[0],
  })
  const collapsed = sheetReducer(selected, {
    type: 'snap',
    position: 'compact',
  })
  assert.equal(collapsed.position, 'medium')
  assert.equal(collapsed.browsingPosition, 'compact')
  assert.deepEqual(
    sheetReducer(collapsed, { type: 'browse' }),
    initialSheetState,
    discoveryCameraPadding,
  )
})

test('snap heights fit safe areas on small screens, portrait, and landscape', () => {
  for (const [height, top, bottom] of [
    [844, 59, 34],
    [568, 20, 0],
    [320, 0, 21],
    [180, 24, 12],
  ]) {
    for (const selected of [false, true]) {
      const h = sheetHeights(height, top, bottom, selected)
      assert.ok(h.compact > bottom)
      assert.ok(h.compact <= h.medium)
      assert.ok(h.medium <= h.expanded)
      assert.ok(h.expanded <= height - top)
    }
  }
  // The collapsed surface keeps only its handle and search bar above the safe area.
  assert.equal(sheetHeights(844, 59, 34, false, 1, 112).compact, 146)
  const largeText = sheetHeights(568, 20, 0, false, 2, 156)
  assert.ok(largeText.compact > sheetHeights(568, 20, 0, false).compact)
  assert.ok(largeText.medium <= largeText.expanded)
})

test('drag snapping follows distance and swipe direction, retaining selected preview bounds', () => {
  const heights = sheetHeights(844, 59, 34, false)
  assert.equal(snapSheet(heights, heights.compact + 5, 0, false), 'compact')
  assert.equal(snapSheet(heights, heights.medium, 0, false), 'medium')
  assert.equal(snapSheet(heights, heights.expanded - 4, 0, false), 'expanded')
  assert.equal(snapSheet(heights, heights.medium, -2, false), 'expanded')
  assert.equal(snapSheet(heights, heights.medium, 2, false), 'compact')
  assert.equal(snapSheet(heights, -100, 1, true), 'medium')
})

test('the collapsed sheet fits search and large text without reserving a results card', () => {
  for (const [fontScale, headerHeight] of [
    [1, 112],
    [2, 156],
  ]) {
    const heights = sheetHeights(568, 20, 0, false, fontScale, headerHeight)
    assert.ok(heights.compact >= headerHeight + 16)
    assert.ok(heights.compact < heights.medium)
    assert.ok(heights.compact <= (568 - 20) * 0.6)
  }
})

test('camera padding uses the measured top overlay for initial, recentered and resized views', () => {
  assert.deepEqual(discoveryCameraPadding(844, 132, 200), {
    top: 132,
    bottom: 200,
  })
  assert.deepEqual(discoveryCameraPadding(568, 146, 248), {
    top: 146,
    bottom: 248,
  })
  assert.deepEqual(discoveryCameraPadding(568, 200, 500), {
    top: 200,
    bottom: 304,
  })
  assert.deepEqual(discoveryCameraPadding(568, 28, 440), {
    top: 28,
    bottom: 440,
  })
})

test('camera padding always retains a viewport on short screens and rejects negative measurements', () => {
  for (const height of [0, 60, 180, 320, 568]) {
    const padding = discoveryCameraPadding(height, 400, 1000)
    assert.ok(padding.top >= 0 && padding.bottom >= 0)
    assert.ok(padding.top + padding.bottom <= Math.max(0, height - 64))
  }
  assert.deepEqual(discoveryCameraPadding(568, -10, -30), { top: 0, bottom: 0 })
})

test('browse sheets use the full screen above the safe area without a tab bar', () => {
  for (const [height, top, bottom] of [
    [844, 47, 28],
    [568, 20, 0],
    [320, 0, 21],
  ]) {
    const heights = sheetHeights(height, top, bottom, false, 1, 112)
    assert.ok(heights.compact <= heights.medium)
    assert.ok(heights.expanded <= height - top)
    assert.ok(heights.expanded >= (height - top) * 0.9)
    assert.ok(heights.compact < height - top)
  }
})

test('browsing sheets keep floating map controls clear in landscape', () => {
  const screenHeight = 375
  const overlayHeight = 64
  const heights = sheetHeights(screenHeight, 0, 0, false, 1, 96, overlayHeight)
  for (const position of ['compact', 'medium']) {
    assert.ok(screenHeight - heights[position] >= overlayHeight + 12)
  }
  assert.ok(heights.expanded > heights.medium)
  assert.deepEqual(
    sheetHeights(844, 0, 0, true, 1, 96, 183),
    sheetHeights(844, 0, 0, true, 1, 96),
  )
})

test('search sheet snaps stay ordered in the space above a phone keyboard', () => {
  const heights = sheetHeights(844 - 346, 59, 0, false, 1, 112)
  assert.ok(heights.compact < heights.medium)
  assert.ok(heights.medium < heights.expanded)
  assert.ok(heights.expanded <= 844 - 346 - 59)
  assert.equal(snapSheet(heights, heights.compact, 0, false), 'compact')
  assert.equal(snapSheet(heights, heights.expanded, 0, false), 'expanded')
})
