import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createLocalStore,
  emptyLocalState,
  parseLocalState,
  recordKey,
  rememberViewed,
  resolveSaved,
  savedRecord,
  setParkedSpot,
  toggleFavorite,
} from './local-state.ts'
import { sampleParking } from './sample-data.ts'

const first = {
  ...sampleParking[0],
  sourceKind: 'osm',
  id: 'osm:way/1',
  sourceUrl: 'https://www.openstreetmap.org/way/1',
}
const later = { ...first, id: 'server-uuid', name: 'Updated name' }
const envelope = (state) => ({ version: 1, ...state })

function memoryStorage() {
  let value = null
  return {
    getItem: async () => value,
    setItem: async (_, next) => {
      value = next
    },
    removeItem: async () => {
      value = null
    },
  }
}

test('stable source identity survives server ID changes and fallback IDs cannot collide with it', () => {
  assert.equal(recordKey(first), recordKey(later))
  assert.equal(
    recordKey({ sourceUrl: null, id: first.sourceUrl }),
    `id:${first.sourceUrl}`,
  )
  assert.equal(recordKey(first), `source:${first.sourceUrl}`)
  assert.deepEqual(resolveSaved(savedRecord(first), [later]), later)
  assert.equal(
    resolveSaved(savedRecord(first), [{ ...first, sourceUrl: null }]),
    null,
  )
  assert.equal(resolveSaved(savedRecord(first), []), null)
  const fallback = { ...first, sourceUrl: null }
  assert.equal(resolveSaved(savedRecord(fallback), [fallback]), fallback)
  const saved = savedRecord(first)
  assert.equal('geometry' in saved, false)
  assert.equal('fees' in saved, false)
  assert.equal('hours' in saved, false)
})

test('favorites toggle by source identity, retain other local state and never mutate inputs', () => {
  const state = toggleFavorite(emptyLocalState, first)
  assert.equal(state.favorites.length, 1)
  assert.equal(emptyLocalState.favorites.length, 0)
  assert.equal(state.recents, emptyLocalState.recents)
  assert.equal(toggleFavorite(state, later).favorites.length, 0)
  assert.equal(toggleFavorite(state, sampleParking[0]), state)
})

test('recents keep the last ten distinct viewed sources in newest-first order', () => {
  let state = emptyLocalState
  for (let index = 0; index < 12; index++)
    state = rememberViewed(state, {
      ...first,
      id: `local-${index}`,
      sourceUrl: `https://example.test/${index}`,
    })
  assert.equal(state.recents.length, 10)
  assert.equal(state.recents[0].id, 'local-11')
  assert.equal(state.recents[9].id, 'local-2')
  const updated = {
    ...first,
    id: 'new-id',
    sourceUrl: 'https://example.test/5',
    name: 'New source name',
  }
  state = rememberViewed(state, updated)
  assert.equal(state.recents.length, 10)
  assert.equal(state.recents[0].id, 'new-id')
  assert.equal(state.recents[0].name, 'New source name')
  assert.equal(
    state.recents.filter((record) => record.key === recordKey(updated)).length,
    1,
  )
  assert.equal(rememberViewed(state, sampleParking[0]), state)
})

test('parked location validates longitude/latitude and timestamp, copies coordinates, and clears', () => {
  const coordinate = [121.03, 14.565]
  const now = new Date('2026-10-31T01:00:00.000Z')
  const state = setParkedSpot(emptyLocalState, coordinate, now)
  coordinate[0] = 120
  assert.deepEqual(state.parked, {
    coordinate: [121.03, 14.565],
    savedAt: now.toISOString(),
  })
  assert.equal(setParkedSpot(state, null).parked, null)
  assert.equal(state.parked.coordinate[0], 121.03)
  for (const point of [
    [14, 121],
    [NaN, 14],
    [121, Infinity],
    [121, 14, 0],
  ])
    assert.throws(() => setParkedSpot(emptyLocalState, point), /valid location/)
  assert.throws(
    () => setParkedSpot(emptyLocalState, [121, 14], new Date(NaN)),
    /valid location/,
  )
})

