import type { DiscoveryParking } from '@parkey/shared-types'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { ParkingReference } from './model'
import { parkingDetailData } from './parking-detail-data'
import { colors, IconButton, ui } from './ui'

export const PARKING_ROW_HEIGHT = 80
export function ParkingRow({
  parking,
  reference,
  onPress,
  onDirections,
  onFavorite,
  favorite,
  disabled = false,
  selected = false,
  testID,
}: {
  parking: DiscoveryParking
  reference: ParkingReference
  now?: Date
  onPress: () => void
  onDirections: () => void
  onFavorite: () => void
  favorite: boolean
  disabled?: boolean
  selected?: boolean
  compact?: boolean
  testID?: string | undefined
}) {
  const text = parkingDetailData(
    parking,
    reference.label === 'your location' ? reference.coordinate : null,
  )
  return (
    <View testID={testID} style={[styles.row, selected && styles.selected]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${text.title}. ${text.meta}. Open parking details`}
        onPress={onPress}
        style={({ pressed }) => [styles.content, pressed && ui.pressed]}
      >
        <Text style={ui.heading} numberOfLines={1}>
          {text.title}
        </Text>
        <Text style={ui.small} numberOfLines={1}>
          {text.meta}
        </Text>
      </Pressable>
      <IconButton
        icon="arrow"
        label={`Directions to ${text.title}`}
        disabled={parking.sourceKind === 'sample'}
        color={colors.surface}
        onPress={onDirections}
        style={styles.directions}
      />
      <IconButton
        icon="star"
        label={`${favorite ? 'Unsave' : 'Save'} ${text.title}`}
        selected={favorite}
        disabled={disabled || parking.sourceKind === 'sample'}
        onPress={onFavorite}
        style={styles.icon}
      />
    </View>
  )
}
const styles = StyleSheet.create({
  row: {
    height: PARKING_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  content: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
  },
  icon: { width: 44, height: 44 },
  directions: { width: 44, height: 44, backgroundColor: colors.action },
  selected: { backgroundColor: colors.selected },
})
