import { useSyncExternalStore } from 'react'
import { AccessibilityInfo } from 'react-native'

// Share one preference subscription across sheets and interactive controls.
let reduced = true
let unsubscribe: (() => void) | undefined
const listeners = new Set<() => void>()

function update(value: boolean) {
  reduced = value
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) update(value)
      })
      .catch(() => {
        if (active) update(true)
      })
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      update,
    )
    unsubscribe = () => {
      active = false
      subscription.remove()
    }
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      unsubscribe?.()
      unsubscribe = undefined
    }
  }
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => reduced,
    () => true,
  )
}
