import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
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
import { colors, Icon, IconButton, ui } from './ui'
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
  onSaved,
  onInfo,
  onLocate,
  locating,
}: {
  position: SheetPosition
  selected: boolean
  title: string
  summary: string
  busy: boolean
  onPositionChange: (position: SheetPosition) => void
  onHeightChange: (height: number) => void
  children: ReactNode
  onSaved: () => void
  onInfo: () => void
  onLocate: (() => void) | null
  locating: boolean
}) {
  const { height, fontScale } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [headerHeight, setHeaderHeight] = useState(0)
  const [attributionHeight, setAttributionHeight] = useState(48)
  const heights = useMemo(
    () =>
      sheetHeights(
        height - attributionHeight,
        insets.top,
        insets.bottom,
        selected,
        fontScale,
        headerHeight,
      ),
    [
      height,
      insets.top,
      insets.bottom,
      selected,
      fontScale,
      headerHeight,
      attributionHeight,
    ],
  )
  const [motion] = useState(() => new Animated.Value(heights[position]))
  const reduced = useReducedMotion()

  useEffect(() => {
    onHeightChange(heights[position] + attributionHeight)
    const animation = Animated.timing(motion, {
      toValue: heights[position],
      duration: reduced ? 0 : 220,
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [heights, position, motion, reduced, onHeightChange, attributionHeight])

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
              (selected ? heights.medium : heights.compact) + attributionHeight,
              heights.expanded + attributionHeight,
            ],
            extrapolate: 'clamp',
          }),
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View
        onLayout={(event) =>
          setAttributionHeight(event.nativeEvent.layout.height)
        }
      >
        <MapAttribution onPress={onInfo} />
      </View>
      <View style={styles.content}>
        <View
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        >
          <View style={styles.toolbar}>
            <IconButton
              icon="star"
              label="Open saved places"
              onPress={onSaved}
            />
            <View style={ui.flex} {...pan.panHandlers}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  selected
                    ? position === 'expanded'
                      ? 'Collapse parking panel'
                      : 'Expand parking panel'
                    : `${title}. ${summary}. ${position === 'compact' ? 'Show parking results' : 'Collapse results'}`
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
                testID={!selected ? 'parking-results-toggle' : undefined}
                onPress={
                  selected
                    ? toggle
                    : () =>
                        onPositionChange(
                          position === 'compact' ? 'medium' : 'compact',
                        )
                }
                style={styles.handleTouch}
              >
                <View style={styles.handle} />
                {!selected ? (
                  <>
                    {position !== 'compact' ? (
                      <Text
                        accessibilityRole="header"
                        style={ui.heading}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                    ) : null}
                    <Text
                      accessibilityLiveRegion={busy ? 'polite' : 'none'}
                      style={ui.small}
                      numberOfLines={1}
                    >
                      {summary}
                    </Text>
                  </>
                ) : null}
              </Pressable>
            </View>
            <IconButton
              icon="info"
              label="Open map information and drafts"
              onPress={onInfo}
            />
          </View>
          {!selected ? (
            <View>
              <View style={styles.referenceRow}>
                <Text style={styles.distanceNote}>Straight-line distances</Text>
                {onLocate ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: locating }}
                    disabled={locating}
                    onPress={onLocate}
                    style={({ pressed }) => [
                      styles.locationAction,
                      pressed && ui.pressed,
                    ]}
                  >
                    <Icon name="locate" color={colors.action} size={18} />
                    <Text style={[ui.small, ui.link]}>
                      {locating ? 'Finding your location…' : 'Use my location'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  handleTouch: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  referenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  distanceNote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    paddingVertical: 4,
  },
  locationAction: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
})

export function MapAttribution({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Map data sources and attribution"
      onPress={onPress}
      style={({ pressed }) => [attributionStyles.touch, pressed && ui.pressed]}
    >
      <Text style={attributionStyles.text}>
        © OpenStreetMap · OpenMapTiles · OpenFreeMap
      </Text>
    </Pressable>
  )
}
const attributionStyles = StyleSheet.create({
  touch: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  text: { fontSize: 10, lineHeight: 14, color: colors.muted },
})
