import type {
  Coordinate,
  DiscoveryParking,
  ParkingContribution,
  ParkingKind,
} from '@parkey/shared-types'
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ContributionForm } from './contribution-form'
import { hasDiscoveryBackend } from './config'
import { readContributions, writeContributions } from './contributions'
import type { Destination } from './data'
import { DiscoverySheet, MapAttribution } from './discovery-sheet'
import { partitionParking } from './filters'
import type { DiscoveryFilter, FeeFilter } from './filters'
import { MapInformation } from './information'
import { recordKey } from './local-state'
import { SavedPlaces } from './saved-places'
import { useLocalState } from './use-local-state'
import { track } from './telemetry'
import {
  anchor,
  inPilotCoverage,
  inViewport,
  isCoordinate,
  kindLabels,
  PILOT_CENTER,
  PILOT_VIEWPORT,
  parkingReference,
  rankParking,
  validateContribution,
} from './model'
import type { Viewport } from './model'
import ParkingMap from './parking-map'
import { ParkingDetails } from './parking-details'
import { ParkingRow } from './parking-row'
import { ChipFade } from './chip-fade'
import {
  developmentSamplesEnabled,
  millisecondsToNextMinute,
  parkingTitle,
} from './presentation'
import { RouteDetails } from './route-details'
import { sampleParking } from './sample-data'
import { DestinationSearch } from './search'
import {
  discoveryCameraPadding,
  initialSheetState,
  sheetReducer,
} from './sheet-state'
import type { SheetPosition } from './sheet-state'
import {
  Button,
  Choice,
  colors,
  detailsPeekHeight,
  Icon,
  IconButton,
  Notice,
  ui,
} from './ui'
import { useLocation } from './use-location'
import { useParking } from './use-parking'
import { useRoute } from './use-route'

const EMPTY_POINTS: Coordinate[] = []

