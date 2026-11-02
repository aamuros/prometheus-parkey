import assert from 'node:assert/strict'
import test from 'node:test'

import {
  detailDistance,
  parkingDetailData,
  parkingDestination,
} from './parking-detail-data.ts'
import { spotHours } from './spot-hours.ts'
import { sampleParking } from './sample-data.ts'

const minimal = {
  ...sampleParking[0],
  name: 'Unnamed parking · OpenStreetMap',
  kind: 'lot',
  fees: null,
  hours: null,
  regulations: [],
}
test('sparse records omit repeated type, remote distance, and empty facts', () => {
  const details = parkingDetailData(minimal, [0, 0])
  assert.equal(details.title, 'Parking lot')
  assert.equal(details.meta, '')
  assert.equal(details.sparse, true)
  assert.deepEqual(details.rows, [])
  assert.deepEqual(details.chips, [])
  assert.equal(
    parkingDetailData(
      {
        ...minimal,
        kind: 'street',
        osmTags: { 'addr:street': 'Jupiter Street' },
      },
      null,
    ).title,
    'Street parking on Jupiter Street',
  )
  assert.equal(
    parkingDetailData({ ...minimal, name: 'Named lot' }, null).title,
    'Named lot',
  )
})
test('distance boundaries follow driver-focused units', () => {
  for (const [meters, expected] of [
    [354, '350 m'],
    [1000, '1.0 km'],
    [9999, '10.0 km'],
    [10000, '10 km'],
    [99999, '100 km'],
    [100000, '100 km'],
    [100001, undefined],
  ])
    assert.equal(detailDistance(meters), expected)
})
test('explicit fees, capacity and restricted access are preserved without claiming availability', () => {
  const detail = parkingDetailData(
    {
      ...minimal,
      osmTags: {
        fee: 'yes',
        charge: '₱40/hr',
        capacity: '120',
        access: 'customers',
        'capacity:disabled': '2',
        'payment:cash': 'yes',
      },
    },
    null,
  )
  assert.deepEqual(detail.chips, ['₱40/hr', '120 spaces'])
  assert.equal(detail.warning, 'Customers only')
  assert.equal(detail.accessibleSpaces, 2)
  assert.deepEqual(detail.paymentMethods, ['cash'])
  assert.ok(!JSON.stringify(detail).includes('available'))
})
test('invalid hours disappear; OSM parser evaluates in the spot timezone', () => {
  const makati = [121.031, 14.566]
  assert.deepEqual(spotHours('nonsense', makati), {})
  assert.equal(spotHours('24/7', makati).summary, 'Open 24 hours')
  const now = new Date('2026-11-02T02:00:00Z') // Monday 10 AM in Makati
  assert.equal(
    spotHours('Mo-Fr 08:00-22:00', makati, now).summary,
    'Open now · closes 10 PM',
  )
  assert.equal(
    spotHours('Mo-Fr 08:00-22:00', [-74.006, 40.713], now).summary,
    'Closed · opens Mon 8 AM',
  )
  assert.equal(
    spotHours('Mo-Fr 08:00-22:00', makati, now).week.find((d) => d.today).day,
    'Monday',
  )
})
test('directions select the entrance nearest the driver, never a nearby unrelated node', () => {
  const entrances = [
    [121.03, 14.566],
    [121.035, 14.566],
  ]
  assert.deepEqual(
    parkingDestination({ ...minimal, entrances }, [121.036, 14.566]),
    entrances[1],
  )
  assert.deepEqual(
    parkingDestination({ ...minimal, entrances: [] }, null),
    minimal.geometry.coordinates,
  )
})
test('import geometry warnings do not expand a sparse spot; import date is not edit date', () => {
  const detail = parkingDetailData(
    {
      ...minimal,
      regulations: [
        {
          description: 'Map point may be a facility centroid, not an entrance.',
          sourceLabel: 'Parkey import geometry note',
        },
      ],
    },
    null,
  )
  assert.equal(detail.sparse, true)
  assert.equal(detail.updated, undefined)
})
