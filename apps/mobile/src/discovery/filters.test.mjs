import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

import { partitionParking } from './filters.ts'

const records = JSON.parse(
  readFileSync(new URL('./osm-pilot.json', import.meta.url)),
)

test('type filters reflect the real snapshot and do not conflate lots with garages', () => {
  for (const [kind, count] of [
    ['all', 41],
    ['street', 6],
    ['facilities', 35],
    ['lot', 34],
    ['garage', 1],
  ]) {
    const result = partitionParking(records, kind)
    assert.equal(result.matched.length, count)
    assert.equal(result.nonmatched.length, records.length - count)
    assert.equal(result.unknown.length, 0)
    assert.equal(new Set([...result.matched, ...result.nonmatched]).size, 41)
  }
})

test('actual fee text has two matches and 39 unknowns, with no inferred free or paid values', () => {
  const result = partitionParking(records, 'all', 'applies')
  assert.equal(result.matched.length, 2)
  assert.equal(result.unknown.length, 39)
  assert.equal(result.nonmatched.length, 0)
  assert.ok(
    result.matched.every(
      (record) => record.fees === 'Fee applies; amount unavailable',
    ),
  )
  assert.ok(result.unknown.every((record) => record.fees === null))
})

test('kind mismatch is explicit while unrecognized fee text stays in the unknown partition', () => {
  const record = records[0]
  const inputs = [
    {
      ...record,
      id: 'paid',
      kind: 'lot',
      fees: 'Fee applies; amount unavailable',
    },
    { ...record, id: 'missing', kind: 'lot', fees: null },
    { ...record, id: 'text', kind: 'lot', fees: 'Free after 5pm' },
    { ...record, id: 'zero', kind: 'lot', fees: '0' },
    { ...record, id: 'other', kind: 'garage', fees: null },
  ]
  const result = partitionParking(inputs, 'lot', 'applies')
  assert.deepEqual(
    result.matched.map((item) => item.id),
    ['paid'],
  )
  assert.deepEqual(
    result.unknown.map((item) => item.id),
    ['missing', 'text', 'zero'],
  )
  assert.deepEqual(
    result.nonmatched.map((item) => item.id),
    ['other'],
  )
  assert.equal(inputs.length, 5)
  assert.equal(partitionParking(inputs, 'lot').matched.length, 4)
  assert.deepEqual(partitionParking([], 'all', 'applies'), {
    matched: [],
    nonmatched: [],
    unknown: [],
  })
})
