import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import type { ComponentRef } from 'react'
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import type { Coordinate } from '@parkey/shared-types'

import { config } from './config'
import { searchDestinations } from './data'
import type { Destination } from './data'
import { fonts } from './typography'
import { Button, colors, Icon, IconButton, UndoToast, ui } from './ui'
import { useSearchHistory } from './use-search-history'

export function DestinationSearch({
  query,
  onQuery,
  center,
  active,
  onSelect,
  onLocate,
  onActive,
  onSaved,
}: {
  query: string
  onQuery: (query: string) => void
  center: Coordinate
  active: boolean
  onSelect: (destination: Destination) => void
  onLocate: () => void
  onActive: (active: boolean) => void
  onSaved: () => void
}) {
  const { height } = useWindowDimensions()
  const compact = height < 700
  const [focused, setFocused] = useState(false)
  const [cleared, setCleared] = useState<Destination[] | null>(null)
  useEffect(() => {
    if (!cleared) return
    const timer = setTimeout(() => setCleared(null), 5000)
    return () => clearTimeout(timer)
  }, [cleared])
  const [results, setResults] = useState<Destination[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>(
    'idle',
  )
  const [notice, setNotice] = useState(false)
  const [cardTop, setCardTop] = useState(10)
  const [visibleBottom, setVisibleBottom] = useState<number | null>(null)
  const history = useSearchHistory()
  const { noteSearch } = history
  const container = useRef<ComponentRef<typeof View>>(null)
  const input = useRef<ComponentRef<typeof TextInput>>(null)
  const request = useRef<AbortController | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function cancel() {
    clearTimeout(debounce.current)
    request.current?.abort()
    request.current = null
  }

  function close() {
    cancel()
    onActive(false)
    input.current?.blur()
    Keyboard.dismiss()
  }

  const deactivate = useEffectEvent(() => {
    cancel()
    input.current?.blur()
    Keyboard.dismiss()
  })
  const escape = useEffectEvent((event: KeyboardEvent) => {
    if (active && event.key === 'Escape') close()
  })
  useEffect(() => {
    if (!active) deactivate()
  }, [active])
  useEffect(() => {
    if (Platform.OS !== 'web') return
    const listener = (event: KeyboardEvent) => escape(event)
    if (input.current instanceof HTMLElement)
      input.current.style.outlineStyle = 'none'
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Mobile browsers shrink the visual viewport when the keyboard opens.
      const viewport = window.visualViewport
      const resize = () =>
        setVisibleBottom(
          viewport ? viewport.height + viewport.offsetTop : window.innerHeight,
        )
      const frame = requestAnimationFrame(resize)
      viewport?.addEventListener('resize', resize)
      viewport?.addEventListener('scroll', resize)
      return () => {
        cancelAnimationFrame(frame)
        viewport?.removeEventListener('resize', resize)
        viewport?.removeEventListener('scroll', resize)
      }
    }
    const show = Keyboard.addListener('keyboardDidShow', (event) =>
      setVisibleBottom(event.endCoordinates.screenY),
    )
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setVisibleBottom(height),
    )
    return () => {
      show.remove()
      hide.remove()
    }
  }, [height])

  const search = useCallback(async () => {
    cancel()
    if (!active || query.trim().length < 3) return
    const controller = new AbortController()
    request.current = controller
    const timeout = setTimeout(() => controller.abort(), 12000)
    setStatus('loading')
    setResults([])
    void noteSearch().then((firstSearch) => {
      if (firstSearch && request.current === controller) setNotice(true)
    })
    try {
      const found = await searchDestinations(
        config.geocoder,
        query,
        center,
        controller.signal,
      )
      if (request.current !== controller || controller.signal.aborted) return
      setResults(found.slice(0, 6))
      setStatus(found.length ? 'idle' : 'empty')
    } catch {
      if (request.current === controller) setStatus('error')
    } finally {
      clearTimeout(timeout)
    }
  }, [active, query, center, noteSearch])

  useEffect(() => {
    if (active && query.trim().length >= 3)
      debounce.current = setTimeout(() => void search(), 300)
    return cancel
  }, [active, query, center, search])

  function select(destination: Destination) {
    cancel()
    input.current?.blur()
    Keyboard.dismiss()
    onSelect(destination)
    void history.remember(destination)
  }

  return (
    <View
      ref={container}
      testID="destination-search-card"
      onLayout={() =>
        container.current?.measureInWindow((_x, y) => setCardTop(y))
      }
      style={[
        styles.container,
        compact && styles.compactContainer,
        { maxHeight: Math.max(0, (visibleBottom ?? height) - cardTop - 12) },
        ui.shadow,
      ]}
    >
      <View style={[styles.header, compact && styles.compactHeader]}>
        <Text style={[styles.brand, compact && styles.compactBrand]}>
          parkey
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onSaved}
          style={({ pressed }) => [styles.savedAction, pressed && ui.pressed]}
        >
          <Text style={[ui.muted, ui.link]}>Saved places</Text>
        </Pressable>
      </View>
      <View style={[styles.bar, focused && styles.focusedBar]}>
        <Icon name="search" color={colors.ink} size={22} />
        <TextInput
          ref={input}
          testID="destination-query"
          accessibilityLabel="Where do you need parking?"
          placeholder="Where do you need parking?"
          placeholderTextColor={colors.muted}
          selectionColor={colors.action}
          maxLength={180}
          value={query}
          onFocus={() => {
            setFocused(true)
            if (!active) {
              setStatus('idle')
              setResults([])
              setNotice(false)
            }
            onActive(true)
          }}
          onBlur={() => setFocused(false)}
          onChangeText={(text) => {
            cancel()
            onQuery(text)
            setResults([])
            setStatus('idle')
            onActive(true)
          }}
          onSubmitEditing={() => void search()}
          submitBehavior="submit"
          returnKeyType="search"
          style={styles.input}
        />
        {query ? (
          <IconButton
            icon="close"
            label="Clear destination search"
            onPress={() => {
              cancel()
              onQuery('')
              setResults([])
              setStatus('idle')
              input.current?.focus()
              onActive(true)
            }}
          />
        ) : null}
      </View>
      {active ? (
        <ScrollView
          testID="destination-results"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          style={styles.results}
          contentContainerStyle={styles.resultsContent}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              cancel()
              input.current?.blur()
              Keyboard.dismiss()
              onLocate()
            }}
            style={({ pressed }) => [styles.result, pressed && ui.pressed]}
          >
            <View style={styles.resultIcon}>
              <Icon name="locate" color={colors.action} size={20} />
            </View>
            <Text style={ui.heading}>Current location</Text>
          </Pressable>

          {cleared ? (
            <UndoToast
              message="Recent searches cleared"
              onUndo={() => {
                void history.restore(cleared)
                setCleared(null)
              }}
            />
          ) : null}
          {!query.trim() ? (
            <>
              {history.recents.length ? (
                <View style={ui.row}>
                  <Text style={[ui.small, ui.flex]}>Recent searches</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear recent searches"
                    onPress={() => {
                      setCleared(history.recents)
                      void history.clear()
                    }}
                    style={styles.clearAction}
                  >
                    <Text style={[ui.small, ui.link]}>Clear</Text>
                  </Pressable>
                </View>
              ) : null}
              {history.recents.map((destination, index) => (
                <DestinationRow
                  key={`${destination.name}-${destination.coordinate.join(',')}`}
                  destination={destination}
                  testID={`destination-recent-${index}`}
                  recent
                  onPress={() => select(destination)}
                />
              ))}
            </>
          ) : (
            <>
              {status === 'loading' ? (
                <View
                  accessibilityLabel="Searching places"
                  accessibilityState={{ busy: true }}
                >
                  {[0, 1, 2].map((index) => (
                    <View key={index} style={styles.result}>
                      <View style={[styles.resultIcon, styles.skeleton]} />
                      <View style={[ui.flex, styles.skeletonText]}>
                        <View style={[styles.skeleton, styles.skeletonName]} />
                        <View style={[styles.skeleton, styles.skeletonArea]} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {status === 'error' ? (
                <View style={{ gap: 8 }}>
                  <Text
                    accessibilityRole="alert"
                    style={[ui.muted, ui.error, styles.message]}
                  >
                    Search couldn’t connect.
                  </Text>
                  <Button
                    secondary
                    onPress={() => {
                      cancel()
                      debounce.current = setTimeout(() => void search(), 0)
                    }}
                  >
                    Retry search
                  </Button>
                </View>
              ) : null}
              {status === 'empty' ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[ui.muted, styles.message]}
                >
                  No places found for '{query.trim()}'
                </Text>
              ) : null}
              {results.map((destination, index) => (
                <DestinationRow
                  key={`${destination.id}-${index}`}
                  testID={`destination-result-${index}`}
                  destination={destination}
                  onPress={() => select(destination)}
                />
              ))}
              {notice ? (
                <Text style={[ui.small, styles.message]}>
                  Search text and map area are sent to Photon. Details in
                  Privacy / About.
                </Text>
              ) : null}
            </>
          )}
          {history.error ? <Text style={ui.small}>{history.error}</Text> : null}
        </ScrollView>
      ) : null}
    </View>
  )
}

