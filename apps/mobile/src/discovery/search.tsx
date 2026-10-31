import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { Coordinate } from '@parkey/shared-types'

import { config } from './config'
import { searchDestinations } from './data'
import type { Destination } from './data'
import { colors, Icon, IconButton, ui } from './ui'

export function DestinationSearch({
  destinationName,
  center,
  onSelect,
  onActive,
}: {
  destinationName: string | null
  center: Coordinate
  onSelect: (destination: Destination) => void
  onActive: (active: boolean) => void
}) {
  const [query, setQuery] = useState(destinationName ?? '')
  const [active, setActive] = useState(false)
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<Destination[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>(
    'idle',
  )
  const request = useRef<AbortController | null>(null)
  const lastRequest = useRef(0)
  useEffect(() => () => request.current?.abort(), [])

  function close() {
    request.current?.abort()
    request.current = null
    setStatus('idle')
    setActive(false)
    onActive(false)
    Keyboard.dismiss()
  }
  async function search() {
    if (query.trim().length < 3 || Date.now() - lastRequest.current < 1000)
      return
    lastRequest.current = Date.now()
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const timeout = setTimeout(() => controller.abort(), 12000)
    setStatus('loading')
    setResults([])
    Keyboard.dismiss()
    try {
      const found = await searchDestinations(
        config.geocoder,
        query,
        center,
        controller.signal,
      )
      if (request.current !== controller) return
      setResults(found)
      setStatus(found.length ? 'idle' : 'empty')
    } catch {
      if (request.current === controller) setStatus('error')
    } finally {
      clearTimeout(timeout)
    }
  }

  return (
    <View style={[styles.container, ui.shadow, focused && ui.focused]}>
      <View style={styles.bar}>
        <Icon name="search" color={colors.brandDeep} size={21} />
        <TextInput
          accessibilityLabel="Where do you need parking?"
          placeholder="Where do you need parking?"
          placeholderTextColor={colors.muted}
          selectionColor={colors.action}
          maxLength={180}
          value={query}
          onFocus={() => {
            setFocused(true)
            setActive(true)
            onActive(true)
          }}
          onBlur={() => setFocused(false)}
          onChangeText={(text) => {
            request.current?.abort()
            request.current = null
            setQuery(text)
            setResults([])
            setStatus('idle')
          }}
          onSubmitEditing={() => void search()}
          returnKeyType="search"
          style={styles.input}
        />
        {active ? (
          <IconButton
            icon="close"
            label="Close destination search"
            onPress={close}
          />
        ) : null}
      </View>
      {active ? (
        <View style={styles.results}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={ui.small}>Search addresses & landmarks</Text>
            <Pressable
              accessibilityRole="button"
              disabled={query.trim().length < 3 || status === 'loading'}
              onPress={() => void search()}
              style={({ pressed }) => [
                styles.searchAction,
                pressed && ui.pressed,
              ]}
            >
              {status === 'loading' ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text
                  style={[
                    ui.heading,
                    ui.link,
                    query.trim().length < 3 && { color: colors.disabled },
                  ]}
                >
                  Search
                </Text>
              )}
            </Pressable>
          </View>
          {status === 'error' ? (
            <Text accessibilityRole="alert" style={[ui.muted, ui.error]}>
              Search couldn’t connect. Try Search again, or close to explore the
              map.
            </Text>
          ) : null}
          {status === 'empty' ? (
            <Text style={ui.muted}>
              No destinations found. Try a street name and city.
            </Text>
          ) : null}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 250 }}
          >
            {results.map((destination) => (
              <Pressable
                accessibilityRole="button"
                key={destination.id}
                onPress={() => {
                  setQuery(destination.name)
                  close()
                  onSelect(destination)
                }}
                style={({ pressed }) => [styles.result, pressed && ui.pressed]}
              >
                <Icon name="pin" color={colors.brandDeep} size={19} />
                <View style={ui.flex}>
                  <Text style={ui.heading}>{destination.name}</Text>
                  <Text style={ui.small}>{destination.address}</Text>
                </View>
                <Icon name="arrow" color={colors.action} size={18} />
              </Pressable>
            ))}
          </ScrollView>
          {status === 'idle' && results.length === 0 ? (
            <Text style={ui.small}>
              Enter at least 3 characters, then tap Search.{'\n'}Search text is
              sent to the configured Photon provider.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  bar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 5,
    gap: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 16,
    fontSize: 15,
    color: colors.ink,
  },
  results: { paddingHorizontal: 18, paddingBottom: 18, gap: 8 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  searchAction: {
    borderRadius: 12,
    minHeight: 44,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
