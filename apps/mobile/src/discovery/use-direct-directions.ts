import { useCallback, useEffect, useEffectEvent, useRef } from 'react'

/** An explicit Directions action can start a route from an available live fix. */
export function useDirectDirections(ready: boolean, start: () => void) {
  const requested = useRef(false)
  const request = useCallback((locationAvailable: boolean) => {
    requested.current = locationAvailable
  }, [])
  const cancel = useCallback(() => {
    requested.current = false
  }, [])
  const activate = useEffectEvent(() => {
    if (ready && requested.current) {
      requested.current = false
      start()
    }
  })
  useEffect(() => {
    activate()
  }, [ready])
  return { request, cancel }
}
