import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { parkingDetailData } from './parking-detail-data'
import { fonts } from './typography'
import { Button, colors, Icon, IconButton, ui } from './ui'

export function ParkingDetails({
  parking,
  location,
  expanded,
  onDirections,
  favorite,
  onFavorite,
  favoriteDisabled,
  storageError,
}: {
  parking: DiscoveryParking
  location: Coordinate | null
  expanded: boolean
  onDirections: () => void
  favorite: boolean
  onFavorite: () => void
  favoriteDisabled: boolean
  storageError: string | null
}) {
  const { title, meta, rows } = parkingDetailData(parking, location)
  return (
    <View
      testID={expanded ? 'parking-details-expanded' : 'parking-preview'}
      style={ui.flex}
    >
      <View style={styles.summary}>
        <Text
          testID="parking-detail-title"
          accessibilityRole="header"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.title}
        >
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <ScrollView
        scrollEnabled={expanded}
        style={ui.flex}
        contentContainerStyle={styles.rows}
      >
        {expanded
          ? rows.map((row) => (
              <View
                key={`${row.label}:${row.value}`}
                accessible
                accessibilityLabel={`${row.label}: ${row.value}`}
                style={styles.row}
              >
                <Icon name={row.icon} size={20} color={colors.muted} />
                <Text style={[ui.body, ui.flex]}>{row.value}</Text>
              </View>
            ))
          : null}
      </ScrollView>
      {storageError ? (
        <Text
          accessibilityRole="alert"
          style={[ui.small, ui.error, styles.summary]}
        >
          {storageError}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <View style={ui.flex}>
          <Button
            testID="parking-get-directions"
            icon="arrow"
            disabled={parking.sourceKind === 'sample'}
            onPress={onDirections}
          >
            Directions
          </Button>
        </View>
        <IconButton
          icon="star"
          label={favorite ? 'Remove from favorites' : 'Save parking'}
          selected={favorite}
          disabled={favoriteDisabled || parking.sourceKind === 'sample'}
          onPress={onFavorite}
          style={styles.save}
        />
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  summary: { paddingHorizontal: 16, gap: 4 },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  save: { width: 52, height: 52, borderRadius: 26 },
  rows: { paddingHorizontal: 16, paddingTop: 0, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 12,
  },
})
