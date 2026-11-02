import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseSavedAddresses,
  serializeSavedAddresses,
} from './saved-address-data.ts'

const home = {
  id: 'home-address',
  name: 'Home in Makati',
  address: 'Makati, Philippines',
  coordinate: [121.03, 14.56],
}
const work = {
  id: 'work-address',
  name: 'Office',
  address: 'Ayala Avenue',
  coordinate: [121.02, 14.55],
}

test('home and work addresses survive a storage round trip without provider metadata', () => {
  assert.deepEqual(parseSavedAddresses(null), {})
  const encoded = serializeSavedAddresses({
    home: { ...home, extra: 'provider-only' },
    work,
  })
  assert.deepEqual(parseSavedAddresses(encoded), { home, work })
  assert.equal(encoded.includes('provider-only'), false)
  assert.deepEqual(parseSavedAddresses(serializeSavedAddresses({ home })), {
    home,
  })
})

test('malformed or unsupported saved addresses fail without silently resetting user data', () => {
  for (const value of [
    '{',
    '[]',
    '{"version":2}',
    JSON.stringify({ version: 1, home: { ...home, coordinate: [999, 14] } }),
    JSON.stringify({ version: 1, work: { ...work, name: '' } }),
  ]) {
    assert.throws(() => parseSavedAddresses(value))
  }
})
