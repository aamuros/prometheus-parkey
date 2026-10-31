import type { ParkingContribution } from '@parkey/shared-types'
import { useState } from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'

import { hasDiscoveryBackend } from './config'
import { clearContributions, writeContributions } from './contributions'
import { dateLabel } from './model'
import { mapColors } from './palette'
import { ModalSheet } from './sheets'
import { Button, colors, Notice, ui } from './ui'

export function MapInformation({
  snapshotCount,
  samples,
  onSamples,
  drafts,
  setDrafts,
  storage,
  onStorageReady,
  onClose,
}: {
  snapshotCount: number
  samples: boolean
  onSamples: (value: boolean) => void
  drafts: ParkingContribution[]
  setDrafts: (drafts: ParkingContribution[]) => void
  storage: 'loading' | 'ready' | 'error'
  onStorageReady: () => void
  onClose: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function remove(id: string) {
    if (busy) return
    setBusy(true)
    try {
      const next = drafts.filter((draft) => draft.id !== id)
      await writeContributions(next)
      setDrafts(next)
      setError(null)
    } catch {
      setError('The preview could not be deleted. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalSheet title="Map information" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={ui.title}>Find a place. Check the signs.</Text>
        <Text style={ui.body}>
          Parkey maps parking facilities and street segments. We don’t track
          vacancies or guarantee parking is permitted.
        </Text>
        <View style={[ui.row, { flexWrap: 'wrap' }]}>
          <View style={styles.legendPoint}>
            <Text style={{ color: mapColors.facilityLabel, fontWeight: '700' }}>
              P
            </Text>
          </View>
          <Text style={ui.body}>Lot · G for garage</Text>
          <View style={styles.legendLine} />
          <Text style={ui.body}>Street</Text>
        </View>
        <Text style={ui.heading}>Parking data</Text>
        <Text style={ui.muted}>
          {hasDiscoveryBackend
            ? 'Parkey records load for the visible map area.'
            : 'Parkey’s database is not configured. Only the bundled OSM pilot snapshot, if available, is shown.'}{' '}
          {snapshotCount} OSM pilot records bundled. Source dates appear in each
          record.
        </Text>
        <Text style={ui.small}>
          Street parking appears only where a source identifies it. Many streets
          have no recorded information. Left/right is relative to the line’s
          drawing direction, not your travel direction.
        </Text>
        <View style={ui.divider} />
        <Text style={ui.heading}>Map & search credits</Text>
        <Text style={ui.muted}>
          Basemap: OpenFreeMap / OpenMapTiles. Map, parking, and search data: ©
          OpenStreetMap contributors (ODbL). Renderer: MapLibre. Destination
          search: Photon. Routing: an OSRM-compatible service.
        </Text>
        <Text style={ui.muted}>
          Requesting directions shares your start and destination with the
          routing provider. Travel estimates exclude live traffic. Recalculate
          manually when your starting point changes.
        </Text>
        {[
          [
            'OpenStreetMap copyright & ODbL',
            'https://www.openstreetmap.org/copyright',
          ],
          ['OpenFreeMap', 'https://openfreemap.org'],
          ['OpenMapTiles', 'https://openmaptiles.org'],
          [
            'OSRM demo usage policy',
            'https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server',
          ],
          [
            'Fix the OpenStreetMap data',
            'https://www.openstreetmap.org/fixthemap',
          ],
          ['Photon search service', 'https://photon.komoot.io'],
        ].map(([label, url]) => (
          <Pressable
            accessibilityRole="link"
            key={url}
            style={({ pressed }) => [styles.link, pressed && ui.pressed]}
            onPress={() => {
              if (url)
                void Linking.openURL(url).catch(() =>
                  setError('The link could not be opened.'),
                )
            }}
          >
            <Text style={[ui.body, ui.link]}>{label} ↗</Text>
          </Pressable>
        ))}
        <View style={ui.divider} />
        <View style={ui.row}>
          <View style={ui.flex}>
            <Text style={ui.heading}>Show development samples</Text>
            <Text style={ui.small}>
              Replaces records with fictional examples. Directions are disabled.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Show development sample parking"
            value={samples}
            onValueChange={onSamples}
            trackColor={{ false: colors.border, true: colors.action }}
            thumbColor={colors.surface}
          />
        </View>
        <Text style={ui.heading}>Local previews · {drafts.length}</Text>
        <Notice>
          These previews are stored on this device only. They are not submitted,
          publicly visible, or automatically uploaded.
        </Notice>
        {storage === 'error' ? (
          <>
            <Text style={ui.muted}>
              Saved previews couldn’t be read. Clear local previews to start
              again.
            </Text>
            <Button
              secondary
              onPress={() => {
                void clearContributions()
                  .then(() => {
                    setDrafts([])
                    onStorageReady()
                  })
                  .catch(() => setError('Local storage could not be cleared.'))
              }}
            >
              Clear local previews
            </Button>
          </>
        ) : null}
        {drafts.map((draft) => (
          <View key={draft.id} style={{ gap: 6 }}>
            <Text style={ui.heading}>{draft.name}</Text>
            <Text style={ui.small}>
              {draft.intent === 'add' ? 'Missing parking' : 'Correction'} ·
              Local pending review · {dateLabel(draft.createdAt)}
            </Text>
            <Text style={ui.body}>
              {draft.restrictions || 'No restrictions supplied'}
            </Text>
            <Text style={ui.small}>
              Hours: {draft.hours || 'Unknown'} · Fees:{' '}
              {draft.fees || 'Unknown'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete local preview ${draft.name}`}
              disabled={busy}
              onPress={() => void remove(draft.id)}
              style={({ pressed }) => [styles.link, pressed && ui.pressed]}
            >
              <Text
                style={[ui.body, ui.link, busy && { color: colors.disabled }]}
              >
                Delete preview
              </Text>
            </Pressable>
          </View>
        ))}
        {error ? (
          <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </ModalSheet>
  )
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 22, gap: 16 },
  link: { minHeight: 44, justifyContent: 'center', borderRadius: 12 },
  legendPoint: {
    height: 26,
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: mapColors.facility,
    boxShadow: `inset 0px 0px 0px 2px ${mapColors.facilityOutline}`,
  },
  legendLine: {
    width: 24,
    height: 5,
    backgroundColor: mapColors.street,
    borderRadius: 3,
  },
})
