import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { routeDistance, routeDuration } from './routing'
import { Button, colors, IconButton, ui } from './ui'
import type { RouteState } from './use-route'

export function RouteDetails({
  destinationName,
  state,
  onClose,
  onDetails,
  onRetry,
  onHeightChange,
}: {
  destinationName: string
  state: RouteState
  onClose: () => void
  onDetails: (() => void) | null
  onRetry: () => void
  onHeightChange: (height: number) => void
}) {
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const busy = state.status === 'locating' || state.status === 'loading'

  return (
    <View
      onLayout={(event) => onHeightChange(event.nativeEvent.layout.height)}
      style={[
        styles.sheet,
        ui.shadow,
        {
          height: Math.min(height * 0.57, 480),
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}
    >
      <View style={[ui.row, { alignItems: 'flex-start' }]}>
        <View style={ui.flex}>
          <Text style={ui.eyebrow}>DRIVING ROUTE</Text>
          <Text accessibilityRole="header" numberOfLines={2} style={ui.heading}>
            {destinationName}
          </Text>
        </View>
        <IconButton icon="close" label="Close directions" onPress={onClose} />
      </View>
      {state.route ? (
        <Text accessibilityLiveRegion="polite" style={ui.title}>
          {routeDuration(state.route.duration)} ·{' '}
          {routeDistance(state.route.distance)}
        </Text>
      ) : null}
      <FlatList
        style={ui.flex}
        data={state.route?.steps ?? []}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
        ListEmptyComponent={
          busy ? (
            <View style={[ui.row, { paddingVertical: 16 }]}>
              <ActivityIndicator color={colors.accent} />
              <Text accessibilityLiveRegion="polite" style={[ui.body, ui.flex]}>
                {state.status === 'locating'
                  ? 'Finding your starting location…'
                  : 'Calculating your driving route…'}
              </Text>
            </View>
          ) : (
            <Text
              accessibilityRole="alert"
              style={[ui.body, state.error ? ui.error : null]}
            >
              {state.error ||
                'Choose a starting location to calculate directions.'}
            </Text>
          )
        }
        renderItem={({ item, index }) => (
          <View style={[ui.row, { alignItems: 'flex-start' }]}>
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
        )}
      />
      <Text style={ui.small}>
        Route preview · no live traffic. Confirm the entrance and posted signs.
      </Text>
      <View style={[ui.row, { marginTop: 10 }]}>
        {onDetails ? (
          <View style={ui.flex}>
            <Button secondary onPress={onDetails}>
              Parking details
            </Button>
          </View>
        ) : null}
        <View style={ui.flex}>
          <Button disabled={busy} onPress={onRetry}>
            {state.route ? 'Recalculate' : 'Try again'}
          </Button>
        </View>
      </View>
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 8,
  },
  number: {
    minWidth: 24,
    fontSize: 14,
    fontWeight: '700',
    color: colors.action,
  },
})
