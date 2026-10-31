import type { DiscoveryParking } from '@parkey/shared-types'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { kindLabels } from './model'
import type { ParkingReference } from './model'
import { parkingRowText } from './presentation'
import { colors, Icon, ui } from './ui'

export function ParkingRow({
  parking,
  reference,
  now,
  onPress,
  compact = false,
  testID,
}: {
  parking: DiscoveryParking
  reference: ParkingReference
  now: Date
  onPress: () => void
  compact?: boolean
  testID?: string | undefined
}) {
  const text = parkingRowText(parking, reference, now)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text.title}. ${kindLabels[parking.kind]}. ${text.distance}. ${text.verification}. ${text.facts}. Open parking details`}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && ui.pressed]}
    >
      <View
        accessible={false}
        style={[styles.marker, parking.kind === 'street' && styles.street]}
      >
        {parking.kind === 'street' ? (
          <View style={styles.streetLine} />
        ) : (
          <Text style={styles.markerText}>
            {parking.kind === 'garage' ? 'G' : 'P'}
          </Text>
        )}
      </View>
      <View style={ui.flex}>
        <Text style={ui.heading} numberOfLines={compact ? 1 : 2}>
          {text.title}
        </Text>
        {!compact ? (
          <>
            <View style={styles.metadata}>
              <Text style={[ui.small, ui.flex]} numberOfLines={1}>
                {text.distance}
              </Text>
              <Text style={[ui.small, styles.badge]} numberOfLines={1}>
                {text.verification}
              </Text>
            </View>
            <Text style={ui.small} numberOfLines={1}>
              {text.facts}
            </Text>
          </>
        ) : null}
      </View>
      <Icon name="arrow" color={colors.action} size={18} />
    </Pressable>
  )
}
const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: { color: colors.brand, fontSize: 15, fontWeight: '700' },
  street: { borderWidth: 0 },
  streetLine: {
    height: 6,
    width: 30,
    borderRadius: 3,
    backgroundColor: colors.action,
  },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    fontWeight: '600',
    backgroundColor: colors.canvas,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
})
