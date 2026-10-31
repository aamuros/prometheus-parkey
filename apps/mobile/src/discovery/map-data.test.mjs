import assert from 'node:assert/strict'
import test from 'node:test'

import { parkingMapSources } from './map-data.ts'
import { sampleParking } from './sample-data.ts'

test('cluster sources keep street lines and facility points separate without losing records', () => {
  const sources = parkingMapSources(sampleParking, null)
  assert.ok(sources.streets.features.length > 0)
  assert.ok(sources.facilities.features.length > 0)
  assert.ok(
    sources.streets.features.every(
      (feature) => feature.geometry.type === 'LineString',
    ),
  )
  assert.ok(
    sources.facilities.features.every(
      (feature) => feature.geometry.type === 'Point',
    ),
  )
  assert.equal(sources.selected.features.length, 0)
  assert.equal(
    sources.streets.features.length + sources.facilities.features.length,
    sampleParking.length,
  )
})

test('a selected pin renders independently above clusters without being counted twice', () => {
  const facility = sampleParking.find(
    (record) => record.geometry.type === 'Point',
  )
  const sources = parkingMapSources(sampleParking, facility.id)
  assert.deepEqual(
    sources.selected.features.map((feature) => feature.id),
    [facility.id],
  )
  assert.ok(
    sources.facilities.features.every((feature) => feature.id !== facility.id),
  )
  assert.equal(
    Object.values(sources).flatMap((source) => source.features).length,
    sampleParking.length,
  )
  const street = sampleParking.find(
    (record) => record.geometry.type === 'LineString',
  )
  const streetSources = parkingMapSources(sampleParking, street.id)
  assert.equal(streetSources.selected.features.length, 0)
  assert.equal(streetSources.streets.features[0].properties.selected, true)
})

test('southern pins have higher draw priority and source ordering is stable across input order', () => {
  const facility = sampleParking.find(
    (record) => record.geometry.type === 'Point',
  )
  const records = [
    {
      ...facility,
      id: 'north',
      geometry: { type: 'Point', coordinates: [121.03, 14.57] },
    },
    {
      ...facility,
      id: 'south',
      geometry: { type: 'Point', coordinates: [121.03, 14.56] },
    },
    {
      ...facility,
      id: 'south-tie',
      geometry: { type: 'Point', coordinates: [121.03, 14.56] },
    },
  ]
  const pins = parkingMapSources(records, null).facilities.features
  const north = pins.find((feature) => feature.id === 'north')
  const south = pins.find((feature) => feature.id === 'south')
  assert.ok(south.properties.sortKey > north.properties.sortKey)
  assert.deepEqual(
    parkingMapSources(records.toReversed(), null).facilities.features,
    pins,
  )
  assert.deepEqual(parkingMapSources([], null).facilities.features, [])
})
