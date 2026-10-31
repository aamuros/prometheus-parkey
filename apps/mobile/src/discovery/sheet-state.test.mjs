import assert from 'node:assert/strict'
import test from 'node:test'

import {
  initialSheetState,
  sheetHeights,
  sheetReducer,
  snapSheet,
} from './sheet-state.ts'
import { sampleParking } from './sample-data.ts'

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
  assert.equal(sheetHeights(844, 59, 34, false).compact, 154)
  const largeText = sheetHeights(568, 20, 0, false, 2)
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
