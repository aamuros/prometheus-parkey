import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { customerColors as c, customerStyles as s } from './customer-styles'
import { CustomerBack, CustomerButton, CustomerChoice } from './customer-ui'
import { Icon } from './design-icons'
import {
  dateLabel,
  displayTime,
  locations,
  sampleAvailability,
} from '../demo/driver'
import type { DemoLocation, DriverState } from '../demo/driver'

type DiscoveryProps = {
  state: DriverState
  hours: number
  date: string
  arrival: string
  results: boolean
  onResults: (value: boolean) => void
  onReserve: (location: DemoLocation) => void
  onSchedule: () => void
}

const distances: Record<string, string> = {
  courtyard: '240 m',
  corner: '380 m',
  garden: '520 m',
}

function ParkingMap({
  options,
  selectedId,
  hours,
  expanded = false,
  onSelect,
}: {
  options: DemoLocation[]
  selectedId: string | undefined
  hours: number
  expanded?: boolean
  onSelect: (id: string) => void
}) {
  return (
    <View style={expanded ? s.resultsMapCanvas : s.map}>
      <View
        style={s.mapBlocks}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {[0, 1, 2].map((row) => (
          <View key={row} style={s.mapBlockRow}>
            {[0, 1, 2].map((column) => (
              <View
                key={column}
                style={[
                  s.mapBlock,
                  !expanded && row === 1 && column === 2 && s.mapPark,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View pointerEvents="none" style={s.destination}>
        <View style={s.destinationDot} />
      </View>
      {options.slice(0, 3).map((location, index) => (
        <Pressable
          key={location.id}
          accessibilityRole="button"
          accessibilityLabel={`${location.name}, ${location.hourlyRate * hours} pesos for ${hours} hours. Show parking results.`}
          accessibilityState={{ selected: location.id === selectedId }}
          onPress={() => onSelect(location.id)}
          style={({ pressed }) => [
            s.mapPin,
            index === 0 ? s.pinOne : index === 1 ? s.pinTwo : s.pinThree,
            expanded && s.pinDark,
            location.id === selectedId && s.pinSelected,
            pressed && s.pressed,
          ]}
        >
          <Text
            style={[
              s.pinText,
              (expanded || location.id === selectedId) && s.white,
            ]}
          >
            ₱{location.hourlyRate * hours}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

function ParkingCard({
  location,
  state,
  hours,
  selected,
  results,
  closest,
  onPress,
}: {
  location: DemoLocation
  state: DriverState
  hours: number
  selected: boolean
  results: boolean
  closest: boolean
  onPress: () => void
}) {
  const spaces = sampleAvailability(state, location)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${location.name}, ${location.walk}, ${spaces} sample spots left, ${location.hourlyRate * hours} pesos for ${hours} hours. ${results ? 'Select parking' : 'Reserve parking'}.`}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        selected && s.selectedCard,
        results && selected && s.resultSelected,
        pressed && s.pressed,
      ]}
    >
      <View style={s.flex}>
        <View style={s.row}>
          <Text style={s.lotName}>{location.name}</Text>
          {closest && !results && (
            <View style={s.closest}>
              <Text style={s.closestLabel}>Closest</Text>
            </View>
          )}
        </View>
        <Text style={s.small}>
          {location.walk} · {distances[location.id]}
        </Text>
        <Text
          style={[
            s.availability,
            results && s.availabilityBlue,
            spaces <= 2 && s.low,
          ]}
        >
          ●{' '}
          {spaces === 0
            ? 'Full'
            : spaces <= 2
              ? `Only ${spaces} left`
              : `${spaces} spots left`}
        </Text>
      </View>
      <View style={s.priceColumn}>
        <Text style={s.price}>₱{location.hourlyRate * hours}</Text>
        <Text style={s.small}>
          {results ? `total · ₱${location.hourlyRate}/hr` : `${hours} hrs`}
        </Text>
      </View>
      {!results && <Icon name="chevron" size={16} color="#94A3B8" />}
    </Pressable>
  )
}

export function Discovery({
  state,
  hours,
  date,
  arrival,
  results,
  onResults,
  onReserve,
  onSchedule,
}: DiscoveryProps) {
  const [query, setQuery] = useState('Poblacion, Makati')
  const [cheapest, setCheapest] = useState(false)
  const [selectedId, setSelectedId] = useState('courtyard')
  const filtered = locations
    .filter((location) =>
      `${location.name} ${location.address} Poblacion, Makati`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      cheapest
        ? a.hourlyRate - b.hourlyRate
        : locations.indexOf(a) - locations.indexOf(b),
    )
  const selected =
    filtered.find((location) => location.id === selectedId) ?? filtered[0]
  const day = date === '2026-10-27' ? 'Today' : dateLabel(date)
  function selectPin(id: string) {
    setSelectedId(id)
    onResults(true)
  }
  const cards = filtered.map((location) => (
    <ParkingCard
      key={location.id}
      location={location}
      state={state}
      hours={hours}
      selected={selected?.id === location.id}
      results={results}
      closest={location.id === locations[0]?.id}
      onPress={() =>
        results ? setSelectedId(location.id) : onReserve(location)
      }
    />
  ))
  const empty = (
    <View style={s.empty}>
      <Text style={s.heading}>No matching parking</Text>
      <Text style={s.meta}>Try another destination or parking name.</Text>
      <CustomerButton secondary onPress={() => setQuery('')}>
        Clear search
      </CustomerButton>
    </View>
  )
  if (results)
    return (
      <View style={s.resultsScreen}>
        <View style={s.resultsMap}>
          <ParkingMap
            options={filtered}
            selectedId={selected?.id}
            hours={hours}
            expanded
            onSelect={selectPin}
          />
        </View>
        <View style={s.resultsSearch}>
          <CustomerBack label="Back to Find" onPress={() => onResults(false)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit destination and parking time"
            onPress={() => onResults(false)}
            style={s.flex}
          >
            <Text style={s.lotName}>{query || 'All parking'}</Text>
            <Text style={s.small}>
              {day} {displayTime(arrival)} · {hours} hrs
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onSchedule}
            style={s.textButton}
          >
            <Text style={s.link}>Edit</Text>
          </Pressable>
        </View>
        <View style={s.resultsSheet}>
          <View style={s.handle} />
          <View style={s.between}>
            <Text accessibilityRole="header" style={s.heading}>
              {filtered.length} spots available
            </Text>
            <View style={s.sorts}>
              <CustomerChoice
                selected={!cheapest}
                onPress={() => setCheapest(false)}
              >
                Closest
              </CustomerChoice>
              <CustomerChoice
                selected={cheapest}
                onPress={() => setCheapest(true)}
              >
                Cheapest
              </CustomerChoice>
            </View>
          </View>
          <ScrollView style={s.flex} contentContainerStyle={s.resultsList}>
            {cards}
            {!filtered.length && empty}
          </ScrollView>
          {selected && (
            <CustomerButton
              disabled={!sampleAvailability(state, selected)}
              onPress={() => onReserve(selected)}
            >{`Select ${selected.name}`}</CustomerButton>
          )}
        </View>
      </View>
    )
  return (
    <ScrollView
      style={s.flex}
      contentContainerStyle={s.homeContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.brand}>
        <View style={s.brandIcon}>
          <Text style={s.brandP}>P</Text>
        </View>
        <Text style={s.brandName}>Parkey</Text>
      </View>
      <Text accessibilityRole="header" style={s.title}>
        Where are you parking?
      </Text>
      <View style={s.search}>
        <Icon name="search" color={c.blue} size={21} />
        <TextInput
          accessibilityLabel="Search destination or parking"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => onResults(true)}
          returnKeyType="search"
          placeholder="Where are you going?"
          placeholderTextColor={c.muted}
          style={s.searchInput}
        />
      </View>
      <View style={s.searchSettings}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit arrival time"
          onPress={onSchedule}
          style={({ pressed }) => [s.setting, pressed && s.pressed]}
        >
          <View>
            <Text style={s.settingLabel}>Arrive</Text>
            <Text style={s.settingValue}>
              {day} · {displayTime(arrival)}
            </Text>
          </View>
          <View style={s.down}>
            <Icon name="chevron" color={c.muted} size={16} />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit parking duration"
          onPress={onSchedule}
          style={({ pressed }) => [s.setting, pressed && s.pressed]}
        >
          <View>
            <Text style={s.settingLabel}>Duration</Text>
            <Text style={s.settingValue}>
              {hours} {hours === 1 ? 'hour' : 'hours'}
            </Text>
          </View>
          <View style={s.down}>
            <Icon name="chevron" color={c.muted} size={16} />
          </View>
        </Pressable>
      </View>
      <ParkingMap
        options={filtered}
        selectedId={selected?.id}
        hours={hours}
        onSelect={selectPin}
      />
      <View style={s.listHeading}>
        <Text accessibilityRole="header" style={s.heading}>
          {filtered.length} spots nearby
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show all parking results"
          onPress={() => onResults(true)}
          style={s.textButton}
        >
          <Text style={s.small}>Closest first</Text>
        </Pressable>
      </View>
      {cards}
      {!filtered.length && empty}
      <Text style={s.preview}>
        Demo · Fictional places, prices & availability
      </Text>
    </ScrollView>
  )
}
