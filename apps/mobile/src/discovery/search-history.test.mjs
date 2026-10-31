import assert from 'node:assert/strict'
import test from 'node:test'

import {
  emptySearchHistory,
  parseSearchHistory,
  rememberSearch,
} from './search-history.ts'

test('recents retain five destinations and move a reused place to the front', () => {
  let history = { ...emptySearchHistory, privacyShown: true }
  const places = Array.from({ length: 7 }, (_, index) => ({
    id: `place-${index}`,
    name: `Place ${index}`,
    address: 'Makati',
    coordinate: [121 + index / 1000, 14.56],
  }))
  for (const place of places) history = rememberSearch(history, place)
  assert.deepEqual(
    history.recents.map((place) => place.id),
    ['place-6', 'place-5', 'place-4', 'place-3', 'place-2'],
  )
  // Provider IDs include the result index, so identity must survive reordering.
  history = rememberSearch(history, { ...places[3], id: 'reordered-result' })
  assert.equal(history.recents.length, 5)
  assert.equal(history.recents[0].name, 'Place 3')
  assert.equal(
    history.recents.filter((place) => place.name === 'Place 3').length,
    1,
  )
  assert.equal(history.privacyShown, true)
  assert.deepEqual(emptySearchHistory.recents, [])
  assert.deepEqual(parseSearchHistory({ version: 1, ...history }), history)
})

test('invalid stored destinations and unsupported versions are rejected', () => {
  const place = {
    id: 'one',
    name: 'Makati',
    address: 'Philippines',
    coordinate: [121, 14.56],
  }
  for (const value of [
    null,
    { version: 2, ...emptySearchHistory },
    { version: 1, recents: [], privacyShown: 'true' },
    {
      version: 1,
      privacyShown: false,
      recents: [{ ...place, coordinate: [200, 95] }],
    },
    { version: 1, privacyShown: false, recents: [{ ...place, name: '' }] },
    { version: 1, privacyShown: false, recents: Array(6).fill(place) },
  ])
    assert.throws(() => parseSearchHistory(value), /could not be read/)
})
