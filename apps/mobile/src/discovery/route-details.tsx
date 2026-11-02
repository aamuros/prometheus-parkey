import { useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import type { Coordinate } from '@parkey/shared-types'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import { FigmaAsset } from './figma-assets'
import { arrivalTime } from './drive-math'
import { directionsUrl } from './model'
import { routeDistance, routeDuration } from './routing'
import type { DrivingStep } from './routing'
import { fonts } from './typography'
import { Button, colors, IconButton, ui } from './ui'
import type { DrivePhase } from './use-drive-navigation'
import type { RouteState } from './use-route'

export function NavigationBanner({
  step,
  distance,
  rerouting,
  then,
}: {
  then?: DrivingStep | undefined
  step: DrivingStep | undefined
  distance: number
  rerouting: boolean
}) {
  const path =
    step?.maneuver.includes('roundabout') || step?.maneuver === 'rotary'
      ? 'M12 21v-5a5 5 0 1 1 5-5M17 11V4m-4 4 4-4 4 4'
      : step?.modifier === 'uturn'
        ? 'M7 21V8a5 5 0 0 1 10 0v8m-4-4 4 4 4-4'
        : step?.modifier.includes('left')
          ? 'M18 21V10H4m5-5-5 5 5 5'
          : step?.modifier.includes('right')
            ? 'M6 21V10h14m-5-5 5 5-5 5'
            : step?.maneuver === 'arrive'
              ? 'M6 22V3h13v10H6'
              : 'M12 22V3m-7 7 7-7 7 7'
  return (
    <View testID="navigation-banner" style={[styles.banner, ui.shadow]}>
      <View style={ui.row}>
        <View style={styles.turnBadge}>
          {step?.modifier.includes('right') ? (
            <FigmaAsset name="turn-right" size={34} />
          ) : (
            <Svg
              width={34}
              height={34}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.surface}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d={path} />
            </Svg>
          )}
        </View>
        <View style={ui.flex} accessibilityLiveRegion="polite">
          <Text style={styles.maneuverDistance}>
            {rerouting ? 'Rerouting…' : routeDistance(distance)}
          </Text>
          <Text style={styles.maneuver}>
            {step?.instruction ?? 'Follow the route'}
          </Text>
        </View>
      </View>
      {then ? (
        <View style={styles.then}>
          <Text style={styles.thenLabel}>Then</Text>
          {then.modifier.includes('left') ? (
            <FigmaAsset name="then-left" size={16} />
          ) : null}
          <Text style={[ui.small, { color: colors.surface, flex: 1 }]}>
            {then.instruction}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export function RouteDetails({
  destinationName,
  destination,
  state,
  phase,
  starting,
  denied,
  message,
  fromMapCenter,
  remainingDistance,
  remainingDuration,
  onStart,
  onPark,
  onNext,
  saving,
  onClose,
  onDetails,
  onRetry,
  onHeightChange,
}: {
  destinationName: string
  destination: Coordinate
  state: RouteState
  phase: DrivePhase
  starting: boolean
  denied: boolean
  message: string | null
  fromMapCenter: boolean
  remainingDistance: number | undefined
  remainingDuration: number | undefined
  onStart: () => void
  onPark: () => void
  onNext: (() => void) | null
  saving: boolean
  onClose: () => void
  onDetails: (() => void) | null
  onRetry: () => void
  onHeightChange: (height: number) => void
}) {
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [expanded, setExpanded] = useState(false)
  const [gesture] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, event) => Math.abs(event.dy) > 12,
      onPanResponderRelease: (_, event) => {
        if (event.dy < -25) setExpanded(true)
        if (event.dy > 25) setExpanded(false)
      },
    }),
  )
  const busy = state.status === 'locating' || state.status === 'loading'
  const duration = remainingDuration ?? state.route?.duration
  const distance = remainingDistance ?? state.route?.distance
  return (
    <View
      testID="route-panel"
      onLayout={(event) => onHeightChange(event.nativeEvent.layout.height)}
      style={[
        styles.sheet,
        phase === 'navigating' && styles.tripBar,
        ui.shadow,
        {
          maxHeight: height * 0.75,
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}
    >
      {phase === 'navigating' ? (
        <>
          <View style={[ui.row, { gap: 32 }]}>
            <View style={ui.flex}>
              {duration !== undefined && distance !== undefined ? (
                <>
                  <Text style={ui.sectionTitle}>{routeDuration(duration)}</Text>
                  <Text style={ui.small}>
                    {routeDistance(distance)} · Arrive {arrivalTime(duration)}
                  </Text>
                </>
              ) : (
                <Text style={ui.body}>Calculating route…</Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.end}
            >
              <Text style={styles.endText}>End</Text>
            </Pressable>
          </View>
          {message || state.error ? (
            <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
              {message ?? state.error}
            </Text>
          ) : null}
        </>
      ) : phase === 'arrived' ? (
        <>
          <View style={styles.handle} />
          <View style={ui.row}>
            <Text accessibilityRole="header" style={[ui.title, ui.flex]}>
              You’ve arrived
            </Text>
            <IconButton
              icon="close"
              label="Close directions"
              onPress={onClose}
            />
          </View>
          <Text style={ui.small}>{destinationName}</Text>
          <View style={styles.warning}>
            <FigmaAsset name="warning" size={18} />
            <Text style={[ui.small, { color: colors.amber, flex: 1 }]}>
              Confirm the entrance and posted signs.
            </Text>
          </View>
          <Button disabled={saving} onPress={onPark}>
            {saving ? 'Saving…' : 'I parked here'}
          </Button>
          {onNext ? (
            <Button secondary disabled={saving} onPress={onNext}>
              Can’t park here · Next nearest
            </Button>
          ) : (
            <Text style={ui.small}>
              No other mapped parking of this type nearby.
            </Text>
          )}
          {message ? (
            <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
              {message}
            </Text>
          ) : null}
        </>
      ) : (
        <ScrollView
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ gap: 16 }}
        >
          <View {...gesture.panHandlers}>
            <View style={styles.handle} />
            <View style={[ui.row, { alignItems: 'flex-start' }]}>
              <Text
                accessibilityRole="header"
                style={[ui.sectionTitle, ui.flex]}
              >
                {destinationName}
              </Text>
              <IconButton
                icon="close"
                label="Close directions"
                onPress={onClose}
              />
            </View>
          </View>
          {state.route ? (
            <>
              <View
                style={[
                  ui.row,
                  { justifyContent: 'space-between', alignItems: 'flex-end' },
                ]}
                accessibilityLiveRegion="polite"
              >
                <Text style={styles.eta}>
                  {routeDuration(state.route.duration)}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={ui.sectionTitle}>
                    {routeDistance(state.route.distance)}
                  </Text>
                  <Text style={ui.small}>
                    Arrive {arrivalTime(state.route.duration)}
                  </Text>
                </View>
              </View>
              {fromMapCenter ? (
                <Text style={ui.small}>
                  Preview from map center · Start uses your live location
                </Text>
              ) : null}
            </>
          ) : busy ? (
            <View style={ui.row}>
              <ActivityIndicator color={colors.accent} />
              <Text style={ui.body}>Calculating route…</Text>
            </View>
          ) : null}
          {message || state.error ? (
            <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
              {message ?? state.error}
            </Text>
          ) : null}
          <View style={ui.row}>
            <View style={ui.flex}>
              <Button
                icon="arrow"
                disabled={starting || !state.route}
                onPress={onStart}
              >
                {starting ? 'Locating…' : 'Start'}
              </Button>
            </View>
            {state.route ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Steps"
                accessibilityState={{ expanded }}
                onPress={() => setExpanded(!expanded)}
                style={styles.stepsToggle}
              >
                <Text style={[ui.heading, ui.link]}>Steps</Text>
              </Pressable>
            ) : null}
          </View>
          {expanded ? (
            <Text style={ui.small}>
              Live guidance while Parkey is open · No voice guidance
            </Text>
          ) : null}
          {expanded && onDetails ? (
            <Button secondary onPress={onDetails}>
              Parking details
            </Button>
          ) : null}
          {!state.route && !busy ? (
            <Button secondary onPress={onRetry}>
              Try again
            </Button>
          ) : null}
          {denied || state.error ? (
            <View style={{ gap: 8 }}>
              {(['google', 'apple', 'waze'] as const).map((provider) => (
                <Button
                  key={provider}
                  secondary
                  onPress={() => {
                    void Linking.openURL(directionsUrl(destination, provider))
                  }}
                >
                  Open in{' '}
                  {provider === 'google'
                    ? 'Google Maps'
                    : provider === 'apple'
                      ? 'Apple Maps'
                      : 'Waze'}
                </Button>
              ))}
            </View>
          ) : null}
          {state.route ? (
            <>
              {expanded ? (
                <ScrollView
                  style={{ flexShrink: 1 }}
                  contentContainerStyle={{ gap: 16 }}
                >
                  {state.route.steps.map((item, index) => (
                    <View
                      key={index}
                      style={[ui.row, { alignItems: 'flex-start' }]}
                    >
                      <Text style={styles.number}>{index + 1}</Text>
                      <View style={ui.flex}>
                        <Text style={ui.body}>{item.instruction}</Text>
                        {item.distance > 0 ? (
                          <Text style={ui.small}>
                            Continue for {routeDistance(item.distance)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  number: {
    fontFamily: fonts.semibold,
    minWidth: 32,
    fontSize: 14,
    lineHeight: 24,
    color: colors.action,
  },
  stepsToggle: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.selected,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    backgroundColor: colors.dark,
    borderRadius: 28,
    padding: 16,
    gap: 12,
  },
  tripBar: {
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 28,
    paddingHorizontal: 20,
  },
  turnBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maneuverDistance: {
    fontFamily: fonts.black,
    fontSize: 40,
    lineHeight: 46,
    color: colors.surface,
  },
  then: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.darkRaised,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  thenLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.onDarkMuted,
  },
  end: {
    backgroundColor: colors.dangerSurface,
    borderRadius: 999,
    paddingHorizontal: 24,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endText: { fontFamily: fonts.bold, fontSize: 17, color: colors.error },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSurface,
    borderRadius: 16,
    padding: 12,
  },
  eta: {
    fontFamily: fonts.black,
    fontSize: 40,
    lineHeight: 48,
    color: colors.ink,
    flexShrink: 1,
  },
  maneuver: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onDarkMuted,
    flexShrink: 1,
  },
})
