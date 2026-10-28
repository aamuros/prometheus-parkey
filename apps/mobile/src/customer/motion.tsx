import { useFocusEffect } from 'expo-router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native'

const ReducedMotionContext = createContext(true)

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    let mounted = true
    let changed = false
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        changed = true
        setReduced(enabled)
      },
    )
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted && !changed) setReduced(enabled)
      })
      .catch(() => {})
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])
  return (
    <ReducedMotionContext.Provider value={reduced}>
      {children}
    </ReducedMotionContext.Provider>
  )
}

export function useReducedMotion() {
  return useContext(ReducedMotionContext)
}

// Animated.Value is available on native and React Native Web alike.
export function useMotionValue(initial: number) {
  const [value] = useState(() => new Animated.Value(initial))
  return value
}

// Native stacks own page transitions on devices; animate their web fallback here.
export function usePageMotion(enabled: boolean) {
  const reduced = useReducedMotion()
  const progress = useMotionValue(1)
  useFocusEffect(
    useCallback(() => {
      if (!enabled || reduced) {
        progress.setValue(1)
        return
      }
      progress.setValue(0)
      const animation = Animated.timing(progress, {
        toValue: 1,
        duration: 320,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      })
      animation.start()
      return () => animation.stop()
    }, [enabled, reduced, progress]),
  )
  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  }
}

export function usePressMotion() {
  const reduced = useReducedMotion()
  const progress = useMotionValue(0)
  useEffect(() => () => progress.stopAnimation(), [progress])
  function animate(toValue: number) {
    if (reduced) {
      progress.setValue(toValue)
      return
    }
    Animated.spring(progress, {
      toValue,
      stiffness: 440,
      damping: 32,
      mass: 0.6,
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }
  return {
    onPressIn: () => animate(1),
    onPressOut: () => animate(0),
    style: {
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.86],
      }),
      transform: [
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, reduced ? 1 : 0.98],
          }),
        },
      ],
    },
  }
}
