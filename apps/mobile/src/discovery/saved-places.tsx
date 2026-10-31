import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'

import { resolveSaved } from './local-state'
import type { SavedRecord } from './local-state'
import { ModalSheet } from './sheets'
import { Button, Choice, colors, Notice, ui } from './ui'
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
  const disabled = local.status !== 'ready' || local.busy
  function row(saved: SavedRecord) {
    const record = resolveSaved(saved, records)
    return (
      <View
        key={saved.key}
        style={{
          gap: 8,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={ui.heading}>{record?.name ?? saved.name}</Text>
        <Button
          secondary
          onPress={() =>
            record ? onSelect(record) : onCenter(saved.coordinate)
          }
        >
          {record ? 'View parking' : 'Show saved area'}
        </Button>
        {!record ? (
          <Text style={ui.small}>
            This record isn’t in the loaded map data. It may be outside this
            area or no longer listed.
          </Text>
        ) : null}
        <Button
          secondary
          disabled={disabled}
          onPress={() => void local.remove(saved.key, tab)}
        >
          Remove
        </Button>
      </View>
    )
  }
  return (
    <ModalSheet title="Saved places" onClose={onClose}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: 22,
          gap: 14,
        }}
      >
        <Text style={ui.heading}>Where I parked</Text>
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
              onPress={() => void local.park(null)}
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
        <View style={ui.row}>
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
      </ScrollView>
    </ModalSheet>
  )
}
