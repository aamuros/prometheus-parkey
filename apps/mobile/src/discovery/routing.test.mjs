import assert from 'node:assert/strict'
import test from 'node:test'
import { URL } from 'node:url'

const { AbortController, DOMException, Response } = globalThis

import {
  fetchDrivingRoute,
  parseDrivingRoute,
  routeBounds,
  routeDistance,
  routeDuration,
} from './routing.ts'

const origin = [121.03, 14.565]
const destination = [121.031, 14.566]
const endpoint = 'https://routing.example.test/osrm'
function fixture() {
  return {
    code: 'Ok',
    routes: [
      {
        distance: 180,
        duration: 75,
        geometry: {
          type: 'LineString',
          coordinates: [origin, [121.03, 14.566], destination],
        },
        legs: [
          {
            steps: [
              {
                distance: 100,
                name: 'Kalayaan Avenue',
                maneuver: {
                  type: 'depart',
                  bearing_after: 0,
                  location: origin,
                },
              },
              {
                distance: 80,
                name: 'Manila Street',
                maneuver: {
                  type: 'turn',
                  modifier: 'right',
                  location: [121.03, 14.566],
                },
              },
              {
                distance: 0,
                name: '',
                maneuver: {
                  type: 'arrive',
                  modifier: 'left',
                  location: destination,
                },
              },
            ],
          },
        ],
      },
    ],
  }
}
function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('OSRM routes preserve longitude/latitude, route estimates, and maneuver distances', () => {
  const route = parseDrivingRoute(fixture())
  assert.equal(route.distance, 180)
  assert.equal(route.duration, 75)
  assert.deepEqual(route.geometry.coordinates[0], origin)
  assert.deepEqual(routeBounds(route), [origin, destination])
  assert.deepEqual(
    route.steps.map((step) => step.instruction),
    [
      'Head north on Kalayaan Avenue',
      'Turn right onto Manila Street',
      'Arrive at your destination on the left',
    ],
  )
  assert.equal(route.steps[1].distance, 80)
  assert.equal(routeDistance(180), '180 m')
  assert.equal(routeDistance(1250), '1.3 km')
  assert.equal(routeDuration(45), '<1 min')
  assert.equal(routeDuration(75), '2 min')
  assert.equal(routeDuration(3750), '1 hr 3 min')
})

test('roundabout exits and unfamiliar maneuvers do not invent turns', () => {
  const value = fixture()
  value.routes[0].legs[0].steps[1].maneuver = {
    type: 'roundabout',
    exit: 3,
    location: [121.03, 14.566],
  }
  assert.equal(
    parseDrivingRoute(value).steps[1].instruction,
    'At the roundabout, take exit 3 onto Manila Street',
  )
  value.routes[0].legs[0].steps[1].maneuver.type = 'future-maneuver'
  assert.equal(
    parseDrivingRoute(value).steps[1].instruction,
    'Follow the route on Manila Street',
  )
  value.routes[0].legs[0].steps[1].maneuver.type = 'turn'
  value.routes[0].legs[0].steps[1].maneuver.modifier = 'toString'
  assert.equal(
    parseDrivingRoute(value).steps[1].instruction,
    'Follow the route onto Manila Street',
  )
})

test('missing routes and invalid geometry, steps, or estimates are rejected', () => {
  for (const code of ['NoRoute', 'NoSegment'])
    assert.throws(() => parseDrivingRoute({ code }), /No driving route/)
  for (const mutate of [
    (value) => {
      value.routes = []
    },
    (value) => {
      value.routes[0].distance = -1
    },
    (value) => {
      value.routes[0].duration = Infinity
    },
    (value) => {
      value.routes[0].geometry.coordinates[0] = [14, 121]
    },
    (value) => {
      value.routes[0].geometry.coordinates = [origin]
    },
    (value) => {
      value.routes[0].legs[0].steps = []
    },
    (value) => {
      value.routes[0].legs[0].steps[0].distance = NaN
    },
    (value) => {
      delete value.routes[0].legs[0].steps[0].maneuver.location
    },
  ]) {
    const value = fixture()
    mutate(value)
    assert.throws(() => parseDrivingRoute(value), /invalid route/)
  }
})

test('route requests preserve endpoint prefixes and request car geometry and written steps', async () => {
  let requested
  const route = await fetchDrivingRoute(
    origin,
    destination,
    new AbortController().signal,
    {
      endpoint,
      fetcher: async (url, options) => {
        requested = new URL(url)
        assert.equal(options.headers.Accept, 'application/json')
        assert.equal(options.signal.aborted, false)
        return reply(fixture())
      },
    },
  )
  assert.equal(requested.origin, 'https://routing.example.test')
  assert.equal(
    requested.pathname,
    '/osrm/route/v1/driving/121.03,14.565;121.031,14.566',
  )
  assert.equal(requested.searchParams.get('geometries'), 'geojson')
  assert.equal(requested.searchParams.get('overview'), 'full')
  assert.equal(requested.searchParams.get('steps'), 'true')
  assert.equal(requested.searchParams.get('alternatives'), 'false')
  assert.equal(route.steps.length, 3)
})

test('unconfigured routing and invalid coordinates do not make network calls', async () => {
  const fetcher = async () => {
    assert.fail('unexpected network call')
  }
  const signal = new AbortController().signal
  await assert.rejects(
    fetchDrivingRoute(origin, destination, signal, { endpoint: '', fetcher }),
    /unavailable in this build/,
  )
  await assert.rejects(
    fetchDrivingRoute([14, 121], destination, signal, { endpoint, fetcher }),
    /valid start and destination/,
  )
})

test('routing service failures are surfaced without displaying raw response bodies', async () => {
  const signal = new AbortController().signal
  for (const code of ['NoRoute', 'NoSegment'])
    await assert.rejects(
      fetchDrivingRoute(origin, destination, signal, {
        endpoint,
        fetcher: async () => reply({ code }, 400),
      }),
      /No driving route/,
    )
  for (const [status, message] of [
    [429, /busy/],
    [503, /unavailable/],
  ])
    await assert.rejects(
      fetchDrivingRoute(origin, destination, signal, {
        endpoint,
        fetcher: async () => reply({}, status),
      }),
      message,
    )
  await assert.rejects(
    fetchDrivingRoute(origin, destination, signal, {
      endpoint,
      fetcher: async () => new Response('<html>upstream failure</html>'),
    }),
    /Directions could not be loaded/,
  )
})

test('closing directions aborts the provider request', async () => {
  const controller = new AbortController()
  let providerSignal
  const pending = fetchDrivingRoute(origin, destination, controller.signal, {
    endpoint,
    fetcher: async (_, options) =>
      new Promise((_, reject) => {
        providerSignal = options.signal
        options.signal.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        )
      }),
  })
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(providerSignal.aborted, true)
})

test('slow routing requests time out and release their fetch', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const pending = fetchDrivingRoute(
    origin,
    destination,
    new AbortController().signal,
    {
      endpoint,
      fetcher: async (_, options) =>
        new Promise((_, reject) => {
          options.signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          )
        }),
    },
  )
  context.mock.timers.tick(15000)
  await assert.rejects(pending, /took too long/)
})
