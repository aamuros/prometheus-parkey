import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value)
      })
      .catch(() => {
        /* Keep motion off when the preference cannot be read. */
      })
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    )
    return () => {
      active = false
      listener.remove()
    }
  }, [])
  return reduced
}
