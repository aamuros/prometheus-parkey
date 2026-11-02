import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { TAB_BAR_HEIGHT } from './bottom-navigation'
import { FigmaAsset } from './figma-assets'
import type { FigmaAssetName } from './figma-assets'
import { fonts } from './typography'
import { colors, ui } from './ui'
import type { useLocalState } from './use-local-state'

export function ParkingPage({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, 16) + 24,
          },
        ]}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={ui.title}>
            {title}
          </Text>
          {subtitle ? <Text style={ui.small}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </View>
  )
}

export function ParkingTile({
  title,
  subtitle,
  icon,
  onPress,
  accent = false,
  disabled = false,
}: {
  title: string
  subtitle: string
  icon: FigmaAssetName
  onPress: () => void
  accent?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.55 },
      ]}
    >
      <View
        style={[styles.tileIcon, accent && { backgroundColor: colors.brand }]}
      >
        <FigmaAsset name={icon} size={22} />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSubtitle}>{subtitle}</Text>
    </Pressable>
  )
}

export function ParkingProfile({
  local,
  contributions,
  onSaved,
  onAdd,
  onCar,
}: {
  local: ReturnType<typeof useLocalState>
  contributions: number | null
  onSaved: () => void
  onAdd: () => void
  onCar: () => void
}) {
  const ready = local.status === 'ready'
  return (
    <ParkingPage title="Your parking">
      <View style={styles.scout}>
        <View style={styles.ring}>
          <FigmaAsset name="ring" size={96} />
          <Text style={styles.ringLetter}>P</Text>
        </View>
        <View style={ui.flex}>
          <Text style={ui.sectionTitle}>Local scout</Text>
          <Text style={ui.small}>
            Your parking activity, saved on this device.
          </Text>
          <View style={styles.track} />
          <Text style={styles.caption}>Levels and XP coming soon</Text>
        </View>
      </View>
      <View style={ui.row}>
        {(
          [
            {
              label: 'Saved',
              icon: 'bookmark',
              count: ready ? local.state.favorites.length : null,
              action: onSaved,
            },
            {
              label: 'Drafts',
              icon: 'contributed',
              count: contributions,
              action: onAdd,
            },
            {
              label: 'Car saved',
              icon: 'car',
              count: ready ? Number(!!local.state.parked) : null,
              action: onCar,
            },
          ] as const
        ).map((stat) => (
          <Pressable
            key={stat.label}
            accessibilityRole="button"
            onPress={stat.action}
            style={styles.stat}
          >
            <FigmaAsset name={stat.icon} size={20} />
            <Text style={ui.title}>{stat.count ?? '—'}</Text>
            <Text style={styles.caption}>{stat.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={ui.row}>
        <ParkingTile
          title="Your car"
          subtitle={
            local.state.parked ? 'Show saved location' : 'Save where you parked'
          }
          icon="car-white"
          onPress={onCar}
        />
        <ParkingTile
          title="Add parking"
          subtitle="Help map your area"
          icon="plus-small"
          accent
          onPress={onAdd}
        />
      </View>
      <View style={styles.time}>
        <Text style={ui.heading}>Time to park</Text>
        <Text style={ui.small}>No parking-time history yet</Text>
        <View style={styles.week}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <View key={day} style={styles.day}>
              <View style={styles.emptyBar} />
              <Text style={styles.caption}>{day}</Text>
            </View>
          ))}
        </View>
        <Text style={ui.small}>
          Weekly insights will appear when tracking is available.
        </Text>
      </View>
      {local.error ? (
        <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
          {local.error}
        </Text>
      ) : null}
    </ParkingPage>
  )
}
const styles = StyleSheet.create({
  page: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  header: { paddingHorizontal: 8, gap: 2 },
  scout: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ring: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLetter: {
    position: 'absolute',
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.brand,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.soft,
    marginTop: 8,
    marginBottom: 4,
  },
  caption: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.disabled,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 20,
    gap: 4,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 140,
    backgroundColor: colors.dark,
    padding: 16,
    borderRadius: 20,
    gap: 4,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.darkRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tileTitle: { ...ui.heading, color: colors.surface },
  tileSubtitle: { ...ui.small, color: colors.onDarkMuted },
  time: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 16,
    gap: 4,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    gap: 8,
  },
  day: { flex: 1, alignItems: 'center', gap: 6 },
  emptyBar: {
    height: 4,
    width: '100%',
    marginTop: 60,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
})
