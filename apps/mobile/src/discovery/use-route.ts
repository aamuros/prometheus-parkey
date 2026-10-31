import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import type { Coordinate } from '@parkey/shared-types'

import { config } from './config'
import { fetchDrivingRoute } from './routing'
import type { DrivingRoute } from './routing'

export type RouteState = {
  status: 'idle' | 'locating' | 'loading' | 'ready' | 'error'
  route: DrivingRoute | null
  error: string | null
}
const empty: RouteState = { status: 'idle', route: null, error: null }

export function useRoute() {
  const [state, setState] = useState<RouteState>(empty)
  const controller = useRef<AbortController | null>(null)
  const nextRequestAt = useRef(0)
  const clear = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    setState(empty)
  }, [])
  useEffect(() => () => controller.current?.abort(), [])

  const load = useCallback(
    async (
      destination: Coordinate,
      locate: () => Promise<Coordinate | null>,
    ) => {
      controller.current?.abort()
      const request = new AbortController()
      controller.current = request
      setState({ status: 'locating', route: null, error: null })
      try {
        if (!config.routingUrl)
          throw new Error(
            'Directions aren’t available right now. Please try again later.',
          )
        const from = await locate()
        if (request.signal.aborted) return
        if (!from)
          throw new Error(
            'Your location is unavailable. Enable location access and try again.',
          )
        if (Date.now() < nextRequestAt.current)
          throw new Error('Wait a second before requesting another route.')
        nextRequestAt.current = Date.now() + 1100
        setState({ status: 'loading', route: null, error: null })
        const route = await fetchDrivingRoute(
          from,
          destination,
          request.signal,
          {
            ...(Platform.OS === 'web'
              ? {}
              : { userAgent: 'Parkey/0.1 (route preview)' }),
          },
        )
        if (!request.signal.aborted)
          setState({ status: 'ready', route, error: null })
      } catch (error) {
        if (!request.signal.aborted)
          setState({
            status: 'error',
            route: null,
            error:
              error instanceof Error
                ? error.message
                : 'Directions could not be loaded. Please try again.',
          })
      }
    },
    [],
  )

  return { ...state, load, clear }
}
