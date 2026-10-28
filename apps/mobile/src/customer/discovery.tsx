import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import {
  AccessibilityInfo,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'

import { ParkingMap } from './map'
import { filterPlaces } from './preview'
import type { Filters, ParkingPlace } from './preview'
import {
  Artwork,
  Back,
  Button,
  Chip,
  Handle,
  ListRow,
  PreviewNote,
  RoundButton,
  Screen,
  Text,
  palette,
  ui,
  useCanvas,
} from './ui'

export function ParkingCard({
  place,
  onPress,
}: {
  place: ParkingPlace
  onPress?: () => void
}) {
  const content = (
    <>
      <View style={styles.thumbnail}>
        <Artwork name="iconParking" />
      </View>
      <View style={[ui.flex, { gap: 4 }]}>
        <Text style={ui.subheading}>{place.name}</Text>
        <Text style={ui.bodyMuted}>
          {place.minutes} min walk · {place.meters} m
        </Text>
        <View style={[styles.badge, place.spaces <= 2 && styles.lowBadge]}>
          <Text
            style={[
              ui.caption,
              { color: place.spaces <= 2 ? palette.amber : palette.green },
            ]}
          >
            {place.spaces <= 2
              ? `Only ${place.spaces} left`
              : `${place.spaces} spots left`}
          </Text>
        </View>
      </View>
      <View style={styles.price}>
        <Text style={styles.priceLabel}>₱{place.rate}</Text>
        <Text style={ui.caption}>per hour</Text>
      </View>
    </>
  )
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${place.minutes} minute walk, ${place.rate} pesos per hour. View sample parking details.`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && ui.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.card}>{content}</View>
  )
}

export function Home() {
  const { top, bottom, height } = useCanvas()
  const [query, setQuery] = useState('')
  const panelTop = Math.max(top + 250, (height * 420) / 844)
  function search(destination = query) {
    Keyboard.dismiss()
    router.navigate({
      pathname: '/search',
      params: { query: destination || 'Polaris St, Poblacion' },
    })
  }
  return (
    <Screen>
      <ParkingMap
        mode="home"
        onSelect={(id) =>
          router.navigate({ pathname: '/parking/[id]', params: { id } })
        }
      />
      <View style={[styles.locationPill, { top: top + 8 }]}>
        <Artwork name="iconPin" />
        <Text style={styles.locationLabel}>Poblacion, Makati</Text>
      </View>
      <View style={{ position: 'absolute', top: panelTop - 64, right: 24 }}>
        <RoundButton
          icon="iconLocate"
          label="Center sample map on Poblacion"
          onPress={() =>
            AccessibilityInfo.announceForAccessibility(
              'Sample map centered on Poblacion, Makati. Live location is not connected.',
            )
          }
        />
      </View>
      <View
        style={[
          ui.panel,
          { position: 'absolute', top: panelTop, left: 0, right: 0, bottom: 0 },
        ]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            ui.panelContent,
            { paddingBottom: bottom + 100 },
          ]}
        >
          <View>
            <Handle />
            <Text accessibilityRole="header" style={ui.title24}>
              Where to, Adrian?
            </Text>
          </View>
          <View style={styles.searchBar}>
            <Artwork name="iconSearch" />
            <TextInput
              accessibilityLabel="Search a destination"
              value={query}
              onChangeText={setQuery}
              placeholder="Search a destination"
              placeholderTextColor={palette.muted}
              returnKeyType="search"
              onSubmitEditing={() => search()}
              style={styles.searchInput}
            />
          </View>
          {query.trim() !== '' && (
            <Button onPress={() => search()}>Find parking</Button>
          )}
          <Text style={ui.subheading}>Recent</Text>
          <View>
            {[
              ['Polaris Street', 'Poblacion, Makati'],
              ['Kalayaan Avenue', 'Makati City'],
              ['P. Burgos Street', 'Poblacion, Makati'],
            ].map(([title, subtitle]) =>
              title && subtitle ? (
                <ListRow
                  key={title}
                  icon="iconClock"
                  title={title}
                  subtitle={subtitle}
                  onPress={() => search(title)}
                />
              ) : null,
            )}
          </View>
          <PreviewNote compact />
        </ScrollView>
      </View>
    </Screen>
  )
}

export function SearchResults() {
  const params = useLocalSearchParams<{ query?: string }>()
  const initialQuery =
    typeof params.query === 'string' ? params.query : 'Polaris St, Poblacion'
  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<Filters>({
    covered: true,
    ev: false,
    budget: false,
  })
  const [selected, setSelected] = useState('polaris')
  const { top, height, bottom } = useCanvas()
  const matches = filterPlaces(query, filters)
  const panelTop = Math.max(top + 190, (height * 324) / 844)
  function toggle(key: keyof Filters) {
    setFilters((current) => ({ ...current, [key]: !current[key] }))
  }
  function openPlace(id: string) {
    setSelected(id)
    router.navigate({ pathname: '/parking/[id]', params: { id } })
  }
  return (
    <Screen>
      <ParkingMap mode="results" selected={selected} onSelect={openPlace} />
      <View style={[styles.resultsHeader, { top: top + 8 }]}>
        <Back />
        <View style={styles.destinationPill}>
          <Artwork name="iconPin" />
          <TextInput
            accessibilityLabel="Destination or parking name"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            style={styles.destinationInput}
          />
          <Text style={[ui.caption, { color: palette.light }]}>
            Now · 3 hrs
          </Text>
        </View>
      </View>
      <View
        style={[
          ui.panel,
          { position: 'absolute', top: panelTop, bottom: 0, left: 0, right: 0 },
        ]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            ui.panelContent,
            { paddingBottom: bottom + 24, gap: 14 },
          ]}
        >
          <View>
            <Handle />
            <Text accessibilityRole="header" style={ui.heading}>
              {matches.length} spots near{' '}
              {query.toLowerCase().includes('kalayaan')
                ? 'Kalayaan Ave'
                : query.toLowerCase().includes('burgos')
                  ? 'Burgos St'
                  : 'Polaris St'}
            </Text>
            <Text style={ui.bodyMuted}>Sorted by distance</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ui.row}
          >
            <Chip selected={filters.covered} onPress={() => toggle('covered')}>
              Covered
            </Chip>
            <Chip selected={filters.ev} onPress={() => toggle('ev')}>
              EV charging
            </Chip>
            <Chip selected={filters.budget} onPress={() => toggle('budget')}>
              Under ₱100
            </Chip>
          </ScrollView>
          <View style={{ gap: 12 }}>
            {matches.map((place) => (
              <ParkingCard
                key={place.id}
                place={place}
                onPress={() => openPlace(place.id)}
              />
            ))}
          </View>
          {matches.length === 0 && (
            <View style={ui.column}>
              <Text style={ui.subheading}>No matching parking</Text>
              <Text style={ui.bodyMuted}>
                Try another destination or clear your filters.
              </Text>
              <Button
                secondary
                onPress={() => {
                  setQuery('Polaris St, Poblacion')
                  setFilters({ covered: false, ev: false, budget: false })
                }}
              >
                Clear search and filters
              </Button>
            </View>
          )}
          <PreviewNote compact />
        </ScrollView>
      </View>
    </Screen>
  )
}
const styles = StyleSheet.create({
  locationPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: palette.white,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0px 4px 16px rgba(0,0,0,0.16)',
  },
  locationLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: palette.ink,
  },
  searchBar: {
    backgroundColor: palette.secondary,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 20,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'InterMedium',
    fontSize: 16,
    color: palette.ink,
    paddingVertical: 16,
  },
  resultsHeader: {
    position: 'absolute',
    left: 24,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destinationPill: {
    flex: 1,
    backgroundColor: palette.white,
    minHeight: 44,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 16,
    boxShadow: '0px 4px 16px rgba(0,0,0,0.16)',
  },
  destinationInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'InterMedium',
    fontSize: 14,
    color: palette.ink,
    paddingVertical: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 20,
    backgroundColor: palette.white,
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: palette.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: palette.greenBg,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  lowBadge: { backgroundColor: palette.amberBg },
  price: { alignItems: 'flex-end' },
  priceLabel: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: palette.ink,
  },
})
