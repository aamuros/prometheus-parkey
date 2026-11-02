import assert from 'node:assert/strict'
import test from 'node:test'

import {
  advanceSheetWheel,
  initialSheetWheel,
  wheelPixels,
} from './sheet-wheel.ts'

test('small trackpad deltas accumulate into one snap, ignoring the momentum tail', () => {
  let gesture = initialSheetWheel
  const steps = []
  for (let index = 0; index < 30; index++) {
    const result = advanceSheetWheel(gesture, 8, index * 16)
    gesture = result.gesture
    steps.push(result.step)
  }
  assert.deepEqual(steps.filter(Boolean), [1])
  assert.equal(advanceSheetWheel(gesture, -60, 490).step, 0)
  assert.equal(advanceSheetWheel(gesture, -60, 700).step, -1)
})

test('reaching a scroll boundary during momentum does not resize or dismiss the sheet', () => {
  const scrolling = advanceSheetWheel(initialSheetWheel, -80, 0, true)
  assert.equal(scrolling.step, 0)
  const boundary = advanceSheetWheel(scrolling.gesture, -60, 16)
  assert.equal(boundary.step, 0)
  assert.equal(advanceSheetWheel(boundary.gesture, -60, 220).step, -1)
})

test('reversing small deltas starts a new distance threshold', () => {
  const first = advanceSheetWheel(initialSheetWheel, 40, 0)
  const reversed = advanceSheetWheel(first.gesture, -10, 16)
  assert.equal(reversed.step, 0)
  assert.equal(reversed.gesture.distance, 10)
  assert.equal(advanceSheetWheel(reversed.gesture, -34, 32).step, -1)
  assert.equal(advanceSheetWheel(first.gesture, 0, 20).gesture, first.gesture)
})

test('mouse line and page deltas use the same pixel threshold as trackpads', () => {
  assert.equal(wheelPixels(3, 0, 600), 3)
  assert.equal(wheelPixels(3, 1, 600), 48)
  assert.equal(wheelPixels(-1, 2, 600), -600)
  assert.equal(
    advanceSheetWheel(initialSheetWheel, wheelPixels(3, 1, 600), 0).step,
    1,
  )
})
