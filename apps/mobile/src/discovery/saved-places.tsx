import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'

import { parkingTitle } from './presentation'
import { resolveSaved } from './local-state'
import type { SavedRecord } from './local-state'
import { ModalSheet } from './sheets'
import { Button, Choice, colors, Icon, Notice, UndoToast, ui } from './ui'
import type { useLocalState } from './use-local-state'

export function SavedPlaces({
  local,
  records,
  locating,
  locationError,
  onSaveParked,
  onCenter,
  onDirections,
  onSelect,
  onClose,
}: {
  local: ReturnType<typeof useLocalState>
  records: DiscoveryParking[]
  locating: boolean
  locationError: string | null
  onSaveParked: () => void
  onCenter: (point: Coordinate) => void
  onDirections: () => void
  onSelect: (record: DiscoveryParking) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'favorites' | 'recents'>('favorites')
  const [toast, setToast] = useState<{
    message: string
    undo: () => void
  } | null>(null)
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])
  const disabled = local.status !== 'ready' || local.busy
  function row(saved: SavedRecord) {
    const record = resolveSaved(saved, records)
    const title = parkingTitle(record ?? saved)
    return (
      <View key={saved.key} style={styles.savedRow}>
        <View style={ui.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${record ? 'View parking' : 'Show saved area'}`}
            onPress={() =>
              record ? onSelect(record) : onCenter(saved.coordinate)
            }
            style={({ pressed }) => [styles.savedAction, pressed && ui.pressed]}
          >
            <Icon name="pin" color={colors.brandDeep} size={24} />
            <View style={ui.flex}>
              <Text style={ui.heading}>{title}</Text>
              <Text style={ui.muted}>
                {record ? 'View parking' : 'Show saved area'}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${title} from ${tab === 'favorites' ? 'favorites' : 'recently viewed places'}`}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => {
              void local.remove(saved.key, tab).then((savedOk) => {
                if (savedOk)
                  setToast({
                    message: 'Place removed',
                    undo: () => {
                      void local.restoreSaved(saved, tab)
                      setToast(null)
                    },
                  })
              })
            }}
            style={({ pressed }) => [styles.remove, pressed && ui.pressed]}
          >
            <Text
              style={[
                ui.muted,
                ui.link,
                disabled && { color: colors.disabled },
              ]}
            >
              Remove
            </Text>
          </Pressable>
        </View>
        {!record ? (
          <Text style={ui.small}>
            This record isn’t in the loaded map data. It may be outside this
            area or no longer listed.
          </Text>
        ) : null}
      </View>
    )
  }
  return (
    <ModalSheet title="Saved places" onClose={onClose}>
      {toast ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <UndoToast message={toast.message} onUndo={toast.undo} />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[ui.row, { flexWrap: 'wrap' }]}>
          <Choice
            selected={tab === 'favorites'}
            onPress={() => setTab('favorites')}
          >
            Favorites
          </Choice>
          <Choice
            selected={tab === 'recents'}
            onPress={() => setTab('recents')}
          >
            Recently viewed
          </Choice>
        </View>
        {local.state[tab].map(row)}
        {local.status === 'ready' && local.state[tab].length === 0 ? (
          <Text style={ui.body}>
            {tab === 'favorites'
              ? 'Star a parking location to save it here.'
              : 'Your last 10 viewed parking locations will appear here.'}
          </Text>
        ) : null}
        <View style={ui.divider} />
        <Text style={ui.sectionTitle}>Where I parked</Text>
        <Text style={ui.small}>
          Saved on this device only. Saving uses your current location.
        </Text>
        {local.state.parked ? (
          <>
            <Text style={ui.body}>Parking location saved</Text>
            <Button
              secondary
              onPress={() => {
                const parked = local.state.parked
                if (parked) onCenter(parked.coordinate)
              }}
            >
              Show on map
            </Button>
            <Button onPress={onDirections}>Directions back</Button>
            <Text style={ui.small}>
              Directions share your start and saved location with the routing
              provider. Driving route only; this is not a walking route.
            </Text>
            <Button
              secondary
              disabled={disabled}
              onPress={() => {
                const previous = local.state
                void local.park(null).then((ok) => {
                  if (ok)
                    setToast({
                      message: 'Parked location cleared',
                      undo: () => {
                        void local.restore(previous)
                        setToast(null)
                      },
                    })
                })
              }}
            >
              Clear parked location
            </Button>
          </>
        ) : null}
        <Button disabled={disabled || locating} onPress={onSaveParked}>
          {locating
            ? 'Finding your location…'
            : local.state.parked
              ? 'Replace with my current location'
              : 'Save where I parked'}
        </Button>
        {locationError ? <Notice>{locationError}</Notice> : null}
        {local.status === 'loading' ? (
          <Text style={ui.small}>Loading saved places…</Text>
        ) : null}
        {local.error ? (
          <Text accessibilityRole="alert" style={[ui.body, ui.error]}>
            {local.error}
          </Text>
        ) : null}
        {local.status === 'error' ? (
          <>
            <Button secondary onPress={() => void local.retry()}>
              Try loading again
            </Button>
            <Button
              secondary
              disabled={local.busy}
              onPress={() => {
                const previous = local.state
                void local.clear().then(() =>
                  setToast({
                    message: 'Saved data cleared',
                    undo: () => {
                      void local.restore(previous)
                      setToast(null)
                    },
                  }),
                )
              }}
            >
              Clear saved data on this device
            </Button>
          </>
        ) : null}
      </ScrollView>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  savedRow: {
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  savedAction: {
    flex: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  remove: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 24,
  },
})
