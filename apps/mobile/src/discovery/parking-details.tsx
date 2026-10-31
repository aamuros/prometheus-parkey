import type { DiscoveryParking } from '@parkey/shared-types'
import { useMemo, useState } from 'react'
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import {
  anchor,
  dateLabel,
  directionsUrl,
  distanceLabel,
  kindLabels,
} from './model'
import type { ParkingReference } from './model'
import { ParkingGallery, ParkingImage } from './parking-photos'
import { parkingPhotos } from './photos'
import { ModalSheet } from './sheets'
import { Button, colors, Icon, IconButton, Notice, ui } from './ui'

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={ui.small}>{label}</Text>
      <Text style={ui.body}>{value?.trim() || 'Information unavailable'}</Text>
    </View>
  )
}

export function ParkingDetails({
  parking,
  reference,
  expanded,
  onExpand,
  onDirections,
  onClose,
  onReport,
}: {
  parking: DiscoveryParking
  reference: ParkingReference
  expanded: boolean
  onExpand: () => void
  onDirections: () => void
  onClose: () => void
  onReport: () => void
}) {
  const photos = useMemo(() => parkingPhotos(parking), [parking])
  const [directions, setDirections] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function open(url: string) {
    try {
      await Linking.openURL(url)
      setError(null)
      return true
    } catch {
      setError(
        'The link could not be opened. Try again or choose another navigation app.',
      )
      return false
    }
  }
  async function navigate(provider: 'apple' | 'google' | 'waze') {
    if (await open(directionsUrl(anchor(parking.geometry), provider)))
      setDirections(false)
  }
  const summary = (
    <View style={[{ gap: 6 }, !expanded && ui.flex]}>
      <Text style={ui.small}>
        {distanceLabel(
          reference.coordinate,
          anchor(parking.geometry),
          reference.label,
        )}
      </Text>
      <Text style={ui.body} numberOfLines={expanded ? undefined : 2}>
        Fees: {parking.fees?.trim() || 'Fees unknown'}
      </Text>
      <Text
        style={[
          ui.small,
          {
            color:
              parking.verification === 'verified'
                ? colors.action
                : colors.muted,
          },
        ]}
      >
        {parking.sourceKind === 'sample'
          ? 'Development sample'
          : parking.verification === 'verified'
            ? 'Source verified'
            : 'Not verified by Parkey'}
      </Text>
    </View>
  )
  return (
    <>
      <ScrollView style={ui.flex} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={ui.flex}>
            <Text style={ui.eyebrow}>{kindLabels[parking.kind]}</Text>
            <Text
              accessibilityRole="header"
              numberOfLines={2}
              style={ui.heading}
            >
              {parking.name}
            </Text>
          </View>
          <IconButton
            icon="close"
            label="Back to nearby parking"
            onPress={onClose}
          />
        </View>
        {expanded ? (
          <>
            <ParkingGallery photos={photos} />
            {summary}
          </>
        ) : (
          <View style={[ui.row, { alignItems: 'flex-start' }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                photos.length
                  ? 'View parking photos and full details'
                  : 'Expand full parking details. No photos yet'
              }
              onPress={onExpand}
            >
              <ParkingImage
                key={photos[0]?.thumbnailUrl ?? 'no-photo'}
                photo={photos[0]}
                thumbnail
              />
            </Pressable>
            {summary}
          </View>
        )}
        {!expanded ? (
          <Pressable
            accessibilityRole="button"
            onPress={onExpand}
            style={styles.link}
          >
            <Text style={[ui.small, ui.link]}>Photos & full details</Text>
            <Icon name="chevron" color={colors.brand} size={16} />
          </Pressable>
        ) : (
          <>
            <Notice>
              Check posted signs. No space availability or permission to park is
              guaranteed.
            </Notice>
            <Detail label="Recorded hours · local time" value={parking.hours} />
            <Detail label="Address" value={parking.address} />
            {parking.kind === 'street' ? (
              <Detail
                label="Street side · relative to line direction"
                value={parking.side === 'unknown' ? null : parking.side}
              />
            ) : null}
            <View style={{ gap: 8 }}>
              <Text style={ui.heading}>Restrictions & rules</Text>
              {parking.regulations.length ? (
                parking.regulations.map((rule, index) => (
                  <View key={index} style={{ gap: 3 }}>
                    <Text style={ui.body}>{rule.description}</Text>
                    <Text style={ui.small}>
                      {rule.sourceLabel} · {dateLabel(rule.observedAt)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={ui.body}>
                  Information unavailable. Check posted signs.
                </Text>
              )}
            </View>
            <View style={ui.divider} />
            <Detail label="Data source" value={parking.sourceLabel} />
            <Detail
              label="Source snapshot / observation"
              value={dateLabel(parking.sourceUpdatedAt)}
            />
            <Detail
              label="Last verification by Parkey"
              value={dateLabel(parking.verifiedAt)}
            />
            <Text style={ui.small}>{parking.license}</Text>
            {parking.sourceUrl ? (
              <Pressable
                accessibilityRole="link"
                style={styles.link}
                onPress={() => {
                  if (parking.sourceUrl) void open(parking.sourceUrl)
                }}
              >
                <Text style={[ui.body, ui.link]}>View original source ↗</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={parking.sourceKind === 'sample'}
              accessibilityState={{ disabled: parking.sourceKind === 'sample' }}
              onPress={() => setDirections(true)}
              style={styles.link}
            >
              <Text
                style={[
                  ui.body,
                  ui.link,
                  parking.sourceKind === 'sample' && { color: colors.disabled },
                ]}
              >
                Open another navigation app ↗
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onReport}
              style={styles.link}
            >
              <Text style={[ui.body, ui.link]}>
                Report incorrect information
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      <View style={styles.actions}>
        {error ? (
          <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
            {error}
          </Text>
        ) : null}
        <Button
          icon="arrow"
          disabled={parking.sourceKind === 'sample'}
          onPress={onDirections}
        >
          Get Directions
        </Button>
        <Text style={ui.small}>
          Routes share your start and destination with the routing provider.
        </Text>
      </View>
      {directions ? (
        <ModalSheet title="Get directions" onClose={() => setDirections(false)}>
          <View style={styles.content}>
            <Text style={ui.muted}>
              Confirm the entrance and posted restrictions when you arrive.
            </Text>
            {Platform.OS === 'ios' ? (
              <Button secondary onPress={() => void navigate('apple')}>
                Apple Maps ↗
              </Button>
            ) : null}
            <Button secondary onPress={() => void navigate('google')}>
              Google Maps ↗
            </Button>
            <Button secondary onPress={() => void navigate('waze')}>
              Waze ↗
            </Button>
            {error ? (
              <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
                {error}
              </Text>
            ) : null}
          </View>
        </ModalSheet>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 0,
  },
  content: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 6,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  link: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
  },
})
