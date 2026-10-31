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
  onClose,
}: {
  step: DrivingStep | undefined
  distance: number
  rerouting: boolean
  onClose: () => void
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
      <Svg
        width={40}
        height={40}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.brandDeep}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d={path} />
      </Svg>
      <View style={ui.flex} accessibilityLiveRegion="polite">
        <Text style={styles.maneuver}>
          {rerouting ? 'Rerouting…' : routeDistance(distance)}
        </Text>
        <Text style={styles.maneuver}>
          {step?.instruction ?? 'Follow the route'}
        </Text>
      </View>
      <IconButton icon="close" label="End navigation" onPress={onClose} />
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
                  <Text style={ui.title}>
                    {routeDuration(duration)} · {routeDistance(distance)}
                  </Text>
                  <Text style={ui.body}>Arrive {arrivalTime(duration)}</Text>
                </>
              ) : (
                <Text style={ui.body}>Calculating route…</Text>
              )}
            </View>
            <Button secondary onPress={onClose}>
              End
            </Button>
          </View>
          {message || state.error ? (
            <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
              {message ?? state.error}
            </Text>
          ) : null}
          <Text style={ui.small}>
            Tracking only while Parkey is open · No voice guidance
          </Text>
        </>
      ) : phase === 'arrived' ? (
        <>
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
          <Text style={ui.sectionTitle}>{destinationName}</Text>
          <Text style={ui.small}>Confirm the entrance and posted signs</Text>
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
          contentContainerStyle={{ gap: 10 }}
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
              <Text accessibilityLiveRegion="polite" style={ui.title}>
                {routeDuration(state.route.duration)} ·{' '}
                {routeDistance(state.route.distance)}
              </Text>
              <Text style={ui.body}>
                Arrive {arrivalTime(state.route.duration)}
              </Text>
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
          <Text style={ui.small}>
            Use your location for guidance while Parkey is open.
          </Text>
          <Button disabled={starting || !state.route} onPress={onStart}>
            {starting ? 'Finding your location…' : 'Start'}
          </Button>
          {onDetails ? (
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Steps"
                accessibilityState={{ expanded }}
                onPress={() => setExpanded(!expanded)}
                style={styles.stepsToggle}
              >
                <Text style={[ui.heading, ui.link]}>
                  Steps {expanded ? '⌄' : '⌃'}
                </Text>
              </Pressable>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.surface,
    padding: 24,
    gap: 10,
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
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  maneuver: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 29,
    color: colors.brandDeep,
    flexShrink: 1,
  },
})