test('versioned persistence round-trips only the supported metadata and rejects damaged formats', () => {
  const state = setParkedSpot(
    rememberViewed(toggleFavorite(emptyLocalState, first), first),
    [121, 14],
    new Date('2026-10-31T01:00:00.000Z'),
  )
  const parsed = parseLocalState(JSON.parse(JSON.stringify(envelope(state))))
  assert.deepEqual(parsed, state)
  assert.notEqual(parsed.favorites, state.favorites)
  for (const value of [
    null,
    [],
    {},
    { ...envelope(state), version: 2 },
    { ...envelope(state), favorites: null },
    { ...envelope(state), recents: Array(11).fill(savedRecord(first)) },
    {
      ...envelope(state),
      parked: { coordinate: [121, 14], savedAt: 'invalid' },
    },
    { ...envelope(state), parked: { coordinate: [121, 14], savedAt: '2026' } },
  ])
    assert.throws(() => parseLocalState(value))
  for (const patch of [
    { key: 'incorrect' },
    { sourceUrl: 'file:///private/photo.jpg' },
    { sourceUrl: 'https://user:password@example.test/' },
    { coordinate: [121, 100] },
    { name: '' },
    { id: '' },
    { kind: 'unknown' },
  ])
    assert.throws(() =>
      parseLocalState({
        ...envelope(emptyLocalState),
        favorites: [{ ...savedRecord(first), ...patch }],
      }),
    )
  assert.throws(
    () =>
      parseLocalState({
        ...envelope(emptyLocalState),
        favorites: [savedRecord(first), savedRecord(later)],
      }),
    /duplicate/,
  )
})

test('AsyncStorage adapter round-trips restarts and clearing without any network access', async () => {
  const storage = memoryStorage()
  const initial = createLocalStore(storage)
  assert.deepEqual(await initial.read(), emptyLocalState)
  const state = rememberViewed(toggleFavorite(emptyLocalState, first), first)
  await initial.write(state)
  const restarted = createLocalStore(storage)
  assert.deepEqual(await restarted.read(), state)
  await restarted.clear()
  assert.deepEqual(await initial.read(), emptyLocalState)
})

test('storage failures reject to the caller without poisoning subsequent operations', async () => {
  const storage = memoryStorage()
  let failWrite = true
  let failRead = true
  let failClear = true
  const store = createLocalStore({
    getItem: async (key) => {
      if (failRead) {
        failRead = false
        throw new Error('read failed')
      }
      return storage.getItem(key)
    },
    setItem: async (key, value) => {
      if (failWrite) {
        failWrite = false
        throw new Error('write failed')
      }
      return storage.setItem(key, value)
    },
    removeItem: async (key) => {
      if (failClear) {
        failClear = false
        throw new Error('clear failed')
      }
      return storage.removeItem(key)
    },
  })
  await assert.rejects(store.read(), /read failed/)
  await assert.rejects(store.write(emptyLocalState), /write failed/)
  const state = toggleFavorite(emptyLocalState, first)
  await store.write(state)
  assert.deepEqual(await store.read(), state)
  await assert.rejects(store.clear(), /clear failed/)
  assert.deepEqual(await store.read(), state)
  await store.clear()
  assert.deepEqual(await store.read(), emptyLocalState)
})

test('concurrent writes and reads are ordered, writes snapshot inputs, and clear cannot be overtaken', async () => {
  const storage = memoryStorage()
  let release
  let calls = 0
  const store = createLocalStore({
    ...storage,
    setItem: async (key, value) => {
      calls++
      if (calls === 1)
        await new Promise((resolve) => {
          release = resolve
        })
      return storage.setItem(key, value)
    },
  })
  const state = toggleFavorite(emptyLocalState, first)
  const firstWrite = store.write(state)
  state.favorites.length = 0
  const queuedRead = store.read()
  const secondWrite = store.write(emptyLocalState)
  const cleared = store.clear()
  const finalRead = store.read()
  await Promise.resolve()
  assert.equal(calls, 1)
  release()
  await firstWrite
  assert.equal((await queuedRead).favorites.length, 1)
  await Promise.all([secondWrite, cleared])
  assert.deepEqual(await finalRead, emptyLocalState)
})

test('damaged stored JSON is surfaced and retained until explicitly cleared', async () => {
  const storage = memoryStorage()
  await storage.setItem('ignored', '{broken')
  const store = createLocalStore(storage)
  await assert.rejects(store.read())
  await assert.rejects(store.read())
  await store.clear()
  assert.deepEqual(await store.read(), emptyLocalState)
})