export default function Explore() {
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()
  const [viewport, setViewport] = useState(PILOT_VIEWPORT)
  const [target, setTarget] = useState({
    coordinate: PILOT_CENTER,
    revision: 0,
  })
  const [filter, setFilter] = useState<DiscoveryFilter>('all')
  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all')
  const [now, setNow] = useState(() => new Date())
  const [sheet, dispatchSheet] = useReducer(sheetReducer, initialSheetState)
  const selected = sheet.parking
  const setSelected = useCallback((record: DiscoveryParking | null) => {
    dispatchSheet(
      record ? { type: 'select', parking: record } : { type: 'browse' },
    )
  }, [])
  const changeSheetPosition = useCallback((position: SheetPosition) => {
    dispatchSheet({ type: 'snap', position })
  }, [])
  const [sheetHeight, setSheetHeight] = useState(168 + insets.bottom)
  const [drawingPanelHeight, setDrawingPanelHeight] = useState(0)
  const [topOverlayHeight, setTopOverlayHeight] = useState(0)
  const [chipsAtEnd, setChipsAtEnd] = useState(false)
  const [routeTarget, setRouteTarget] = useState<{
    name: string
    coordinate: Coordinate
    parking: DiscoveryParking | null
  } | null>(null)
  const [routeHeight, setRouteHeight] = useState(detailsPeekHeight)
  const [destination, setDestination] = useState<Destination | null>(null)
  const [searchActive, setSearchActive] = useState(false)
  const [panel, setPanel] = useState<'info' | 'saved' | null>(null)
  const [samplesRequested, setSamples] = useState(false)
  const samples = developmentSamplesEnabled(
    samplesRequested,
    process.env.NODE_ENV,
  )
  const [revision, setRevision] = useState(0)
  const [mapRevision, setMapRevision] = useState(0)
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [drawing, setDrawing] = useState(false)
  const [kind, setKind] = useState<ParkingKind>('lot')
  const [points, setPoints] = useState<Coordinate[]>([])
  const [form, setForm] = useState<ParkingContribution | null>(null)
  const [adjusted, setAdjusted] = useState<ParkingContribution | null>(null)
  const [drafts, setDrafts] = useState<ParkingContribution[]>([])
  const [storage, setStorage] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const saving = useRef(false)
  const savingFavorite = useRef(false)
  const location = useLocation()
  const local = useLocalState()
  const [saveLocationError, setSaveLocationError] = useState<string | null>(
    null,
  )
  const { load: loadRoute, clear: clearRoute, ...routeState } = useRoute()
  const parking = useParking(viewport, revision)
  const records = useMemo(
    () =>
      samples
        ? sampleParking.filter((item) => inViewport(item.geometry, viewport))
        : parking.records,
    [samples, viewport, parking.records],
  )
  const partitions = useMemo(
    () => partitionParking(records, filter, feeFilter),
    [records, filter, feeFilter],
  )
  const visible = useMemo(
    () => [...partitions.matched, ...partitions.unknown],
    [partitions],
  )
  const reference = useMemo(
    () =>
      parkingReference(
        destination?.coordinate ?? null,
        location.point,
        viewport,
      ),
    [destination, location.point, viewport],
  )
  const ranked = useMemo(
    () => [
      ...rankParking(partitions.matched, reference.coordinate),
      ...rankParking(partitions.unknown, reference.coordinate),
    ],
    [partitions, reference],
  )
  const outsidePilot =
    !samples && !hasDiscoveryBackend && !inPilotCoverage(viewport)
  const filteredOut = parking.canQuery && records.length > 0 && !visible.length
  const resultsTitle = destination
    ? `Parking near ${destination.name}`
    : 'Parking in this area'
  const parkingError =
    'Couldn’t update parking information. Saved map data may still be shown. Check the source dates and try again.'

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function refresh() {
      clearTimeout(timer)
      setNow(new Date())
      timer = setTimeout(refresh, millisecondsToNextMinute(Date.now()))
    }
    timer = setTimeout(refresh, millisecondsToNextMinute(Date.now()))
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
      else clearTimeout(timer)
    })
    return () => {
      clearTimeout(timer)
      listener.remove()
    }
  }, [])

  useEffect(() => {
    let active = true
    void readContributions()
      .then((saved) => {
        if (active) {
          setDrafts(saved)
          setStorage('ready')
        }
      })
      .catch(() => {
        if (active) setStorage('error')
      })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    if (mapStatus !== 'loading') return
    const timeout = setTimeout(() => setMapStatus('error'), 20000)
    return () => clearTimeout(timeout)
  }, [mapStatus, mapRevision])
  useEffect(() => {
    if (Platform.OS === 'web') return
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drawing) {
        setDrawing(false)
        setPoints([])
        setAdjusted(null)
        return true
      }
      if (selected) {
        setSelected(null)
        return true
      }
      if (routeTarget) {
        clearRoute()
        setRouteTarget(null)
        return true
      }
      if (sheet.position !== 'compact') {
        changeSheetPosition('compact')
        return true
      }
      return false
    })
    return () => listener.remove()
  }, [
    drawing,
    selected,
    routeTarget,
    clearRoute,
    sheet.position,
    changeSheetPosition,
    setSelected,
  ])
  const updateViewport = useCallback((next: Viewport) => {
    setViewport((current) =>
      current.west === next.west &&
      current.south === next.south &&
      current.east === next.east &&
      current.north === next.north &&
      current.zoom === next.zoom
        ? current
        : next,
    )
  }, [])

  function center(coordinate: Coordinate) {
    setTarget((current) => ({ coordinate, revision: current.revision + 1 }))
  }
  function startDirections(record: DiscoveryParking) {
    if (record.sourceKind === 'sample') return
    track({
      name: 'directions_tapped',
      target_type: 'parking',
      navigation_provider: 'in_app',
    })
    setRouteTarget({
      name: parkingTitle(record),
      coordinate: anchor(record.geometry),
      parking: record,
    })
    setSelected(null)
    setPanel(null)
    void loadRoute(
      anchor(record.geometry),
      async () => location.point ?? location.locate(),
    )
  }
  function viewed(record: DiscoveryParking) {
    void local.viewed(record)
    if (record.sourceKind !== 'sample')
      track({
        name: 'parking_viewed',
        parking_kind: record.kind,
        source_kind: record.sourceKind,
        verification: record.verification,
      })
  }
  function favorite(record: DiscoveryParking) {
    if (savingFavorite.current) return
    savingFavorite.current = true
    const adding = !local.state.favorites.some(
      (item) => item.key === recordKey(record),
    )
    void local
      .favorite(record)
      .then((saved) => {
        if (saved && adding && record.sourceKind !== 'sample')
          track({
            name: 'favorite_added',
            parking_kind: record.kind,
            source_kind: record.sourceKind,
          })
      })
      .finally(() => {
        savingFavorite.current = false
      })
  }
  function select(id: string) {
    const record = visible.find((item) => item.id === id)
    if (!record) return
    clearRoute()
    setRouteTarget(null)
    setSelected(record)
    viewed(record)
    setPanel(null)
    center(anchor(record.geometry))
  }
  function changeFilter(next: DiscoveryFilter) {
    track({ name: 'filter_used', filter: 'kind', value: next })
    clearRoute()
    setRouteTarget(null)
    setFilter(next)
    setSelected(null)
  }
  function startContribution(record?: DiscoveryParking) {
    clearRoute()
    setRouteTarget(null)
    setSelected(null)
    setPanel(null)
    if (record) {
      setForm({
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        intent: 'correction',
        targetId: record.id,
        kind: record.kind,
        geometry: record.geometry,
        side: record.side,
        name: record.name,
        restrictions: '',
        hours: '',
        fees: '',
        photoUri: null,
        createdAt: new Date().toISOString(),
        status: 'local_pending_review',
      })
    } else {
      setDrawing(true)
      setKind('lot')
      setPoints([])
      setAdjusted(null)
    }
  }
  function continueContribution() {
    const point = points[0]
    if (!point || (kind === 'street' && points.length < 2)) return
    const geometry =
      kind === 'street'
        ? { type: 'LineString' as const, coordinates: points }
        : { type: 'Point' as const, coordinates: point }
    setForm(
      adjusted
        ? {
            ...adjusted,
            kind,
            geometry,
            side: kind === 'street' ? adjusted.side : 'unknown',
          }
        : {
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            intent: 'add',
            targetId: null,
            kind,
            geometry,
            side: 'unknown',
            name: '',
            restrictions: '',
            hours: '',
            fees: '',
            photoUri: null,
            createdAt: new Date().toISOString(),
            status: 'local_pending_review',
          },
    )
    setDrawing(false)
  }
  async function save(draft: ParkingContribution) {
    if (storage !== 'ready')
      return 'Your draft could not be saved. Open Map information to try loading or clear drafts on this device.'
    if (saving.current) return 'A draft is already being saved.'
    const normalized = {
      ...draft,
      name: draft.name.trim(),
      restrictions: draft.restrictions.trim(),
      hours: draft.hours.trim(),
      fees: draft.fees.trim(),
      createdAt: new Date().toISOString(),
    }
    const issue = validateContribution(normalized, drafts, Date.now())
    if (issue) return issue
    saving.current = true
    try {
      const next = [normalized, ...drafts]
      await writeContributions(next)
      setDrafts(next)
      track({
        name: 'contribution_saved',
        intent: normalized.intent,
        parking_kind: normalized.kind,
        storage: 'local',
      })
      return null
    } catch {
      return 'This draft could not be saved on your device. Free some storage and try again.'
    } finally {
      saving.current = false
    }
  }
  const locationMessage =
    location.status === 'denied'
      ? 'Location is off. Search or explore manually, or enable Parkey in device settings.'
      : location.status === 'error'
        ? 'Couldn’t get your location. Check location services and try again.'
        : null

  const discoveryVisible =
    !searchActive && !drawing && !routeTarget && !form && panel === null
  const controlsVisible = screenHeight - sheetHeight > topOverlayHeight + 116
  const cameraBottom = routeTarget
    ? routeHeight
    : drawing
      ? drawingPanelHeight
      : discoveryVisible
        ? sheetHeight
        : 0
  const cameraPadding = discoveryCameraPadding(
    screenHeight,
    topOverlayHeight,
    cameraBottom + (!discoveryVisible ? 48 : 0),
  )
  function centerOnMyLocation() {
    void location.locate().then((point) => {
      if (point) {
        setSelected(null)
        setDestination(null)
        center(point)
      }
    })
  }
  const busy =
    location.status === 'locating' ||
    mapStatus === 'loading' ||
    (!samples && parking.status === 'loading')
  const resultsSummary = locationMessage
    ? `Location unavailable · ${visible.length} mapped locations`
    : location.status === 'locating'
      ? 'Finding your location…'
      : mapStatus === 'loading'
        ? 'Loading map…'
        : parking.status === 'loading' && !samples
          ? 'Updating parking…'
          : feeFilter === 'applies'
            ? `${partitions.matched.length} fee applies · ${partitions.unknown.length} fees unknown · Both shown on map`
            : `${visible.length} mapped ${visible.length === 1 ? 'location' : 'locations'} · Availability not tracked`

  return (
    <View
      testID={mapStatus === 'ready' ? 'discovery-map-ready' : 'discovery-map'}
      style={styles.screen}
    >
      {topOverlayHeight > 0 ? (
        <ParkingMap
          key={mapRevision}
          records={visible}
          selectedId={routeTarget?.parking?.id ?? selected?.id ?? null}
          route={routeState.route}
          target={target}
          cameraPadding={cameraPadding}
          parkedLocation={local.state.parked?.coordinate ?? null}
          userLocation={location.point}
          destination={
            routeTarget
              ? routeTarget.coordinate
              : (destination?.coordinate ?? null)
          }
          draftPoints={drawing ? points : EMPTY_POINTS}
          drawing={drawing}
          onSelect={select}
          onMapPress={(point) => {
            if (drawing && isCoordinate(point))
              setPoints((current) =>
                kind === 'street' ? [...current, point].slice(0, 12) : [point],
              )
            else setSelected(null)
          }}
          onViewport={updateViewport}
          onStatus={setMapStatus}
        />
      ) : null}

      <View
        pointerEvents="box-none"
        onLayout={(event) =>
          setTopOverlayHeight(event.nativeEvent.layout.height)
        }
        style={[styles.top, { paddingTop: insets.top + 10 }]}
      >
        {sheet.position === 'expanded' && discoveryVisible ? null : drawing ? (
          <View style={[styles.drawHeader, ui.shadow]}>
            <View style={ui.flex}>
              <Text style={ui.heading}>Mark the parking location</Text>
              <Text style={ui.small}>
                {kind === 'street'
                  ? 'Tap along the street, in order. Up to 12 points.'
                  : 'Tap the map to place a pin.'}
              </Text>
            </View>
            <IconButton
              icon="close"
              label="Cancel adding parking"
              onPress={() => {
                setDrawing(false)
                setPoints([])
                setAdjusted(null)
              }}
            />
          </View>
        ) : (
          <DestinationSearch
            key={destination?.id ?? 'browse'}
            destinationName={destination?.name ?? null}
            center={target.coordinate}
            onActive={(active) => {
              setSearchActive(active)
              if (active) {
                setSelected(null)
                clearRoute()
                setRouteTarget(null)
              }
            }}
            onSelect={(found) => {
              setDestination(found)
              setSelected(null)
              center(found.coordinate)
              changeSheetPosition('medium')
            }}
          />
        )}
        {!searchActive &&
        !drawing &&
        !selected &&
        !routeTarget &&
        sheet.position !== 'expanded' ? (
          <View>
            <ScrollView
              horizontal
              onContentSizeChange={() => setChipsAtEnd(false)}
              onScroll={({ nativeEvent }) =>
                setChipsAtEnd(
                  nativeEvent.contentOffset.x +
                    nativeEvent.layoutMeasurement.width >=
                    nativeEvent.contentSize.width - 2,
                )
              }
              scrollEventThrottle={32}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 7, paddingBottom: 4 }}
            >
              <Choice
                selected={filter === 'all'}
                onPress={() => {
                  changeFilter('all')
                  setFeeFilter('all')
                }}
              >
                All Parking
              </Choice>
              <Choice
                selected={filter === 'street'}
                onPress={() => changeFilter('street')}
              >
                Street Parking
              </Choice>
              <Choice
                selected={filter === 'facilities'}
                onPress={() => changeFilter('facilities')}
              >
                Lots & garages
              </Choice>
              <Choice
                selected={filter === 'lot'}
                onPress={() => changeFilter('lot')}
              >
                Lots
              </Choice>
              <Choice
                selected={filter === 'garage'}
                onPress={() => changeFilter('garage')}
              >
                Garages
              </Choice>
              <Choice
                selected={feeFilter === 'applies'}
                onPress={() => {
                  setFeeFilter(feeFilter === 'all' ? 'applies' : 'all')
                  track({
                    name: 'filter_used',
                    filter: 'fees',
                    value: feeFilter === 'all' ? 'applies' : 'all',
                  })
                  setSelected(null)
                }}
              >
                Fee applies
              </Choice>
            </ScrollView>
            {!chipsAtEnd ? <ChipFade /> : null}
          </View>
        ) : null}
        {samples ? (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              SAMPLE PARKING · Not real parking locations
            </Text>
          </View>
        ) : null}
      </View>

      {discoveryVisible && sheet.position !== 'expanded' ? (
        <>
          {controlsVisible ? (
            <View style={[styles.controls, { bottom: sheetHeight + 8 }]}>
              <IconButton
                style={ui.shadow}
                icon="locate"
                label="Center on my location"
                disabled={location.status === 'locating'}
                onPress={centerOnMyLocation}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add missing parking as a local preview"
                onPress={() => startContribution()}
                style={({ pressed }) => [
                  styles.addParking,
                  ui.shadow,
                  pressed && ui.pressed,
                ]}
              >
                <Icon name="plus" color={colors.action} />
                <Text style={[ui.small, ui.link]}>Add parking</Text>
              </Pressable>
            </View>
          ) : null}
          {!selected && sheet.position === 'compact' ? (
            <View
              style={[
                styles.bottom,
                { bottom: sheetHeight + 8, right: controlsVisible ? 140 : 18 },
              ]}
            >
              {mapStatus === 'error' ? (
                <StatusMessage
                  message="The map couldn’t load. Check your connection."
                  onRetry={() => {
                    setMapStatus('loading')
                    setMapRevision((current) => current + 1)
                  }}
                />
              ) : null}
              {parking.status === 'error' && !samples ? (
                <StatusMessage
                  message={parkingError}
                  onRetry={() => setRevision((current) => current + 1)}
                />
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      {drawing ? (
        <View
          onLayout={(event) =>
            setDrawingPanelHeight(event.nativeEvent.layout.height)
          }
          style={[
            styles.drawingPanel,
            ui.shadow,
            { paddingBottom: Math.max(insets.bottom, 18) },
          ]}
        >
          <Text style={ui.eyebrow}>WHAT KIND OF PARKING?</Text>
          <View style={[ui.row, { flexWrap: 'wrap', gap: 6 }]}>
            {(['street', 'lot', 'garage'] as const).map((value) => (
              <Choice
                key={value}
                selected={kind === value}
                onPress={() => {
                  setKind(value)
                  setPoints([])
                }}
              >
                {kindLabels[value]}
              </Choice>
            ))}
          </View>
          <View style={ui.row}>
            <Text style={[ui.small, ui.flex]}>
              {kind === 'street'
                ? `${points.length} points · minimum 2`
                : points.length
                  ? 'Pin placed. Tap again to move it.'
                  : 'Tap the location on the map.'}
            </Text>
            <IconButton
              icon="undo"
              label="Undo last map point"
              disabled={!points.length}
              onPress={() => setPoints((current) => current.slice(0, -1))}
            />
          </View>
          <Button
            disabled={points.length < (kind === 'street' ? 2 : 1)}
            onPress={continueContribution}
          >
            Add information
          </Button>
        </View>
      ) : null}
      {routeTarget ? (
        <RouteDetails
          destinationName={routeTarget.name}
          state={routeState}
          onHeightChange={setRouteHeight}
          onClose={() => {
            clearRoute()
            setRouteTarget(null)
          }}
          onDetails={
            routeTarget.parking
              ? () => {
                  clearRoute()
                  setSelected(routeTarget.parking)
                  setRouteTarget(null)
                  center(routeTarget.coordinate)
                }
              : null
          }
          onRetry={() =>
            void loadRoute(routeTarget.coordinate, location.locate)
          }
        />
      ) : null}
      {form ? (
        <ContributionForm
          draft={form}
          onSave={save}
          onClose={() => {
            setForm(null)
            setPoints([])
            setAdjusted(null)
          }}
          onAdjust={(current) => {
            setAdjusted(current)
            setKind(current.kind)
            setPoints(
              current.geometry.type === 'Point'
                ? [current.geometry.coordinates]
                : current.geometry.coordinates,
            )
            setForm(null)
            setDrawing(true)
          }}
        />
      ) : null}
      {discoveryVisible ? (
        <DiscoverySheet
          position={sheet.position}
          selected={!!selected}
          title={
            !parking.canQuery ? 'Zoom in to discover parking' : resultsTitle
          }
          summary={resultsSummary}
          busy={busy}
          onPositionChange={changeSheetPosition}
          onHeightChange={setSheetHeight}
          onSaved={() => setPanel('saved')}
          onInfo={() => setPanel('info')}
          onLocate={
            reference.label === 'map center' ? centerOnMyLocation : null
          }
          locating={location.status === 'locating'}
        >
          {selected ? (
            <ParkingDetails
              key={selected.id}
              parking={selected}
              reference={reference}
              favorite={local.state.favorites.some(
                (item) => item.key === recordKey(selected),
              )}
              onFavorite={() => favorite(selected)}
              favoriteDisabled={local.status !== 'ready' || local.busy}
              storageError={local.error}
              now={now}
              expanded={sheet.position === 'expanded'}
              onExpand={() => changeSheetPosition('expanded')}
              onDirections={() => startDirections(selected)}
              onClose={() => setSelected(null)}
              onReport={() => startContribution(selected)}
            />
          ) : sheet.position === 'compact' ? (
            <View style={styles.peek}>
              {ranked[0] ? (
                <ParkingRow
                  parking={ranked[0]}
                  reference={reference}
                  now={now}
                  onPress={() => {
                    const first = ranked[0]
                    if (first) select(first.id)
                  }}
                  compact
                />
              ) : (
                <Text style={ui.small}>
                  {!parking.canQuery
                    ? 'Zoom in to load parking records.'
                    : 'Expand for coverage and filter options.'}
                </Text>
              )}
            </View>
          ) : (
            <FlatList
              data={ranked}
              keyExtractor={(record) => record.id}
              style={ui.flex}
              contentContainerStyle={styles.panelContent}
              ListFooterComponent={
                <View style={{ gap: 12, paddingTop: 12 }}>
                  {feeFilter === 'applies' ? (
                    <Notice>
                      {partitions.matched.length} with recorded fees ·{' '}
                      {partitions.unknown.length} with fees unknown, listed
                      separately below. Unknown fees do not mean free parking.
                    </Notice>
                  ) : null}
                  {locationMessage ? <Notice>{locationMessage}</Notice> : null}
                  {mapStatus === 'error' ? (
                    <StatusMessage
                      message="The map couldn’t load. Check your connection."
                      onRetry={() => {
                        setMapStatus('loading')
                        setMapRevision((current) => current + 1)
                      }}
                    />
                  ) : null}
                  <Text style={ui.small}>
                    {visible.length} mapped{' '}
                    {visible.length === 1 ? 'location' : 'locations'} in this
                    map area · Sorted by distance to {reference.label}
                  </Text>
                  <Notice>
                    Mapped parking is not a guarantee of permission or a vacant
                    space. Check posted signs. Distances use mapped points,
                    which may not be entrances.
                  </Notice>
                  {destination ? (
                    <Button secondary onPress={() => setDestination(null)}>
                      Clear destination
                    </Button>
                  ) : null}
                  {parking.status === 'loading' && !samples ? (
                    <View style={ui.row}>
                      <ActivityIndicator color={colors.accent} />
                      <Text accessibilityLiveRegion="polite" style={ui.small}>
                        Updating parking…
                      </Text>
                    </View>
                  ) : null}
                  {parking.status === 'error' && !samples ? (
                    <StatusMessage
                      message={parkingError}
                      onRetry={() => setRevision((current) => current + 1)}
                    />
                  ) : null}
                  {parking.truncated && !samples ? (
                    <Text style={ui.small}>
                      Results are limited to 250 records. Zoom in to see more.
                    </Text>
                  ) : null}
                </View>
              }
              renderItem={({ item: record }) => (
                <View>
                  {feeFilter === 'applies' &&
                  record.id === ranked[partitions.matched.length]?.id ? (
                    <Text style={[ui.small, styles.unknownFees]}>
                      Fees unknown · shown separately
                    </Text>
                  ) : null}
                  <ParkingRow
                    parking={record}
                    reference={reference}
                    now={now}
                    onPress={() => select(record.id)}
                    testID={
                      record.id ===
                      ranked.find((item) => item.kind !== 'street')?.id
                        ? 'parking-row-facility'
                        : undefined
                    }
                  />
                </View>
              )}
              ListEmptyComponent={
                <View style={{ gap: 12 }}>
                  <Text style={ui.title}>
                    {!parking.canQuery
                      ? 'Move a little closer.'
                      : parking.status === 'loading' && !samples
                        ? 'Looking for mapped parking…'
                        : filteredOut
                          ? 'No matches for this filter.'
                          : outsidePilot
                            ? 'Parking information isn’t available here yet.'
                            : 'No mapped parking here yet.'}
                  </Text>
                  <Text style={ui.muted}>
                    {!parking.canQuery
                      ? 'Zoom in to a neighborhood to load parking records.'
                      : outsidePilot
                        ? 'Current coverage includes Poblacion, Makati. Try that area or add a draft for a missing location. There may be parking here that hasn’t been mapped.'
                        : 'Missing data does not mean parking is allowed or prohibited. Try another area or filter.'}
                  </Text>
                  {!parking.canQuery ? (
                    <Button
                      onPress={() => {
                        center([
                          (viewport.west + viewport.east) / 2,
                          (viewport.south + viewport.north) / 2,
                        ])
                        changeSheetPosition('compact')
                      }}
                    >
                      Zoom in
                    </Button>
                  ) : null}
                  {filteredOut ? (
                    <Button
                      onPress={() => {
                        changeFilter('all')
                        setFeeFilter('all')
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                  {outsidePilot ? (
                    <Button
                      onPress={() => {
                        setDestination(null)
                        changeFilter('all')
                        setFeeFilter('all')
                        center(PILOT_CENTER)
                        changeSheetPosition('compact')
                      }}
                    >
                      Explore Poblacion
                    </Button>
                  ) : null}
                  <Button secondary onPress={() => startContribution()}>
                    Add missing parking
                  </Button>
                </View>
              }
            />
          )}
        </DiscoverySheet>
      ) : null}
      {!discoveryVisible ? (
        <View
          style={[
            styles.fallbackCredits,
            { bottom: cameraBottom || insets.bottom },
          ]}
        >
          <MapAttribution onPress={() => setPanel('info')} />
        </View>
      ) : null}
      {panel === 'saved' ? (
        <SavedPlaces
          local={local}
          records={parking.knownRecords}
          locating={location.status === 'locating'}
          locationError={saveLocationError ?? locationMessage}
          onSaveParked={() => {
            setSaveLocationError(null)
            void location.locate().then(async (point) => {
              if (!point) {
                setSaveLocationError(
                  'Your location could not be saved. Check location access and try again.',
                )
                return
              }
              if (await local.park(point)) {
                center(point)
                track({ name: 'parked_spot_saved' })
              }
            })
          }}
          onCenter={(point) => {
            setPanel(null)
            setSelected(null)
            center(point)
          }}
          onDirections={() => {
            const parked = local.state.parked
            if (!parked) return
            clearRoute()
            setSelected(null)
            setPanel(null)
            track({
              name: 'directions_tapped',
              target_type: 'parked',
              navigation_provider: 'in_app',
            })
            setRouteTarget({
              name: 'Where I parked',
              coordinate: parked.coordinate,
              parking: null,
            })
            void loadRoute(
              parked.coordinate,
              async () => location.point ?? location.locate(),
            )
          }}
          onSelect={(record) => {
            clearRoute()
            setRouteTarget(null)
            setPanel(null)
            setSelected(record)
            viewed(record)
            center(anchor(record.geometry))
          }}
          onClose={() => setPanel(null)}
        />
      ) : null}
      {panel === 'info' ? (
        <MapInformation
          samples={samples}
          onSamples={(enabled) => {
            clearRoute()
            setRouteTarget(null)
            setSamples(developmentSamplesEnabled(enabled, process.env.NODE_ENV))
            setSelected(null)
            if (enabled) center(PILOT_CENTER)
          }}
          drafts={drafts}
          setDrafts={setDrafts}
          storage={storage}
          onStorageReady={() => setStorage('ready')}
          onClose={() => setPanel(null)}
        />
      ) : null}
    </View>
  )
}

function StatusMessage({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <View style={styles.status}>
      <Text style={[ui.small, ui.flex]}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && ui.pressed]}
      >
        <Text style={[ui.heading, ui.link]}>Retry</Text>
      </Pressable>
    </View>
  )
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    gap: 8,
    maxWidth: 620,
    marginHorizontal: 'auto',
  },
  addParking: {
    minWidth: 96,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  peek: { flex: 1, paddingHorizontal: 20, overflow: 'hidden' },
  unknownFees: { paddingTop: 12, fontWeight: '600' },
  fallbackCredits: {
    position: 'absolute',
    left: 0,
    right: 0,
    maxWidth: 620,
    marginHorizontal: 'auto',
  },
  controls: {
    position: 'absolute',
    right: 18,
    gap: 10,
    alignItems: 'flex-end',
  },
  bottom: {
    position: 'absolute',
    left: 18,
    right: 18,
    gap: 8,
    maxWidth: 584,
    marginHorizontal: 'auto',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    boxShadow: `inset 0px 0px 0px 1px ${colors.border}`,
  },
  retry: {
    borderRadius: 12,
    minWidth: 54,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warning: {
    backgroundColor: colors.warningSurface,
    padding: 10,
    borderRadius: 12,
  },
  warningText: { fontSize: 12, fontWeight: '600', color: colors.amber },
  drawHeader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 14,
  },
  drawingPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 12,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  panelContent: { paddingHorizontal: 22, paddingBottom: 22, gap: 16 },
})
