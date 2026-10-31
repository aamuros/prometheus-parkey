import assert from 'node:assert/strict'
import test from 'node:test'

import { createRoutingConsent } from './routing-consent.ts'

test('routing consent requires explicit acceptance and survives a new session', async () => {
  const values = new Map()
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value),
  }
  const consent = createRoutingConsent(storage)
  assert.equal(await consent.accepted(), false)
  assert.equal(values.size, 0)
  await consent.accept()
  assert.equal(await createRoutingConsent(storage).accepted(), true)
})

test('unrecognized consent is not treated as permission', async () => {
  const consent = createRoutingConsent({
    getItem: async () => 'false',
    setItem: async () => {},
  })
  assert.equal(await consent.accepted(), false)
})

test('a failed persistence operation is surfaced instead of claiming consent was saved', async () => {
  const consent = createRoutingConsent({
    getItem: async () => null,
    setItem: async () => {
      throw new Error('Storage unavailable')
    },
  })
  await assert.rejects(consent.accept(), /Storage unavailable/)
  assert.equal(await consent.accepted(), false)
})
