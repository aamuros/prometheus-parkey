import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { FigmaAsset } from './figma-assets'
import { parkingDetailData } from './parking-detail-data'
import { SpotThumbnail } from './spot-photo-view'
import { fonts } from './typography'
import { Button, colors, IconButton, ui } from './ui'

export function ParkingDetails({
  parking,
  now,
  onAddDetails,
  location,
  expanded,
  onDirections,
  favorite,
  onFavorite,
  favoriteDisabled,
  storageError,
}: {
  now: Date
  onAddDetails: () => void
  parking: DiscoveryParking
  location: Coordinate | null
  expanded: boolean
  onDirections: () => void
  favorite: boolean
  onFavorite: () => void
  favoriteDisabled: boolean
  storageError: string | null
}) {
  const { title, meta, rows, chips, warning, sparse, updated } =
    parkingDetailData(parking, location, now)
  return (
    <ScrollView
      testID={expanded ? 'parking-details-expanded' : 'parking-preview'}
      style={expanded ? ui.flex : { flexShrink: 1 }}
      contentContainerStyle={{ paddingBottom: 2 }}
    >
      <View
        style={[
          styles.summary,
          { flexDirection: 'row', alignItems: 'center', gap: 12 },
        ]}
      >
        <SpotThumbnail key={parking.id} parking={parking} name={title} />
        <View style={ui.flex}>
          <Text
            testID="parking-detail-title"
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.title}
          >
            {title}
          </Text>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>
      {!expanded && chips.length ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <Text
              key={chip}
              style={[
                styles.chip,
                chip === 'Free' && {
                  backgroundColor: colors.selected,
                  color: colors.brand,
                },
                /open/i.test(chip) && {
                  backgroundColor: colors.successSurface,
                  color: colors.success,
                },
              ]}
            >
              {chip}
            </Text>
          ))}
        </View>
      ) : null}
      {warning ? (
        <View style={styles.chips}>
          <Text
            accessibilityRole="alert"
            style={[
              styles.chip,
              { backgroundColor: colors.warningSurface, color: colors.amber },
            ]}
          >
            {warning}
          </Text>
        </View>
      ) : null}
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
      {expanded ? <SpotThumbnail parking={parking} name={title} strip /> : null}
      {expanded ? (
        <View style={styles.rows}>
          {rows.map((row) => (
            <Pressable
              key={`${row.label}:${row.value}`}
              disabled={!row.url}
              accessibilityRole={row.url ? 'link' : undefined}
              accessibilityLabel={`${row.label}: ${row.value}`}
              onPress={() => {
                if (row.url)
                  void Linking.openURL(row.url).catch(() => undefined)
              }}
              style={styles.row}
            >
              <View style={styles.rowIcon}>
                <FigmaAsset
                  name={
                    row.icon === 'clock'
                      ? 'clock'
                      : row.icon === 'fees'
                        ? 'fees'
                        : row.icon === 'access'
                          ? 'access'
                          : 'spaces'
                  }
                  size={20}
                />
              </View>
              <View style={ui.flex}>
                <Text style={styles.label}>{row.label}</Text>
                <Text
                  style={[
                    ui.body,
                    ui.flex,
                    row.today && { fontFamily: fonts.semibold },
                    row.url && ui.link,
                  ]}
                >
                  {row.label === 'Phone' ||
                  row.label === 'Website' ||
                  row.label === 'Maximum stay' ||
                  row.label === 'Height limit' ||
                  row.label === 'Operator' ||
                  row.label === 'Type'
                    ? `${row.label}: ${row.value}`
                    : row.value}
                </Text>
              </View>
            </Pressable>
          ))}
          {updated ? <Text style={ui.small}>{updated}</Text> : null}
        </View>
      ) : null}
      {expanded && sparse ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAddDetails}
          style={styles.help}
        >
          <Text style={ui.small}>Help other drivers</Text>
          <Text style={[ui.body, ui.link]}>Add missing details</Text>
          <Text style={ui.small}>
            Saved as a private preview on this device
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={onAddDetails}
        style={styles.correction}
      >
        <FigmaAsset name="pencil" size={18} />
        <Text style={[ui.small, ui.link]}>Suggest a correction</Text>
      </Pressable>
    </ScrollView>
  )
}
const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  chip: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.soft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  help: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.selected,
    gap: 4,
    minHeight: 44,
  },
  summary: { paddingHorizontal: 16, paddingRight: 56, gap: 4 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  save: { width: 56, height: 56, borderRadius: 28 },
  rows: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.soft,
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.disabled,
  },
  correction: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
})
