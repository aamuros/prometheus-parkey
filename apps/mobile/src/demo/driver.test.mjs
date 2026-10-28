import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  driverReducer,
  initialDriver,
  locations,
  sampleAvailability,
  validateBooking,
  validateVehicle,
} from './driver.ts'

const draft = {
  locationId: 'courtyard',
  vehicleId: 'vehicle-1',
  date: '2026-10-27',
  arrival: '11:00',
  hours: 2,
}
const courtyard = locations.find((location) => location.id === 'courtyard')
assert.ok(courtyard)

test('creating and cancelling a demo trip updates trips and restores sample availability', () => {
  const booked = driverReducer(initialDriver, { type: 'book', draft })
  assert.equal(booked.trips[0]?.id, 'DEMO-1001')
  assert.equal(booked.trips[0]?.estimate, 120)
  assert.equal(booked.trips[0]?.plate, 'DEMO 201')
  assert.equal(sampleAvailability(booked, courtyard), 5)
  const cancelled = driverReducer(booked, { type: 'cancel', id: 'DEMO-1001' })
  assert.equal(cancelled.trips[0]?.status, 'cancelled')
  assert.equal(sampleAvailability(cancelled, courtyard), 6)
  assert.equal(initialDriver.trips.length, 1)
  assert.equal(driverReducer(cancelled, { type: 'reset' }), initialDriver)
})

test('overlapping plans for a vehicle are rejected while adjacent windows are allowed', () => {
  const booked = driverReducer(initialDriver, { type: 'book', draft })
  assert.match(validateBooking(booked, draft) ?? '', /already has a demo trip/)
  assert.equal(driverReducer(booked, { type: 'book', draft }), booked)
  assert.equal(validateBooking(booked, { ...draft, arrival: '13:00' }), null)
  assert.equal(validateBooking(booked, { ...draft, date: '2026-10-28' }), null)
})

test('unavailable locations, missing vehicles, and invalid inputs cannot create trips', () => {
  for (const invalid of [
    { ...draft, locationId: 'garden' },
    { ...draft, locationId: 'unknown' },
    { ...draft, vehicleId: 'deleted' },
    { ...draft, hours: 0 },
    { ...draft, hours: 2.5 },
    { ...draft, arrival: '25:00' },
    { ...draft, date: 'invalid' },
  ]) {
    assert.ok(validateBooking(initialDriver, invalid))
    assert.equal(
      driverReducer(initialDriver, { type: 'book', draft: invalid }),
      initialDriver,
    )
  }
})

test('vehicle validation normalizes plates and prevents duplicates', () => {
  const added = driverReducer(initialDriver, {
    type: 'add-vehicle',
    label: ' My SUV ',
    plate: ' demo  202 ',
  })
  assert.deepEqual(added.vehicles[1], {
    id: 'vehicle-2',
    label: 'My SUV',
    plate: 'DEMO 202',
  })
  assert.match(
    validateVehicle(added, 'Another car', 'demo-202') ?? '',
    /already/,
  )
  assert.ok(validateVehicle(added, '', 'DEMO 203'))
  assert.ok(validateVehicle(added, 'My car', '<script>'))
})

test('active-trip vehicles cannot be removed; history keeps a snapshot after removal', () => {
  const booked = driverReducer(initialDriver, { type: 'book', draft })
  assert.equal(
    driverReducer(booked, { type: 'remove-vehicle', id: 'vehicle-1' }),
    booked,
  )
  const cancelled = driverReducer(booked, { type: 'cancel', id: 'DEMO-1001' })
  const removed = driverReducer(cancelled, {
    type: 'remove-vehicle',
    id: 'vehicle-1',
  })
  assert.equal(removed.vehicles.length, 0)
  assert.equal(removed.trips[0]?.plate, 'DEMO 201')
  const completed = driverReducer(initialDriver, {
    type: 'cancel',
    id: 'DEMO-1000',
  })
  assert.equal(completed.trips[0]?.status, 'completed')
})
