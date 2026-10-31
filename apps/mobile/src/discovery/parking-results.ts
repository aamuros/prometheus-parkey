import type { DiscoveryParking } from '@parkey/shared-types'

import { inViewport, queryableViewport } from './model.ts'
import type { Viewport } from './model.ts'

type ParkingResult = { records: DiscoveryParking[]; truncated: boolean }
export type ParkingLoadState = ParkingResult & {
  status: 'idle' | 'loading' | 'error'
}
type ParkingLoadEvent =
  { type: 'loading' | 'error' } | { type: 'success'; result: ParkingResult }

export function parkingLoadReducer(
  state: ParkingLoadState,
  event: ParkingLoadEvent,
): ParkingLoadState {
  return event.type === 'success'
    ? { ...event.result, status: 'idle' }
    : { ...state, status: event.type }
}

/** Keep the last successful result until a newer request succeeds. */
export function scheduleParkingRefresh(
  load: (signal: AbortSignal) => Promise<ParkingResult>,
  dispatch: (event: ParkingLoadEvent) => void,
) {
  const controller = new AbortController()
  let current = true
  let timeout: ReturnType<typeof setTimeout> | undefined
  function finish(event: ParkingLoadEvent) {
    if (!current) return
    current = false
    clearTimeout(timeout)
    dispatch(event)
  }
  const timer = setTimeout(() => {
    dispatch({ type: 'loading' })
    timeout = setTimeout(() => {
      finish({ type: 'error' })
      controller.abort()
    }, 12000)
    void load(controller.signal)
      .then((result) => finish({ type: 'success', result }))
      .catch(() => finish({ type: 'error' }))
  }, 400)
  return () => {
    current = false
    clearTimeout(timer)
    clearTimeout(timeout)
    controller.abort()
  }
}

export function mergeParking(
  snapshot: DiscoveryParking[],
  remote: DiscoveryParking[],
  viewport: Viewport,
) {
  if (!queryableViewport(viewport)) return []
  const remoteSources = new Set(
    remote.map((record) => record.sourceUrl).filter(Boolean),
  )
  return [
    ...snapshot.filter(
      (record) =>
        inViewport(record.geometry, viewport) &&
        !remoteSources.has(record.sourceUrl),
    ),
    ...remote.filter((record) => inViewport(record.geometry, viewport)),
  ]
}
