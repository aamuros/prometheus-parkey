import assert from 'node:assert/strict'
import test from 'node:test'

import {
  developmentSamplesEnabled,
  displaySourceLabel,
  millisecondsToNextMinute,
} from './presentation.ts'

test('development samples require an explicit request and a development build', () => {
  assert.equal(developmentSamplesEnabled(true, 'development'), true)
  assert.equal(developmentSamplesEnabled(false, 'development'), false)
  for (const environment of ['production', 'release', 'test', '', undefined]) {
    assert.equal(developmentSamplesEnabled(true, environment), false)
    assert.equal(developmentSamplesEnabled(false, environment), false)
  }
})

test('source display removes only the exact historical qualifier and preserves attribution', () => {
  assert.equal(
    displaySourceLabel('© OpenStreetMap contributors · pilot snapshot'),
    '© OpenStreetMap contributors',
  )
  for (const label of [
    '© OpenStreetMap contributors',
    'Pilot Parking Company',
    'Pilot Road municipal records',
    'Community observation',
    '© OpenStreetMap contributors · ODbL-1.0',
    '',
  ])
    assert.equal(displaySourceLabel(label), label)
})

test('minute refresh timing reaches the next boundary including midnight without a zero delay', () => {
  for (const [now, expected] of [
    [0, 60000],
    [1, 59999],
    [59999, 1],
    [60000, 60000],
    [60001, 59999],
    [Date.parse('2026-10-31T15:59:59.999Z'), 1],
    [Date.parse('2026-10-31T16:00:00.000Z'), 60000],
    [Date.parse('2026-10-31T23:59:59.999Z'), 1],
  ])
    assert.equal(millisecondsToNextMinute(now), expected)
})

test('invalid clock values use a bounded fallback delay', () => {
  for (const now of [NaN, Infinity, -Infinity, -1, 1.5, 8640000000000001])
    assert.equal(millisecondsToNextMinute(now), 60000)
})
