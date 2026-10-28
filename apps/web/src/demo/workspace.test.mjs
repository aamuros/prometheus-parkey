import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  activeReservation,
  filterReservations,
  initialWorkspace,
  workspaceReducer,
} from './workspace.ts'

test('check-in and check-out release a bay before it can be marked unavailable', () => {
  const checkedIn = workspaceReducer(initialWorkspace, {
    type: 'reservation',
    id: 'PK-1032',
    status: 'checked_in',
  })
  assert.equal(activeReservation(checkedIn, 'A-02')?.status, 'checked_in')
  assert.equal(
    workspaceReducer(checkedIn, { type: 'toggle-bay', bay: 'A-02' }),
    checkedIn,
  )
  const checkedOut = workspaceReducer(checkedIn, {
    type: 'reservation',
    id: 'PK-1032',
    status: 'completed',
  })
  assert.equal(activeReservation(checkedOut, 'A-02'), undefined)
  const blocked = workspaceReducer(checkedOut, {
    type: 'toggle-bay',
    bay: 'A-02',
  })
  assert.ok(blocked.blockedBays.includes('A-02'))
  assert.ok(
    !workspaceReducer(blocked, {
      type: 'toggle-bay',
      bay: 'A-02',
    }).blockedBays.includes('A-02'),
  )
})

test('cancellation releases an upcoming bay and terminal bookings cannot be reactivated', () => {
  const cancelled = workspaceReducer(initialWorkspace, {
    type: 'reservation',
    id: 'PK-1032',
    status: 'cancelled',
  })
  assert.equal(activeReservation(cancelled, 'A-02'), undefined)
  const reactivated = workspaceReducer(cancelled, {
    type: 'reservation',
    id: 'PK-1032',
    status: 'checked_in',
  })
  assert.equal(
    reactivated.reservations.find((item) => item.id === 'PK-1032')?.status,
    'cancelled',
  )
  const skippedArrival = workspaceReducer(initialWorkspace, {
    type: 'reservation',
    id: 'PK-1032',
    status: 'completed',
  })
  assert.equal(
    skippedArrival.reservations.find((item) => item.id === 'PK-1032')?.status,
    'confirmed',
  )
  assert.equal(
    workspaceReducer(initialWorkspace, { type: 'toggle-bay', bay: 'unknown' }),
    initialWorkspace,
  )
})

test('search combines case-insensitive identifiers with the selected status', () => {
  assert.deepEqual(
    filterReservations(
      initialWorkspace.reservations,
      '  demo 105 ',
      'confirmed',
    ).map((item) => item.id),
    ['PK-1032'],
  )
  assert.equal(
    filterReservations(initialWorkspace.reservations, 'CASEY', 'checked_in')
      .length,
    0,
  )
  assert.equal(
    filterReservations(initialWorkspace.reservations, 'not a booking', 'all')
      .length,
    0,
  )
})

test('preview edits are immutable and reset restores the original scenario', () => {
  const changed = workspaceReducer(initialWorkspace, {
    type: 'reservation',
    id: 'PK-1028',
    status: 'completed',
  })
  assert.equal(initialWorkspace.reservations[0]?.status, 'checked_in')
  assert.equal(workspaceReducer(changed, { type: 'reset' }), initialWorkspace)
})
