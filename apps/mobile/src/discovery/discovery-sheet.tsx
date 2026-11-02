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
  bottom = 0,
  overlayHeight = 0,
  accessory,
  selected,
  expandable = true,
  title,
  summary,
  onPositionChange,
  onHeightChange,
  onClose,
  children,
}: {
  position: SheetPosition
  bottom?: number
  overlayHeight?: number
  accessory?: ReactNode
  expandable?: boolean
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
        height - bottom,
        insets.top,
        insets.bottom,
        selected,
        fontScale,
        headerHeight,
        overlayHeight,
      ),
    [
      height,
      bottom,
      insets.top,
      insets.bottom,
      selected,
      fontScale,
      headerHeight,
      overlayHeight,
    ],
  )
  const [contentHeight, setContentHeight] = useState(0)
  const contentDriven = selected
  const selectedHeight = Math.min(
    (height - insets.top - bottom) * (position === 'expanded' ? 0.8 : 1),
    contentHeight + 32 + Math.max(insets.bottom, 16),
  )
  const targetHeight =
    contentDriven && contentHeight > 0 ? selectedHeight : heights[position]
  const [motion] = useState(() => new Animated.Value(heights[position]))
  const reduced = useReducedMotion()
  const root = useRef<ComponentRef<typeof View>>(null)
  useEffect(() => {
    const element = root.current
    if (Platform.OS !== 'web' || !(element instanceof HTMLElement)) return
    const handle = element.querySelector<HTMLElement>(
      '[data-testid=parking-sheet-handle]',
    )
    if (handle) handle.title = 'Drag to resize; click to change sheet size'
    const wheel = (event: WheelEvent) => {
      if (position !== 'expanded' && event.deltaY > 0) {
        event.preventDefault()
        onPositionChange(
          selected && !expandable ? 'medium' : stepSheet(position, 1),
        )
      }
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [position, onPositionChange, selected, expandable])
  useEffect(() => {
    onHeightChange(targetHeight)
    const animation = Animated.timing(motion, {
      toValue: targetHeight,
      duration: reduced ? 0 : 180,
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [targetHeight, motion, reduced, onHeightChange])
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dy) > 20 || Math.abs(gesture.vy) > 0.3)
            onPositionChange(
              selected && !expandable
                ? 'medium'
                : stepSheet(position, gesture.dy < 0 ? 1 : -1),
            )
        },
      }),
    [position, onPositionChange, selected, expandable],
  )
  return (
    <Animated.View
      ref={root}
      testID="discovery-sheet"
      style={[
        styles.sheet,
        ui.shadow,
        {
          // Continue the surface behind the rounded tab bar to cover its corners.
          bottom: 0,
          height: contentDriven ? undefined : Animated.add(motion, bottom),
          maxHeight:
            selected && position === 'expanded'
              ? (height - insets.top - bottom) * 0.8 + bottom
              : height - insets.top,
          paddingBottom: bottom + Math.max(insets.bottom, 16),
        },
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
            disabled={selected && !expandable}
            accessibilityRole="button"
            accessibilityLabel={`Parking sheet: ${position === 'compact' ? 'peek' : position === 'medium' ? 'half' : 'full'}. ${position === 'expanded' ? 'Collapse' : 'Expand'} parking sheet`}
            accessibilityState={{ expanded: position !== 'compact' }}
            onPress={() =>
              onPositionChange(
                selected
                  ? expandable && position !== 'expanded'
                    ? 'expanded'
                    : 'medium'
                  : position === 'expanded'
                    ? 'compact'
                    : stepSheet(position, 1),
              )
            }
            style={styles.gripTouch}
          >
            {!selected || expandable ? <View style={styles.grip} /> : null}
          </Pressable>
        </View>
        {!selected ? (
          <Pressable
            testID="parking-results-toggle"
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${summary}. Show parking results`}
            onPress={() =>
              onPositionChange(
                selected
                  ? expandable && position !== 'expanded'
                    ? 'expanded'
                    : 'medium'
                  : position === 'compact'
                    ? 'medium'
                    : 'compact',
              )
            }
            style={[styles.header, !!accessory && { paddingRight: 72 }]}
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
      {accessory ? (
        <View style={{ position: 'absolute', top: 36, right: 16 }}>
          {accessory}
        </View>
      ) : null}
      <View
        style={contentDriven ? { flexShrink: 1 } : ui.flex}
        onLayout={(event) => {
          if (contentDriven) setContentHeight(event.nativeEvent.layout.height)
        }}
        {...(position !== 'expanded' ? pan.panHandlers : {})}
      >
        {children}
      </View>
      {selected ? (
        <IconButton
          icon="close"
          label="Close parking details"
          onPress={onClose}
          style={styles.close}
        />
      ) : null}
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  top: { height: 32, alignItems: 'center', justifyContent: 'center' },
  gripTouch: {
    minHeight: 44,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: {
    width: 40,
    height: 5,
    borderRadius: 2,
    backgroundColor: colors.disabledSurface,
  },
  close: {
    position: 'absolute',
    zIndex: 1,
    top: 28,
    right: 12,
    width: 44,
    height: 44,
    backgroundColor: colors.soft,
  },
  header: { paddingHorizontal: 16, gap: 4, paddingBottom: 16, minHeight: 64 },
})
export function MapAttribution({ onPress }: { onPress: () => void }) {
  return (
    <IconButton
      icon="info"
      color={colors.disabled}
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
