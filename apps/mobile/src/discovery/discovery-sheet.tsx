import type { ComponentRef, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { sheetHeights, stepSheet } from './sheet-state'
import type { SheetPosition } from './sheet-state'
import { colors, IconButton, ui } from './ui'
import { useReducedMotion } from './use-reduced-motion'

export function DiscoverySheet({
  position,
  selected,
  title,
  summary,
  onPositionChange,
  onHeightChange,
  onClose,
  children,
}: {
  position: SheetPosition
  selected: boolean
  title: string
  summary: string
  onPositionChange: (position: SheetPosition) => void
  onHeightChange: (height: number) => void
  onClose: () => void
  children: ReactNode
}) {
  const { height, fontScale } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [headerHeight, setHeaderHeight] = useState(102)
  const heights = useMemo(
    () =>
      sheetHeights(
        height,
        insets.top,
        insets.bottom,
        selected,
        fontScale,
        headerHeight,
      ),
    [height, insets.top, insets.bottom, selected, fontScale, headerHeight],
  )
  const [motion] = useState(() => new Animated.Value(heights[position]))
  const reduced = useReducedMotion()
  const root = useRef<ComponentRef<typeof View>>(null)
  useEffect(() => {
    const element = root.current
    if (Platform.OS !== 'web' || !(element instanceof HTMLElement)) return
    const handle = element.querySelector<HTMLElement>(
      '[data-testid=parking-sheet-handle]',
    )
    if (handle) handle.title = 'Drag to resize; click to toggle peek and half'
    const wheel = (event: WheelEvent) => {
      if (position !== 'expanded' && event.deltaY > 0) {
        event.preventDefault()
        onPositionChange(stepSheet(position, 1))
      }
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [position, onPositionChange])
  useEffect(() => {
    onHeightChange(heights[position])
    const animation = Animated.timing(motion, {
      toValue: heights[position],
      duration: reduced ? 0 : 180,
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [position, heights, motion, reduced, onHeightChange])
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dy) > 20 || Math.abs(gesture.vy) > 0.3)
            onPositionChange(stepSheet(position, gesture.dy < 0 ? 1 : -1))
        },
      }),
    [position, onPositionChange],
  )
  return (
    <Animated.View
      ref={root}
      testID="discovery-sheet"
      style={[
        styles.sheet,
        ui.shadow,
        { height: motion, paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <View
        onLayout={(event) => {
          if (!selected) setHeaderHeight(event.nativeEvent.layout.height)
        }}
      >
        <View style={styles.top} {...pan.panHandlers}>
          <Pressable
            testID="parking-sheet-handle"
            accessibilityRole="button"
            accessibilityLabel={`Parking sheet: ${position === 'compact' ? 'peek' : position === 'medium' ? 'half' : 'full'}. Toggle peek and half`}
            accessibilityState={{ expanded: position !== 'compact' }}
            onPress={() =>
              onPositionChange(position === 'compact' ? 'medium' : 'compact')
            }
            style={styles.gripTouch}
          >
            <View style={styles.grip} />
          </Pressable>
          {selected ? (
            <IconButton
              icon="close"
              label="Close parking details"
              onPress={onClose}
              style={styles.close}
            />
          ) : null}
        </View>
        {!selected ? (
          <Pressable
            testID="parking-results-toggle"
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${summary}. Show parking results`}
            onPress={() =>
              onPositionChange(position === 'compact' ? 'medium' : 'compact')
            }
            style={styles.header}
          >
            <Text
              accessibilityRole="header"
              style={ui.sectionTitle}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text style={ui.small} numberOfLines={1}>
              {summary}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View
        style={ui.flex}
        {...(position !== 'expanded' ? pan.panHandlers : {})}
      >
        {children}
      </View>
    </Animated.View>
  )
}
const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 620,
    marginHorizontal: 'auto',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  top: { height: 44, alignItems: 'center', justifyContent: 'center' },
  gripTouch: {
    minHeight: 44,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.disabledSurface,
  },
  close: {
    position: 'absolute',
    top: 0,
    right: 8,
    width: 44,
    height: 44,
    backgroundColor: colors.surface,
  },
  header: { paddingHorizontal: 16, gap: 4, paddingBottom: 8, minHeight: 54 },
})
export function MapAttribution({ onPress }: { onPress: () => void }) {
  return (
    <IconButton
      icon="info"
      label="Map data sources and attribution"
      onPress={onPress}
      style={[attributionStyles.touch, ui.shadow]}
    />
  )
}
const attributionStyles = StyleSheet.create({
  touch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
})
