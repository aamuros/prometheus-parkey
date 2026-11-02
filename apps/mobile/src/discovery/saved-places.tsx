import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'

import { PILOT_CENTER } from './model'
import { parkingTitle } from './presentation'
import { resolveSaved } from './local-state'
import type { SavedRecord } from './local-state'
import { ModalSheet } from './sheets'
import { DestinationSearch } from './search'
import { ParkingPage, ParkingTile } from './parking-profile'
import { useSavedAddresses } from './saved-addresses'
import type { AddressKind } from './saved-addresses'
import { FigmaAsset } from './figma-assets'
import { Button, Choice, colors, IconButton, Notice, UndoToast, ui } from './ui'
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
  onAddPlace,
  onParkingDirections,
  onLocateAddress,
}: {
  local: ReturnType<typeof useLocalState>
  records: DiscoveryParking[]
  locating: boolean
  locationError: string | null
  onSaveParked: () => void
  onCenter: (point: Coordinate) => void
  onDirections: () => void
  onSelect: (record: DiscoveryParking) => void
  onAddPlace: () => void
  onParkingDirections: (record: DiscoveryParking) => void
  onLocateAddress: () => Promise<Coordinate | null>
}) {
  const [managing, setManaging] = useState(false)
  const [tab, setTab] = useState<'favorites' | 'recents'>('recents')
  const savedAddresses = useSavedAddresses()
  const [editing, setEditing] = useState<AddressKind | null>(null)
  const [addressQuery, setAddressQuery] = useState('')
  const [addressBusy, setAddressBusy] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
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
            <View style={styles.badge}>
              <FigmaAsset name="pin" size={28} />
            </View>
            <View style={ui.flex}>
              <Text style={ui.heading} numberOfLines={1}>
                {title}
              </Text>
              <Text style={ui.small} numberOfLines={1}>
                {record
                  ? `${record.kind === 'street' ? 'Street' : record.kind === 'garage' ? 'Garage' : 'Lot'}${record.fees ? ` · ${record.fees}` : ''}`
                  : 'Show saved area'}
              </Text>
            </View>
          </Pressable>
          {record ? (
            <IconButton
              icon="arrow"
              label={`Directions to ${title}`}
              onPress={() => onParkingDirections(record)}
              color={colors.surface}
              style={{ width: 44, height: 44, backgroundColor: colors.action }}
              disabled={record.sourceKind === 'sample'}
            />
          ) : null}
        </View>
        {managing ? (
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
        ) : null}
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
    <ParkingPage title="Saved places" subtitle="Your usual spots, one tap away">
      <View style={ui.row}>
        {(['home', 'work'] as const).map((kind) => (
          <ParkingTile
            key={kind}
            title={kind === 'home' ? 'Home' : 'Work'}
            subtitle={savedAddresses.addresses[kind]?.name ?? 'Set address'}
            icon={kind}
            disabled={!savedAddresses.ready}
            onPress={() => {
              const address = savedAddresses.addresses[kind]
              if (address) onCenter(address.coordinate)
              else {
                setAddressError(null)
                setAddressQuery('')
                setEditing(kind)
              }
            }}
          />
        ))}
      </View>
      <View style={ui.row}>
        <ParkingTile
          title="Your car"
          subtitle={
            local.state.parked ? 'Show saved location' : 'Save where you parked'
          }
          icon="car-white"
          disabled={disabled || locating}
          onPress={
            local.state.parked
              ? () => {
                  const parked = local.state.parked
                  if (parked) onCenter(parked.coordinate)
                }
              : onSaveParked
          }
        />
        <ParkingTile
          title="Add a place"
          subtitle="Find a spot to save"
          icon="plus-small"
          accent
          onPress={onAddPlace}
        />
      </View>
      {savedAddresses.error ? (
        <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
          {savedAddresses.error}
        </Text>
      ) : null}
      {savedAddresses.ready &&
      (savedAddresses.addresses.home || savedAddresses.addresses.work) ? (
        <View style={ui.row}>
          {(['home', 'work'] as const).map((kind) =>
            savedAddresses.addresses[kind] ? (
              <Button
                key={kind}
                secondary
                onPress={() => {
                  setAddressError(null)
                  setAddressQuery('')
                  setEditing(kind)
                }}
              >
                Edit {kind}
              </Button>
            ) : null,
          )}
        </View>
      ) : null}
      {editing ? (
        <ModalSheet
          title={`Set ${editing} address`}
          onClose={() => setEditing(null)}
        >
          <View style={{ padding: 16, flexShrink: 1 }}>
            <DestinationSearch
              layout="sheet"
              query={addressQuery}
              onQuery={setAddressQuery}
              center={local.state.parked?.coordinate ?? PILOT_CENTER}
              active={!addressBusy}
              onActive={(active) => {
                if (!active && !addressBusy) setEditing(null)
              }}
              onSaved={() => setEditing(null)}
              onLocate={() => {
                if (addressBusy) return
                setAddressBusy(true)
                setAddressError(null)
                void onLocateAddress()
                  .then(async (coordinate) => {
                    if (!coordinate) {
                      setAddressError(
                        'Your location couldn’t be found. Search for an address or enable location access.',
                      )
                      return
                    }
                    const ok = await savedAddresses.save(editing, {
                      id: `pinned-${editing}`,
                      name: 'Current location',
                      address: 'Pinned location',
                      coordinate,
                    })
                    if (ok) setEditing(null)
                  })
                  .catch(() =>
                    setAddressError(
                      'Your location couldn’t be found. Try searching for an address.',
                    ),
                  )
                  .finally(() => setAddressBusy(false))
              }}
              onSelect={(destination) => {
                setAddressBusy(true)
                void savedAddresses
                  .save(editing, destination)
                  .then((ok) => {
                    if (ok) setEditing(null)
                  })
                  .finally(() => setAddressBusy(false))
              }}
            />
            {addressBusy ? <Text style={ui.small}>Saving address…</Text> : null}
            {addressError ? (
              <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
                {addressError}
              </Text>
            ) : null}
            {savedAddresses.error ? (
              <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
                {savedAddresses.error}
              </Text>
            ) : null}
          </View>
        </ModalSheet>
      ) : null}
      {toast ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <UndoToast message={toast.message} onUndo={toast.undo} />
        </View>
      ) : null}
      <View style={styles.content}>
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
            Recent
          </Choice>
          {local.state[tab].length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: managing }}
              onPress={() => setManaging(!managing)}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                marginLeft: 'auto',
              }}
            >
              <Text style={[ui.small, ui.link]}>
                {managing ? 'Done' : 'Manage'}
              </Text>
            </Pressable>
          ) : null}
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
              provider. Opens walking directions in Google Maps.
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
              onPress={() => void local.clear()}
            >
              Clear saved data on this device
            </Button>
          </>
        ) : null}
      </View>
    </ParkingPage>
  )
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24, gap: 12 },
  savedRow: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.soft,
    gap: 8,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedAction: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 0,
    borderRadius: 12,
  },
  remove: {
    minHeight: 44,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 24,
  },
})
