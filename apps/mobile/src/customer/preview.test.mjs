import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterPlaces,
  formattedPhone,
  initialPreview,
  parkingPlaces,
  previewReducer,
  previewTotal,
  timeLabel,
  validPhone,
} from './preview.ts'

test('destination search and intersecting filters preserve matching parking options', () => {
  const filters = { covered: true, ev: true, budget: true }
  assert.deepEqual(
    filterPlaces('Polaris St, Poblacion', filters).map((place) => place.id),
    ['polaris', 'garden'],
  )
  assert.deepEqual(
    filterPlaces('Kalayaan Garage', {
      covered: false,
      ev: false,
      budget: false,
    }).map((place) => place.id),
    ['kalayaan'],
  )
  assert.deepEqual(filterPlaces('not a destination', filters), [])
})

test('a sample reservation stores its price and gets a unique code', () => {
  const next = previewReducer(initialPreview, {
    type: 'reserve',
    placeId: 'polaris',
    arrival: 540,
    hours: 2,
  })
  assert.equal(next.bookings.length, initialPreview.bookings.length + 1)
  assert.deepEqual(next.bookings[0], {
    id: 'sample-4822',
    placeId: 'polaris',
    arrival: 540,
    hours: 2,
    total: 175,
    slot: 'B-12',
    code: 'PK-4822',
    status: 'reserved',
    day: 'Today',
  })
  assert.equal(next.nextBooking, 4823)
  assert.equal(initialPreview.bookings.length, 3)
  assert.equal(previewTotal(parkingPlaces[0], 3), 255)
})

test('duplicate and overlapping sample bookings are blocked, including half-hour overlaps', () => {
  const duplicate = {
    type: 'reserve',
    placeId: 'polaris',
    arrival: 1110,
    hours: 3,
  }
  assert.equal(previewReducer(initialPreview, duplicate), initialPreview)
  // 3 PM–7 PM overlaps the existing 6:30 PM booking by half an hour.
  assert.equal(
    previewReducer(initialPreview, { ...duplicate, arrival: 900, hours: 4 }),
    initialPreview,
  )
  const next = previewReducer(initialPreview, {
    ...duplicate,
    arrival: 540,
    hours: 2,
  })
  assert.equal(
    previewReducer(next, { ...duplicate, arrival: 540, hours: 2 }),
    next,
  )
})

test('cancelling a sample frees its time without changing completed history', () => {
  const cancelled = previewReducer(initialPreview, {
    type: 'cancel',
    id: 'sample-4821',
  })
  assert.equal(cancelled.bookings[0].status, 'cancelled')
  const rebooked = previewReducer(cancelled, {
    type: 'reserve',
    placeId: 'kalayaan',
    arrival: 1110,
    hours: 3,
  })
  assert.equal(rebooked.bookings[0].total, 375)
  assert.equal(rebooked.bookings[0].status, 'reserved')
  assert.equal(
    previewReducer(initialPreview, { type: 'cancel', id: 'sample-4820' })
      .bookings[1].status,
    'completed',
  )
})

test('unknown parking and invalid time selections cannot create sample reservations', () => {
  for (const draft of [
    { placeId: 'missing', arrival: 540, hours: 2 },
    { placeId: 'polaris', arrival: 541, hours: 2 },
    { placeId: 'polaris', arrival: 540, hours: 0 },
    { placeId: 'polaris', arrival: 540, hours: 5 },
    { placeId: 'polaris', arrival: 540, hours: 1.5 },
  ])
    assert.equal(
      previewReducer(initialPreview, { type: 'reserve', ...draft }),
      initialPreview,
    )
})

test('phone entry validates the local Philippine number and formats it consistently', () => {
  assert.equal(validPhone('917 123 4567'), true)
  assert.equal(validPhone('017 123 4567'), false)
  assert.equal(validPhone('917 123'), false)
  assert.equal(formattedPhone('9171234567'), '917 123 4567')
  assert.equal(
    previewReducer(initialPreview, { type: 'phone', phone: 'invalid' }),
    initialPreview,
  )
})

test('departure labels handle half-hours and midnight', () => {
  assert.equal(timeLabel(1110), '6:30 PM')
  assert.equal(timeLabel(1290), '9:30 PM')
  assert.equal(timeLabel(1470), '12:30 AM')
})

test('logging out resets all sample changes', () => {
  let state = previewReducer(initialPreview, {
    type: 'save',
    placeId: 'polaris',
  })
  state = previewReducer(state, { type: 'reminders', enabled: false })
  state = previewReducer(state, {
    type: 'vehicle',
    name: 'Sample car',
    plate: 'TEST 001',
  })
  assert.equal(previewReducer(state, { type: 'reset' }), initialPreview)
})
