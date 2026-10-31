import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createAnalytics,
  publicSentryDsn,
  safeCrashPayload,
} from './telemetry-core.ts'

const endpoint = 'https://analytics.example.test/api/event'
const domain = 'discovery.example.test'
const platform = 'android'
const events = [
  { name: 'app_open' },
  {
    name: 'parking_viewed',
    parking_kind: 'lot',
    source_kind: 'osm',
    verification: 'unverified',
  },
  {
    name: 'directions_tapped',
    target_type: 'parking',
    navigation_provider: 'in_app',
  },
  { name: 'filter_used', filter: 'kind', value: 'garage' },
  { name: 'filter_used', filter: 'fees', value: 'applies' },
  {
    name: 'contribution_saved',
    intent: 'correction',
    parking_kind: 'street',
    storage: 'local',
  },
  { name: 'parked_spot_saved' },
  { name: 'favorite_added', parking_kind: 'garage', source_kind: 'community' },
]

test('all seven event names serialize only the approved schema to a constant app URL', async () => {
  const requested = []
  const analytics = createAnalytics({
    endpoint,
    domain,
    platform,
    fetcher: async (url, options) => {
      requested.push({ url, options, body: JSON.parse(options.body) })
      return { ok: true }
    },
  })
  for (const event of events) await analytics.track(event)
  assert.equal(requested.length, events.length)
  for (const [index, request] of requested.entries()) {
    const { name, ...props } = events[index]
    assert.equal(request.url, endpoint)
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.credentials, 'omit')
    assert.equal(request.options.referrerPolicy, 'no-referrer')
    assert.equal(request.options.redirect, 'error')
    assert.deepEqual(request.body, {
      name,
      url: `https://${domain}/app`,
      domain,
      props: { schema_version: 1, platform, ...props },
    })
    assert.equal('Authorization' in request.options.headers, false)
    assert.equal('Cookie' in request.options.headers, false)
  }
})

test('runtime allowlisting discards coordinates, search text, user IDs, URLs, and unknown properties', async () => {
  const payloads = []
  const analytics = createAnalytics({
    endpoint,
    domain,
    platform,
    fetcher: async (_, options) => {
      payloads.push(options.body)
      return { ok: true }
    },
  })
  for (const event of events)
    await analytics.track({
      ...event,
      coordinates: [121.03, 14.565],
      query: 'private destination',
      user_id: 'private-user',
      record_id: 'private-record',
      sourceUrl: 'https://example.test/private-location',
      props: {
        schema_version: 9,
        platform: 'private-platform',
        secret: 'private-secret',
      },
    })
  for (const payload of payloads) {
    assert.doesNotMatch(
      payload,
      /121\.03|14\.565|private|coordinates|sourceUrl|user_id|record_id/,
    )
    assert.equal(JSON.parse(payload).props.schema_version, 1)
    assert.equal(JSON.parse(payload).props.platform, platform)
  }
})

test('missing or malformed provider configuration is completely disabled without inferred defaults', async () => {
  const fetcher = async () => {
    assert.fail('disabled telemetry must not call fetch')
  }
  for (const options of [
    { endpoint: '' },
    { domain: '' },
    { endpoint: 'http://analytics.example.test/api/event' },
    { endpoint: 'https://user:password@analytics.example.test/api/event' },
    { endpoint: 'https://analytics.example.test/api/event?api_key=private' },
    { endpoint: 'https://analytics.example.test/api/event#private' },
    { endpoint: 'not a URL' },
    { domain: 'https://example.test' },
    { domain: 'example.test/private' },
    { domain: 'user@example.test' },
    { domain: 'example.test:443' },
    { domain: 'example..test' },
    { domain: '-example.test' },
    { domain: 'example.test?private' },
    { platform: 'unknown' },
  ])
    await createAnalytics({
      endpoint,
      domain,
      platform,
      fetcher,
      ...options,
    }).track({ name: 'app_open' })
})

test('unknown events, invalid enums and missing required fields fail closed', async () => {
  const analytics = createAnalytics({
    endpoint,
    domain,
    platform,
    fetcher: async () => {
      assert.fail('invalid event must not be sent')
    },
  })
  for (const event of [
    null,
    [],
    {},
    { name: 'custom_event' },
    {
      name: 'parking_viewed',
      parking_kind: 'private-text',
      source_kind: 'osm',
      verification: 'unverified',
    },
    { name: 'parking_viewed', parking_kind: 'lot', source_kind: 'osm' },
    {
      name: 'parking_viewed',
      parking_kind: 'lot',
      source_kind: 'private-text',
      verification: 'verified',
    },
    {
      name: 'directions_tapped',
      target_type: 'parking',
      navigation_provider: 'https://maps.example.test/private',
    },
    {
      name: 'directions_tapped',
      target_type: 'private-target',
      navigation_provider: 'in_app',
    },
    { name: 'filter_used', filter: 'kind', value: 'applies' },
    { name: 'filter_used', filter: 'fees', value: 'garage' },
    { name: 'filter_used', filter: 'private-filter', value: 'all' },
    {
      name: 'contribution_saved',
      intent: 'add',
      parking_kind: 'lot',
      storage: 'server',
    },
    {
      name: 'contribution_saved',
      intent: 'private-intent',
      parking_kind: 'lot',
      storage: 'local',
    },
    {
      name: 'favorite_added',
      parking_kind: 'lot',
      source_kind: 'private-source',
    },
  ])
    await analytics.track(event)
})

