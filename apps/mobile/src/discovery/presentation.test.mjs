import assert from 'node:assert/strict'
import test from 'node:test'

import {
  developmentSamplesEnabled,
  displaySourceLabel,
  millisecondsToNextMinute,
  parkingTitle,
  parkingRowText,
} from './presentation.ts'
import { sampleParking } from './sample-data.ts'

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

const base = sampleParking[0]
const reference = { coordinate: base.geometry.coordinates, label: 'map center' }
const now = new Date('2026-10-31T04:00:00Z')

test('unnamed titles use the record type without displaying its source', () => {
  for (const [kind, title] of [
    ['lot', 'Parking lot'],
    ['street', 'Street parking'],
    ['garage', 'Garage'],
  ]) {
    for (const name of [
      '',
      '  ',
      'Unnamed parking',
      'Unnamed parking · OpenStreetMap',
    ])
      assert.equal(parkingTitle({ ...base, kind, name }), title)
  }
  assert.equal(
    parkingTitle({ ...base, name: '  Metro Parking  ' }),
    'Metro Parking',
  )
  assert.equal(parkingTitle(base), base.name)
})

test('row distances always identify the reference, with the straight-line note reserved for the header', () => {
  for (const label of ['map center', 'destination', 'your location']) {
    const row = parkingRowText(base, { ...reference, label }, now)
    assert.match(row.distance, new RegExp(`from ${label}$`))
    assert.doesNotMatch(row.distance, /straight line/)
  }
})

test('row facts consolidate missing values and retain only recorded facts', () => {
  const row = (hours, fees) =>
    parkingRowText({ ...base, hours, fees }, reference, now)
  assert.equal(row(null, null).facts, 'Hours and fees not recorded')
  assert.equal(row(' ', ' ').facts, 'Hours and fees not recorded')
  assert.equal(
    row(null, 'Fee applies; amount unavailable').facts,
    'Fee applies; amount unavailable',
  )
  assert.equal(row('24/7', null).facts, 'Open now · recorded schedule')
  assert.equal(
    row('Mo-Fr 08:00-17:00', 'Source rate: PHP 50').facts,
    'Closed · recorded schedule · Source rate: PHP 50',
  )
  assert.equal(
    row('PH off; unknown selector', null).facts,
    'Recorded hours: PH off; unknown selector',
  )
  assert.doesNotMatch(row(null, null).facts, /free|open|available/i)
})

test('verification labels preserve sample and unverified boundaries', () => {
  assert.equal(parkingRowText(base, reference, now).verification, 'Sample')
  assert.equal(
    parkingRowText(
      { ...base, sourceKind: 'osm', verification: 'unverified' },
      reference,
      now,
    ).verification,
    'Unverified',
  )
  assert.equal(
    parkingRowText(
      { ...base, sourceKind: 'osm', verification: 'verified' },
      reference,
      now,
    ).verification,
    'Verified information',
  )
})
