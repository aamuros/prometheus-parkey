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

import { clearContributions, writeContributions } from './contributions'
import { dateLabel } from './model'
import { developmentSamplesEnabled } from './presentation'
import { diagnosticStatus } from './telemetry'
import { mapColors } from './palette'
import { ModalSheet } from './sheets'
import { Button, colors, Notice, ui } from './ui'

export function MapInformation({
  samples,
  onSamples,
  drafts,
  setDrafts,
  storage,
  onStorageReady,
  onClose,
}: {
  samples: boolean
  onSamples: (value: boolean) => void
  drafts: ParkingContribution[]
  setDrafts: (drafts: ParkingContribution[]) => void
  storage: 'loading' | 'ready' | 'error'
  onStorageReady: () => void
  onClose: () => void
}) {
  const development = developmentSamplesEnabled(true, process.env.NODE_ENV)
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
      setError('The draft could not be deleted. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalSheet title="Map information" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={ui.title}>Parking information</Text>
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
          Coverage varies by area. Each parking location includes its source and
          last update date. Check posted signs when you arrive.
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
          ...(development
            ? [
                [
                  'Routing demo usage policy',
                  'https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server',
                ],
              ]
            : []),
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
        {development ? (
          <>
            <View style={ui.row}>
              <View style={ui.flex}>
                <Text style={ui.heading}>Show development samples</Text>
                <Text style={ui.small}>
                  Replaces records with fictional examples. Directions are
                  disabled.
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
          </>
        ) : null}
        <Text style={ui.heading}>Privacy</Text>
        <Text style={ui.body}>
          Saved places and drafts stay on this device. No account is required.
        </Text>
        <Text style={ui.small}>
          Search shares your search text and map area with the search provider.
          Directions share your start and destination with the routing provider,
          only when you request them.
        </Text>
        <Text style={ui.small}>
          {diagnosticStatus.analytics
            ? 'Usage reporting is enabled. Events contain app actions, without coordinates, search text, or user identifiers.'
            : 'Usage reporting is off.'}
        </Text>
        <Text style={ui.small}>
          {diagnosticStatus.crashes
            ? 'Error reporting is enabled. Reports omit entered text and location.'
            : 'Error reporting is off.'}
        </Text>
        {diagnosticStatus.analytics || diagnosticStatus.crashes ? (
          <Text style={ui.small}>
            Reporting services receive connection information such as your IP
            address.
          </Text>
        ) : null}
        <View style={ui.divider} />
        <Text style={ui.heading}>Drafts on this device · {drafts.length}</Text>
        <Notice>
          These drafts are stored on this device only. They are not submitted,
          shared with Parkey, or automatically uploaded.
        </Notice>
        {storage === 'error' ? (
          <>
            <Text style={ui.muted}>
              Saved drafts couldn’t be read. Clear drafts on this device to
              start again.
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
              Clear device drafts
            </Button>
          </>
        ) : null}
        {drafts.map((draft) => (
          <View key={draft.id} style={{ gap: 6 }}>
            <Text style={ui.heading}>{draft.name}</Text>
            <Text style={ui.small}>
              {draft.intent === 'add' ? 'Missing parking' : 'Correction'} ·
              Saved on this device · {dateLabel(draft.createdAt)}
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
              accessibilityLabel={`Delete device draft ${draft.name}`}
              disabled={busy}
              onPress={() => void remove(draft.id)}
              style={({ pressed }) => [styles.link, pressed && ui.pressed]}
            >
              <Text
                style={[ui.body, ui.link, busy && { color: colors.disabled }]}
              >
                Delete draft
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
