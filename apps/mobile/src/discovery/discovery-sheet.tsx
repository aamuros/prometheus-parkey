import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { sheetHeights, snapSheet } from './sheet-state'
import type { SheetPosition } from './sheet-state'
import { colors, Icon, ui } from './ui'
import { useReducedMotion } from './use-reduced-motion'

export function DiscoverySheet({
  position,
  selected,
  title,
  summary,
  busy,
  onPositionChange,
  onHeightChange,
  children,
}: {
  position: SheetPosition
  selected: boolean
  title: string
  summary: string
  busy: boolean
  onPositionChange: (position: SheetPosition) => void
  onHeightChange: (height: number) => void
  children: ReactNode
}) {
  const { height, fontScale } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const heights = useMemo(
    () => sheetHeights(height, insets.top, insets.bottom, selected, fontScale),
    [height, insets.top, insets.bottom, selected, fontScale],
  )
  const [motion] = useState(() => new Animated.Value(heights[position]))
  const reduced = useReducedMotion()

  useEffect(() => {
    onHeightChange(heights[position])
    const animation = Animated.timing(motion, {
      toValue: heights[position],
      duration: reduced ? 0 : 220,
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [heights, position, motion, reduced, onHeightChange])

  const pan = useMemo(() => {
    function release(vy: number) {
      motion.flattenOffset()
      motion.stopAnimation((value) => {
        const next = snapSheet(heights, value, vy, selected)
        onPositionChange(next)
        Animated.timing(motion, {
          toValue: heights[next],
          duration: reduced ? 0 : 180,
          useNativeDriver: false,
        }).start()
      })
    }
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () =>
        motion.stopAnimation((value) => {
          motion.setOffset(value)
          motion.setValue(0)
        }),
      onPanResponderMove: (_, gesture) => motion.setValue(-gesture.dy),
      onPanResponderRelease: (_, gesture) => release(gesture.vy),
      onPanResponderTerminate: () => release(0),
    })
  }, [heights, selected, motion, onPositionChange, reduced])

  const toggle = () =>
    onPositionChange(
      position === 'expanded' ? (selected ? 'medium' : 'compact') : 'expanded',
    )
  return (
    <Animated.View
      style={[
        styles.sheet,
        ui.shadow,
        {
          height: motion.interpolate({
            inputRange: [
              selected ? heights.medium : heights.compact,
              Math.max(
                heights.expanded,
                (selected ? heights.medium : heights.compact) + 1,
              ),
            ],
            outputRange: [
              selected ? heights.medium : heights.compact,
              heights.expanded,
            ],
            extrapolate: 'clamp',
          }),
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View {...pan.panHandlers}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            position === 'expanded'
              ? 'Collapse parking panel'
              : 'Expand parking panel'
          }
          accessibilityState={{ expanded: position === 'expanded' }}
          accessibilityActions={[
            { name: 'increment', label: 'Expand' },
            { name: 'decrement', label: 'Collapse' },
          ]}
          onAccessibilityAction={(event) =>
            onPositionChange(
              event.nativeEvent.actionName === 'increment'
                ? 'expanded'
                : selected
                  ? 'medium'
                  : 'compact',
            )
          }
          onPress={toggle}
          style={styles.handleTouch}
        >
          <View style={styles.handle} />
        </Pressable>
      </View>
      {!selected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${summary}. ${position === 'compact' ? 'Show parking results' : 'Collapse results'}`}
          onPress={() =>
            onPositionChange(position === 'compact' ? 'medium' : 'compact')
          }
          style={styles.header}
        >
          <View style={ui.flex}>
            <Text
              accessibilityRole="header"
              style={ui.heading}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              accessibilityLiveRegion={busy ? 'polite' : 'none'}
              style={ui.small}
              numberOfLines={1}
            >
              {summary}
            </Text>
          </View>
          {busy ? (
            <ActivityIndicator color={colors.action} />
          ) : (
            <Icon
              name={position === 'compact' ? 'list' : 'chevron'}
              color={colors.brand}
              size={20}
            />
          )}
        </Pressable>
      ) : null}
      {position !== 'compact' || selected ? children : null}
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handleTouch: { height: 44, alignItems: 'center', justifyContent: 'center' },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
})
