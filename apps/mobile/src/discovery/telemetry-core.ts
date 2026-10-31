type ParkingKind = 'street' | 'lot' | 'garage'
type SourceKind = 'osm' | 'parkey' | 'community' | 'sample'
export type AnalyticsEvent =
  | { name: 'app_open' }
  | {
      name: 'parking_viewed'
      parking_kind: ParkingKind
      source_kind: SourceKind
      verification: 'verified' | 'unverified'
    }
  | {
      name: 'directions_tapped'
      target_type: 'parking' | 'parked'
      navigation_provider: 'in_app' | 'apple' | 'google' | 'waze'
    }
  | {
      name: 'filter_used'
      filter: 'kind'
      value: 'all' | 'street' | 'facilities' | 'lot' | 'garage'
    }
  | { name: 'filter_used'; filter: 'fees'; value: 'all' | 'applies' }
  | {
      name: 'contribution_saved'
      intent: 'add' | 'correction'
      parking_kind: ParkingKind
      storage: 'local'
    }
  | { name: 'parked_spot_saved' }
  | {
      name: 'favorite_added'
      parking_kind: ParkingKind
      source_kind: SourceKind
    }

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function oneOf(value: unknown, allowed: readonly string[]): value is string {
  return typeof value === 'string' && allowed.includes(value)
}

function eventProperties(
  event: Record<string, unknown>,
): Record<string, string> | null {
  const properties: Record<string, string> = {}
  const parking = () => oneOf(event.parking_kind, ['street', 'lot', 'garage'])
  const source = () =>
    oneOf(event.source_kind, ['osm', 'parkey', 'community', 'sample'])
  switch (event.name) {
    case 'app_open':
    case 'parked_spot_saved':
      return properties
    case 'parking_viewed':
      if (
        !parking() ||
        !source() ||
        !oneOf(event.verification, ['verified', 'unverified'])
      )
        return null
      properties.parking_kind = String(event.parking_kind)
      properties.source_kind = String(event.source_kind)
      properties.verification = event.verification
      return properties
    case 'directions_tapped':
      if (
        !oneOf(event.target_type, ['parking', 'parked']) ||
        !oneOf(event.navigation_provider, ['in_app', 'apple', 'google', 'waze'])
      )
        return null
      properties.target_type = event.target_type
      properties.navigation_provider = event.navigation_provider
      return properties
    case 'filter_used':
      if (
        !oneOf(event.filter, ['kind', 'fees']) ||
        !oneOf(
          event.value,
          event.filter === 'kind'
            ? ['all', 'street', 'facilities', 'lot', 'garage']
            : ['all', 'applies'],
        )
      )
        return null
      properties.filter = event.filter
      properties.value = event.value
      return properties
    case 'contribution_saved':
      if (
        !parking() ||
        !oneOf(event.intent, ['add', 'correction']) ||
        event.storage !== 'local'
      )
        return null
      properties.parking_kind = String(event.parking_kind)
      properties.intent = event.intent
      properties.storage = 'local'
      return properties
    case 'favorite_added':
      if (!parking() || !source()) return null
      properties.parking_kind = String(event.parking_kind)
      properties.source_kind = String(event.source_kind)
      return properties
    default:
      return null
  }
}

function providerConfiguration(endpoint: string, domain: string) {
  if (!endpoint || !domain || domain.length > 253) return null
  const labels = domain.split('.')
  if (
    labels.length < 2 ||
    !labels.every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
    ) ||
    !/^[a-z]+$/i.test(labels.at(-1) ?? '')
  )
    return null
  try {
    const url = new URL(endpoint)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null
    return { endpoint: url.toString(), domain: domain.toLowerCase() }
  } catch {
    return null
  }
}

/** A Sentry DSN contains a public ingest key, never a private API token. */
export function publicSentryDsn(value: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      /^[a-z0-9_-]+$/i.test(url.username) &&
      !url.password &&
      /^\/[1-9]\d*\/?$/.test(url.pathname) &&
      !url.search &&
      !url.hash
      ? url.toString()
      : null
  } catch {
    return null
  }
}

/** Plausible custom events without SDK identity, cookies, storage, retries or queues. */
export function createAnalytics({
  endpoint,
  domain,
  platform,
  fetcher = fetch,
}: {
  endpoint: string
  domain: string
  platform: string
  fetcher?: typeof fetch
}) {
  const provider = providerConfiguration(endpoint, domain)
  return {
    enabled: Boolean(provider && oneOf(platform, ['android', 'ios', 'web'])),
    async track(event: AnalyticsEvent): Promise<void> {
      if (
        !provider ||
        !oneOf(platform, ['android', 'ios', 'web']) ||
        !object(event)
      )
        return
      const props = eventProperties(event)
      if (!props) return
      const controller = new AbortController()
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          fetcher(provider.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            redirect: 'error',
            signal: controller.signal,
            body: JSON.stringify({
              name: event.name,
              url: `https://${provider.domain}/app`,
              domain: provider.domain,
              props: { schema_version: 1, platform, ...props },
            }),
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort()
              reject(new Error('Telemetry request timeout'))
            }, 5000)
          }),
        ])
      } catch {
        // Measurement must never block discovery or expose request errors.
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

type SafeFrame = { filename?: string; lineno?: number; colno?: number }
export type SafeCrashPayload = {
  event_id?: string
  timestamp?: number
  level: 'error'
  exception: {
    values: {
      type: 'Error'
      value: 'Application error'
      stacktrace?: { frames: SafeFrame[] }
    }[]
  }
}

/** Reconstruct rather than redact: free-form messages, context and URLs never survive. */
export function safeCrashPayload(input: unknown): SafeCrashPayload {
  const event = object(input) ? input : {}
  const frames: SafeFrame[] = []
  if (object(event.exception) && Array.isArray(event.exception.values)) {
    for (const value of event.exception.values.slice(0, 10)) {
      if (
        !object(value) ||
        !object(value.stacktrace) ||
        !Array.isArray(value.stacktrace.frames)
      )
        continue
      for (const frame of value.stacktrace.frames.slice(-100)) {
        if (!object(frame)) continue
        const safe: SafeFrame = {}
        if (
          typeof frame.filename === 'string' &&
          /^(?:app:\/\/\/)?(?:index\.(?:android|ios)\.bundle|index\.bundle|main\.jsbundle)$/.test(
            frame.filename,
          )
        )
          safe.filename = frame.filename
        if (
          typeof frame.lineno === 'number' &&
          Number.isSafeInteger(frame.lineno) &&
          frame.lineno >= 0
        )
          safe.lineno = frame.lineno
        if (
          typeof frame.colno === 'number' &&
          Number.isSafeInteger(frame.colno) &&
          frame.colno >= 0
        )
          safe.colno = frame.colno
        if (Object.keys(safe).length) frames.push(safe)
      }
    }
  }
  const result: SafeCrashPayload = {
    level: 'error',
    exception: {
      values: [
        {
          type: 'Error',
          value: 'Application error',
          ...(frames.length ? { stacktrace: { frames } } : {}),
        },
      ],
    },
  }
  if (
    typeof event.event_id === 'string' &&
    /^[a-f0-9]{32}$/i.test(event.event_id)
  )
    result.event_id = event.event_id
  if (
    typeof event.timestamp === 'number' &&
    Number.isFinite(event.timestamp) &&
    event.timestamp >= 0
  )
    result.timestamp = event.timestamp
  return result
}
