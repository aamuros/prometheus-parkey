import assert from 'node:assert/strict'
import test from 'node:test'

import { parkingDetailData } from './parking-detail-data.ts'
import { sampleParking } from './sample-data.ts'

const minimal = {
  ...sampleParking[0],
  name: 'Unnamed parking · OpenStreetMap',
  kind: 'lot',
  fees: null,
  hours: null,
  regulations: [],
}

test('unnamed minimal records have a type fallback with no missing fields or map-center distance', () => {
  assert.deepEqual(parkingDetailData(minimal, null), {
    title: 'Parking lot',
    meta: 'Parking lot',
    rows: [],
  })
  for (const name of ['', '   ', 'Unknown'])
    assert.equal(
      parkingDetailData({ ...minimal, name }, null).title,
      'Parking lot',
    )
  assert.equal(
    parkingDetailData(
      { ...minimal, kind: 'street', name: 'Unnamed street parking' },
      null,
    ).title,
    'Street parking',
  )
})

test('metadata only claims Free or Paid for explicit fee evidence, without inventing a price', () => {
  for (const fees of ['Free', 'free parking', 'No charge']) {
    const detail = parkingDetailData({ ...minimal, fees }, null)
    assert.equal(detail.meta, 'Parking lot · Free')
    assert.deepEqual(detail.rows, [])
  }
  const paid = parkingDetailData(
    { ...minimal, fees: 'Fee applies; amount unavailable' },
    null,
  )
  assert.equal(paid.meta, 'Parking lot · Paid')
  assert.deepEqual(paid.rows, [])
  const price = parkingDetailData({ ...minimal, fees: 'PHP 50/hour' }, null)
  assert.equal(price.meta, 'Parking lot · Paid')
  assert.equal(price.rows[0].value, 'PHP 50/hour')
  const conditional = parkingDetailData(
    { ...minimal, fees: 'Free for customers; paid otherwise' },
    null,
  )
  assert.equal(conditional.meta, 'Parking lot')
  assert.equal(conditional.rows[0].value, 'Free for customers; paid otherwise')
})

test('distance uses an actual user coordinate and contains no reference or helper copy', () => {
  const detail = parkingDetailData(minimal, [121.031, 14.566])
  assert.match(detail.meta, /^Parking lot · \d+(?:\.\d+)? (?:m|km)$/)
})

test('an import geometry warning does not create an empty expanded state', () => {
  const detail = parkingDetailData(
    {
      ...minimal,
      regulations: [
        {
          description:
            'Map point may be a facility centroid, not an entrance. Confirm access on arrival.',
          sourceLabel: 'Parkey import geometry note',
          sourceUrl: null,
          observedAt: null,
        },
      ],
    },
    null,
  )
  assert.deepEqual(detail.rows, [])
})

test('expanded rows preserve real schedules and restrictions while removing placeholders and duplicates', () => {
  const rule = (description) => ({
    description,
    sourceLabel: 'Test',
    sourceUrl: null,
    observedAt: null,
  })
  const detail = parkingDetailData(
    {
      ...minimal,
      name: 'Jupiter Street',
      kind: 'street',
      hours: 'Mo-Sa 07:00-17:00',
      fees: 'Unknown',
      regulations: [
        rule('Access recorded by OpenStreetMap: customers'),
        rule('Access recorded by OpenStreetMap: customers'),
        rule('Maximum stay: 3 h'),
        rule('Unknown'),
        rule(''),
      ],
    },
    null,
  )
  assert.equal(detail.title, 'Jupiter Street')
  assert.deepEqual(
    detail.rows.map((row) => row.value),
    ['Mo-Sa 07:00-17:00', 'Access: customers', 'Maximum stay: 3 h'],
  )
  assert.ok(
    detail.rows.every(
      (row) => !/unknown|unavailable|capacity/i.test(row.value),
    ),
  )
})