test('network rejection and HTTP failure do not reject or retry actions', async () => {
  let calls = 0
  const analytics = createAnalytics({
    endpoint,
    domain,
    platform,
    fetcher: async () => {
      calls++
      if (calls === 1) throw new Error('private request URL')
      return { ok: false, status: 503 }
    },
  })
  await assert.doesNotReject(analytics.track({ name: 'app_open' }))
  await assert.doesNotReject(analytics.track({ name: 'parked_spot_saved' }))
  assert.equal(calls, 2)
})

test('timeout settles after five seconds even if fetch ignores cancellation', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let signal
  let calls = 0
  const analytics = createAnalytics({
    endpoint,
    domain,
    platform,
    fetcher: async (_, options) => {
      calls++
      signal = options.signal
      return new Promise(() => {})
    },
  })
  const pending = analytics.track({ name: 'app_open' })
  context.mock.timers.tick(4999)
  assert.equal(signal.aborted, false)
  context.mock.timers.tick(1)
  await assert.doesNotReject(pending)
  assert.equal(signal.aborted, true)
  assert.equal(calls, 1)
})

test('Sentry DSNs accept only public HTTPS ingestion configuration', () => {
  const dsn = 'https://public_ingest_key@o123.ingest.sentry.io/456'
  assert.equal(publicSentryDsn(dsn), dsn)
  for (const invalid of [
    '',
    'not a URL',
    'http://publickey@sentry.example.test/1',
    'https://sentry.example.test/1',
    'https://publickey:private-secret@sentry.example.test/1',
    'https://publickey@sentry.example.test/1?secret=value',
    'https://publickey@sentry.example.test/1#secret',
    'https://publickey@sentry.example.test/not-a-project',
    'https://publickey@sentry.example.test/0',
  ])
    assert.equal(publicSentryDsn(invalid), null)
})

test('crash reconstruction retains safe bundle positions and removes sensitive contexts and free text', () => {
  const safe = safeCrashPayload({
    event_id: '0123456789abcdef0123456789abcdef',
    timestamp: 1793408400,
    message: 'private destination',
    user: { id: 'private-user', ip_address: '127.0.0.1' },
    request: {
      url: 'https://routing.example.test/121.03,14.565',
      data: 'private request',
    },
    breadcrumbs: [{ message: 'private search' }],
    contexts: { location: [121.03, 14.565] },
    tags: { private: 'private tag' },
    extra: { secret: 'private secret' },
    exception: {
      values: [
        {
          type: 'private class',
          value: 'private exception',
          stacktrace: {
            frames: [
              {
                filename: 'app:///index.android.bundle',
                lineno: 10,
                colno: 20,
                function: 'privateFunction',
                vars: { query: 'private' },
              },
              {
                filename: 'https://example.test/121.03,14.565?private',
                lineno: 11,
                colno: 22,
              },
              { filename: '/Users/private/index.js', lineno: NaN, colno: -1 },
            ],
          },
        },
      ],
    },
  })
  assert.deepEqual(safe, {
    event_id: '0123456789abcdef0123456789abcdef',
    timestamp: 1793408400,
    level: 'error',
    exception: {
      values: [
        {
          type: 'Error',
          value: 'Application error',
          stacktrace: {
            frames: [
              {
                filename: 'app:///index.android.bundle',
                lineno: 10,
                colno: 20,
              },
              { lineno: 11, colno: 22 },
            ],
          },
        },
      ],
    },
  })
  assert.doesNotMatch(
    JSON.stringify(safe),
    /private|121\.03|14\.565|routing|127\.0\.0\.1/,
  )
})

test('malformed crash input cannot introduce messages, IDs, unsafe numbers or arbitrary filenames', () => {
  const minimum = {
    level: 'error',
    exception: { values: [{ type: 'Error', value: 'Application error' }] },
  }
  assert.deepEqual(safeCrashPayload(null), minimum)
  assert.deepEqual(
    safeCrashPayload({
      event_id: 'private-user',
      timestamp: Infinity,
      exception: {
        values: [
          null,
          {
            stacktrace: {
              frames: [
                null,
                { lineno: 1.2, colno: Infinity, filename: 'private.js' },
              ],
            },
          },
        ],
      },
    }),
    minimum,
  )
})