function DestinationRow({
  destination,
  testID,
  recent = false,
  onPress,
}: {
  destination: Destination
  testID: string
  recent?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.result, pressed && ui.pressed]}
    >
      <View style={styles.resultIcon}>
        <Icon
          name={recent ? 'clock' : 'pin'}
          color={colors.brandDeep}
          size={20}
        />
      </View>
      <View style={ui.flex}>
        <Text numberOfLines={1} style={styles.resultName}>
          {destination.name}
        </Text>
        <Text numberOfLines={1} style={ui.small}>
          {destination.address}
        </Text>
      </View>
      <Icon name="chevronRight" color={colors.muted} size={16} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    padding: 16,
  },
  compactContainer: { padding: 12 },
  compactHeader: { paddingBottom: 8 },
  compactBrand: { fontSize: 22, lineHeight: 28 },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  bar: {
    flexShrink: 0,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 2,
    gap: 12,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.soft,
  },
  focusedBar: { borderColor: colors.accent },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -1,
    color: colors.brand,
  },
  savedAction: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 24,
  },
  input: {
    fontFamily: fonts.regular,
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  results: { flexShrink: 1, minHeight: 0, maxHeight: 360, marginTop: 8 },
  resultsContent: { paddingBottom: 4 },
  result: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  resultName: { ...ui.heading, fontFamily: fonts.bold },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAction: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  message: { paddingVertical: 12 },
  skeleton: { backgroundColor: colors.border, borderRadius: 8 },
  skeletonText: { gap: 8 },
  skeletonName: { width: '65%', height: 16 },
  skeletonArea: { width: '90%', height: 12 },
})
