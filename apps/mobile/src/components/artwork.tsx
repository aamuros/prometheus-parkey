import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native'
import { SvgXml } from 'react-native-svg'

import { lotMap, neighborhoodMap, parkingSticker } from './design-artwork'

export function MapArtwork({ lot = false }: { lot?: boolean }) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      accessible={false}
      pointerEvents="none"
    >
      <SvgXml
        xml={lot ? lotMap : neighborhoodMap}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
      />
    </View>
  )
}

export function ParkingSticker({
  size = 130,
  animate = false,
}: {
  size?: number
  animate?: boolean
}) {
  const offset = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!animate) return
    let mounted = true
    let loop: Animated.CompositeAnimation | undefined
    function update(reduce: boolean) {
      if (!mounted) return
      loop?.stop()
      offset.setValue(0)
      if (!reduce) {
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(offset, {
              toValue: -8,
              duration: 1300,
              useNativeDriver: true,
            }),
            Animated.timing(offset, {
              toValue: 0,
              duration: 1300,
              useNativeDriver: true,
            }),
          ]),
        )
        loop.start()
      }
    }
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(update)
      .catch(() => {})
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      update,
    )
    return () => {
      mounted = false
      subscription.remove()
      loop?.stop()
    }
  }, [animate, offset])
  return (
    <Animated.View
      accessible={false}
      pointerEvents="none"
      style={{ width: size, height: size, transform: [{ translateY: offset }] }}
    >
      <SvgXml xml={parkingSticker} width="100%" height="100%" />
    </Animated.View>
  )
}
