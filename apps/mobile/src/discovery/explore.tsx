import type {
  Coordinate,
  DiscoveryParking,
  ParkingContribution,
  ParkingKind,
} from '@parkey/shared-types'
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AppState,
  BackHandler,
  FlatList,
  Linking,
  Keyboard,
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
import { readContributions, writeContributions } from './contributions'
import type { Destination } from './data'
import { draftParking } from './draft-parking'
import { useNavigation } from './use-navigation'
import { useDirectionsConsent } from './use-directions-consent'
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
  distanceMeters,
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
import { PARKING_ROW_HEIGHT, ParkingRow } from './parking-row'
import {
  developmentSamplesEnabled,
  millisecondsToNextMinute,
  parkingTitle,
} from './presentation'
import { NavigationBanner, RouteDetails } from './route-details'
import { nextParking } from './drive-math'
import { useDriveNavigation } from './use-drive-navigation'
import { sampleParking } from './sample-data'
import { DestinationSearch } from './search'
import { discoveryCameraPadding, stepSheet } from './sheet-state'
import type { SheetPosition } from './sheet-state'
import { fonts } from './typography'
import {
  Button,
  Choice,
  colors,
  detailsPeekHeight,
  Icon,
  IconButton,
  LoadingRows,
  UndoToast,
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
  const navigation = useNavigation()
  const { update: updateNavigation, close: closeNavigation } = navigation
  const nav = navigation.state
  const panned = useRef(false)
  const searchedCenter = useRef(nav.center)
  const [areaRefresh, setAreaRefresh] = useState(false)
  useEffect(() => {
    searchedCenter.current = nav.center
  }, [nav.center])
  const target = useMemo(
    () => ({ coordinate: nav.center, revision: 0 }),
    [nav.center],
  )
  const filter = nav.filter
  const feeFilter = nav.fees
  const setFeeFilter = (fees: FeeFilter) => updateNavigation({ fees })
  const [now, setNow] = useState(() => new Date())
  const sheet = { position: nav.position }
  const setSelected = useCallback(
    (record: DiscoveryParking | null) => {
      if (record)
        updateNavigation({
          selectedId: record.id,
          center: anchor(record.geometry),
        })
      else if (nav.selectedId)
        closeNavigation({ selectedId: null, center: nav.center })
    },
    [updateNavigation, closeNavigation, nav.center, nav.selectedId],
  )
  const changeSheetPosition = useCallback(
    (position: SheetPosition) => updateNavigation({ position }),
    [updateNavigation],
  )
  const list = useRef<FlatList<DiscoveryParking>>(null)
  const [toast, setToast] = useState<{
    message: string
    undo: () => void
  } | null>(null)
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])
  const consent = useDirectionsConsent(
    nav.consent,
    () => updateNavigation({ consent: true }),
    () => closeNavigation({ consent: false }),
  )
  const [sheetHeight, setSheetHeight] = useState(168 + insets.bottom)
  const [drawingPanelHeight, setDrawingPanelHeight] = useState(0)
  const [topOverlayHeight, setTopOverlayHeight] = useState(0)
  const [routeTarget, setRouteTarget] = useState<{
    name: string
    coordinate: Coordinate
    parking: DiscoveryParking | null
  } | null>(null)
  const [routeHeight, setRouteHeight] = useState(detailsPeekHeight)
  const [destination, setDestination] = useState<Destination | null>(null)
  const searchActive = nav.searching
  const panel = nav.panel
  const setPanel = (value: 'info' | 'saved' | null) =>
    value
      ? updateNavigation({ panel: value })
      : closeNavigation({ panel: null })
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
  const [drawingRequested, setDrawing] = useState(false)
  const drawing = drawingRequested && nav.panel === 'add'
  const [kind, setKind] = useState<ParkingKind>('lot')
  const [points, setPoints] = useState<Coordinate[]>([])
  const [form, setForm] = useState<ParkingContribution | null>(null)
  const [adjusted, setAdjusted] = useState<ParkingContribution | null>(null)
  const [drafts, setDrafts] = useState<ParkingContribution[]>([])
  const [storage, setStorage] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const navigationViewportPrivate = useRef(false)
  const saving = useRef(false)
  const savingFavorite = useRef(false)
  const location = useLocation()
  const local = useLocalState()
  const [saveLocationError, setSaveLocationError] = useState<string | null>(
    null,
  )
  const {
    load: loadRoute,
    clear: clearRoute,
    cancel: cancelRoute,
    ...routeState
  } = useRoute()
  const [fromMapCenter, setFromMapCenter] = useState(false)
  const [rejected, setRejected] = useState<ReadonlySet<string>>(() => new Set())
  const [resumeTarget, setResumeTarget] = useState<typeof routeTarget>(null)
  const [navigationMessage, setNavigationMessage] = useState<string | null>(
    null,
  )
  const reroute = useCallback(
    (from: Coordinate, to: Coordinate) => loadRoute(to, async () => from, true),
    [loadRoute],
  )
  const drive = useDriveNavigation({
    route: routeState.route,
    destination: nav.route ? (routeTarget?.coordinate ?? null) : null,
    reroute,
    cancel: cancelRoute,
  })
  const directDirections = useRef(false)
  const startDirectDirections = useEffectEvent(() => {
    if (
      directDirections.current &&
      nav.route &&
      routeState.status === 'ready' &&
      routeState.route &&
      location.point
    ) {
      directDirections.current = false
      drive.start()
    }
  })
  useEffect(() => {
    startDirectDirections()
  }, [nav.route, routeState.status, routeState.route, location.point])
  const navigating = nav.route && drive.phase === 'navigating'
  const mapNavigation = useMemo(
    () =>
      navigating
        ? {
            following: drive.following,
            along: drive.progress?.along ?? 0,
            onPan: drive.pan,
          }
        : undefined,
    [navigating, drive.following, drive.progress?.along, drive.pan],
  )
  function endNavigation() {
    directDirections.current = false
    setResumeTarget(routeTarget)
    drive.stop(drive.phase === 'navigating')
    clearRoute()
    updateNavigation({ route: false, selectedId: null }, 'replace')
  }
  const browserBack = useEffectEvent((event: PopStateEvent) => {
    // Consume Back as End before Expo Router can remount the screen and discard
    // the five-second Resume action. The history entry itself has already moved.
    event.stopImmediatePropagation()
    endNavigation()
  })
  useEffect(() => {
    if (Platform.OS !== 'web' || !nav.route) return
    window.addEventListener('popstate', browserBack, true)
    return () => window.removeEventListener('popstate', browserBack, true)
  }, [nav.route])
  const parking = useParking(viewport, revision)
  const previews = useMemo(
    () => drafts.filter((draft) => draft.intent === 'add').map(draftParking),
    [drafts],
  )
  const selected =
    [
      ...parking.knownRecords,
      ...previews,
      ...(samples ? sampleParking : []),
    ].find((record) => record.id === nav.selectedId) ?? null
  useEffect(() => {
    if (
      storage === 'ready' &&
      nav.selectedId?.startsWith('local-') &&
      !drafts.some((draft) => draft.id === nav.selectedId)
    )
      updateNavigation({ selectedId: null }, 'replace')
  }, [storage, nav.selectedId, drafts, updateNavigation])
  const initialLocation = useRef(false)
  useEffect(() => {
    if (!location.point || initialLocation.current) return
    initialLocation.current = true
    if (
      !nav.selectedId &&
      nav.center[0] === PILOT_CENTER[0] &&
      nav.center[1] === PILOT_CENTER[1]
    )
      updateNavigation({ center: location.point }, 'replace')
  }, [location.point, nav.selectedId, nav.center, updateNavigation])
  useEffect(() => {
    if (selected)
      updateNavigation({ center: anchor(selected.geometry) }, 'replace')
  }, [selected, updateNavigation])
  const records = useMemo(
    () =>
      samples
        ? sampleParking.filter((item) => inViewport(item.geometry, viewport))
        : [
            ...parking.records,
            ...previews.filter((record) =>
              inViewport(record.geometry, viewport),
            ),
          ],
    [samples, viewport, parking.records, previews],
  )
  const partitions = useMemo(
    () => partitionParking(records, filter, feeFilter),
    [records, filter, feeFilter],
  )
  const visible = useMemo(
    () =>
      feeFilter === 'applies'
        ? partitions.matched
        : [...partitions.matched, ...partitions.unknown],
    [partitions, feeFilter],
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
    () => rankParking(visible, reference.coordinate),
    [visible, reference.coordinate],
  )
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
  function dismissTopmost() {
    Keyboard.dismiss()
    if (nav.consent) closeNavigation({ consent: false })
    else if (nav.searching)
      closeNavigation({ searching: false, query: nav.query })
    else if (nav.panel) {
      setDrawing(false)
      closeNavigation({ panel: null })
    } else if (nav.route) endNavigation()
    else if (nav.selectedId) setSelected(null)
    else if (nav.position !== 'compact')
      closeNavigation({ position: stepSheet(nav.position, -1) })
    else return false
    return true
  }
  useEffect(() => {
    if (Platform.OS === 'web') {
      const escape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && dismissTopmost()) {
          event.preventDefault()
          event.stopImmediatePropagation()
        }
      }
      window.addEventListener('keydown', escape, true)
      return () => window.removeEventListener('keydown', escape, true)
    }
    const listener = BackHandler.addEventListener(
      'hardwareBackPress',
      dismissTopmost,
    )
    return () => listener.remove()
  })
  useEffect(() => {
    const index = ranked.findIndex((record) => record.id === nav.selectedId)
    if (index < 0) return
    const frame = requestAnimationFrame(() =>
      list.current?.scrollToIndex({ index, animated: false }),
    )
    return () => cancelAnimationFrame(frame)
  }, [nav.selectedId, ranked])
  const updateViewport = useCallback((next: Viewport) => {
    if (panned.current) {
      const point: Coordinate = [
        (next.west + next.east) / 2,
        (next.south + next.north) / 2,
      ]
      setAreaRefresh(distanceMeters(point, searchedCenter.current) > 600)
      panned.current = false
    }
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
    updateNavigation({ center: coordinate }, 'replace')
  }
  function startDirections(record: DiscoveryParking) {
    if (record.sourceKind === 'sample') return
    directDirections.current = true
    void consent.request((confirmed) => beginDirections(record, confirmed))
  }
  function beginDirections(record: DiscoveryParking, confirmed: boolean) {
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
    updateNavigation(
      {
        route: true,
        consent: false,
        searching: false,
        panel: null,
        selectedId: record.id,
      },
      confirmed ? 'replace' : 'push',
    )
    setRejected(new Set())
    setNavigationMessage(null)
    setFromMapCenter(!location.point)
    void loadRoute(
      anchor(record.geometry),
      async () => location.point ?? target.coordinate,
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
        if (saved)
          setToast({
            message: adding ? 'Parking saved' : 'Parking removed',
            undo: () => {
              void local.favorite(record)
              setToast(null)
            },
          })
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
    setAreaRefresh(false)
    if (searchActive) {
      navigation.close({ searching: false, query: nav.query })
      return
    }
    const record = visible.find((item) => item.id === id)
    if (!record) return
    clearRoute()
    setRouteTarget(null)
    if (selected?.id === id) {
      setSelected(null)
      return
    }
    setSelected(record)
    viewed(record)
  }
  function changeFilter(next: DiscoveryFilter) {
    track({ name: 'filter_used', filter: 'kind', value: next })
    clearRoute()
    setRouteTarget(null)
    updateNavigation({
      filter: next === filter ? 'all' : next,
      selectedId: null,
      route: false,
    })
  }
  function startContribution(record?: DiscoveryParking) {
    clearRoute()
    setRouteTarget(null)
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
      const point: Coordinate = [
        (viewport.west + viewport.east) / 2,
        (viewport.south + viewport.north) / 2,
      ]
      setForm({
        id: `local-${now.getTime()}`,
        intent: 'add',
        targetId: null,
        kind: 'lot',
        geometry: { type: 'Point', coordinates: point },
        side: 'unknown',
        name: '',
        restrictions: '',
        hours: '',
        fees: '',
        photoUri: null,
        createdAt: new Date().toISOString(),
        status: 'local_pending_review',
      })
      setDrawing(false)
      setPoints([point])
      setAdjusted(null)
    }
    updateNavigation({ panel: 'add', route: false, selectedId: null })
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
      setForm(null)
      const preview = draftParking(normalized)
      updateNavigation(
        {
          panel: null,
          selectedId:
            normalized.intent === 'add' ? preview.id : normalized.targetId,
          ...(normalized.intent === 'add'
            ? { filter: 'all' as const, fees: 'all' as const }
            : {}),
          center: anchor(preview.geometry),
          position: 'compact',
        },
        'replace',
      )
      setToast({
        message:
          normalized.intent === 'add'
            ? 'Private parking draft saved'
            : 'Correction draft saved',
        undo: () => {
          const remaining = next.filter((item) => item.id !== normalized.id)
          void writeContributions(remaining)
            .then(() => {
              setDrafts(remaining)
              updateNavigation({
                selectedId:
                  normalized.intent === 'add' ? null : normalized.targetId,
              })
              setToast(null)
            })
            .catch(() =>
              setToast((current) =>
                current
                  ? { ...current, message: 'Couldn’t undo. Try again.' }
                  : null,
              ),
            )
        },
      })
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
    !searchActive && !drawing && !nav.route && panel === null
  const controlsVisible = screenHeight - sheetHeight > topOverlayHeight + 122
  const cameraBottom =
    routeTarget && nav.route
      ? routeHeight
      : drawing
        ? drawingPanelHeight
        : discoveryVisible
          ? sheetHeight
          : 0
  const cameraPadding = discoveryCameraPadding(
    screenHeight,
    topOverlayHeight,
    cameraBottom,
  )
  function centerOnMyLocation() {
    void location.locate().then((point) => {
      if (point) {
        setDestination(null)
        navigation.update(
          {
            selectedId: null,
            center: point,
            searching: false,
            panel: null,
            route: false,
          },
          'replace',
        )
      }
    })
  }

  return (
    <View
      testID={mapStatus === 'ready' ? 'discovery-map-ready' : 'discovery-map'}
      style={styles.screen}
    >
      {topOverlayHeight > 0 ? (
        <ParkingMap
          key={mapRevision}
          records={visible}
          selectedId={
            (nav.route ? routeTarget?.parking?.id : null) ??
            selected?.id ??
            null
          }
          route={routeState.route}
          target={target}
          cameraPadding={cameraPadding}
          parkedLocation={local.state.parked?.coordinate ?? null}
          navigation={mapNavigation}
          userLocation={
            nav.route ? (drive.position ?? location.point) : location.point
          }
          destination={
            routeTarget && nav.route
              ? routeTarget.coordinate
              : (destination?.coordinate ?? null)
          }
          draftPoints={drawing ? points : EMPTY_POINTS}
          drawing={drawing}
          onSelect={(id) => {
            if (!nav.route) select(id)
          }}
          onMapPress={(point) => {
            if (nav.route) return
            if (searchActive) {
              closeNavigation({ searching: false, query: nav.query })
              Keyboard.dismiss()
              return
            }
            if (drawing && isCoordinate(point))
              setPoints((current) =>
                kind === 'street' ? [...current, point].slice(0, 12) : [point],
              )
            else if (nav.selectedId) setSelected(null)
            else if (nav.route) endNavigation()
          }}
          onPan={() => {
            if (!nav.route) navigationViewportPrivate.current = false
          }}
          onViewport={(next) => {
            if (!nav.route && !navigationViewportPrivate.current)
              updateViewport(next)
          }}
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
        <View pointerEvents="box-none" style={styles.searchOverlay}>
          {navigating ? (
            <NavigationBanner
              step={drive.progress?.next}
              distance={drive.progress?.maneuverDistance ?? 0}
              rerouting={drive.rerouting}
              onClose={endNavigation}
            />
          ) : nav.route ? null : sheet.position === 'expanded' &&
            discoveryVisible ? null : drawing ? (
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
              onSaved={() => setPanel('saved')}
              query={nav.query}
              active={searchActive}
              onQuery={(query) => updateNavigation({ query }, 'replace')}
              onLocate={() => {
                updateNavigation({
                  searching: false,
                  query: '',
                  selectedId: null,
                  position: 'medium',
                })
                void location.locate().then((point) => {
                  if (point) {
                    setDestination(null)
                    updateNavigation({ center: point })
                  }
                })
              }}
              center={target.coordinate}
              onActive={(active) => {
                if (active) updateNavigation({ searching: true })
                else closeNavigation({ searching: false, query: nav.query })
              }}
              onSelect={(found) => {
                setDestination(found)
                const matches = partitionParking(
                  [...parking.knownRecords, ...previews],
                  filter,
                  feeFilter,
                ).matched
                const closest = rankParking(matches, found.coordinate)[0]
                const focus =
                  closest &&
                  distanceMeters(anchor(closest.geometry), found.coordinate) <=
                    1500
                    ? anchor(closest.geometry)
                    : found.coordinate
                updateNavigation({
                  searching: false,
                  query: found.name,
                  selectedId: null,
                  center: [focus[0], focus[1]],
                  position: 'medium',
                })
              }}
            />
          )}
        </View>
        {!searchActive &&
        !drawing &&
        !selected &&
        !nav.route &&
        sheet.position !== 'expanded' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            <Choice
              selected={filter === 'all'}
              onPress={() => {
                changeFilter('all')
                setFeeFilter('all')
              }}
            >
              All parking
            </Choice>
            <Choice
              selected={filter === 'street'}
              onPress={() => changeFilter('street')}
            >
              Street parking
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
            <View style={[styles.controls, { bottom: sheetHeight + 12 }]}>
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
                <Text style={[ui.heading, styles.addParkingText]}>
                  Add parking
                </Text>
              </Pressable>
            </View>
          ) : null}
          {!selected && sheet.position === 'compact' ? (
            <View
              style={[
                styles.bottom,
                { bottom: sheetHeight + 8, right: controlsVisible ? 184 : 16 },
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
      {navigating && !drive.following ? (
        <View style={[styles.controls, { bottom: routeHeight + 20 }]}>
          <Button onPress={drive.recenter}>Re-center</Button>
        </View>
      ) : null}
      {drive.resumable && resumeTarget ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.resume, ui.shadow]}
        >
          <Text style={ui.body}>Navigation ended · </Text>
          <Button
            secondary
            onPress={() => {
              setRouteTarget(resumeTarget)
              updateNavigation({
                route: true,
                selectedId: resumeTarget.parking?.id ?? null,
              })
              void loadRoute(
                resumeTarget.coordinate,
                async () => location.point ?? target.coordinate,
              )
              drive.start()
            }}
          >
            Resume
          </Button>
        </View>
      ) : null}
      {discoveryVisible && local.state.parked ? (
        <View style={[styles.carChip, { top: topOverlayHeight + 10 }]}>
          <Button
            secondary
            onPress={() => {
              const parked = local.state.parked
              if (parked)
                void Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${parked.coordinate[1]},${parked.coordinate[0]}&travelmode=walking`,
                )
            }}
          >
            Your car ·{' '}
            {Math.floor(
              (now.getTime() - Date.parse(local.state.parked.savedAt)) /
                3600000,
            ) > 0
              ? `${Math.floor((now.getTime() - Date.parse(local.state.parked.savedAt)) / 3600000)} h ago`
              : Math.floor(
                    (now.getTime() - Date.parse(local.state.parked.savedAt)) /
                      60000,
                  ) > 0
                ? `${Math.floor((now.getTime() - Date.parse(local.state.parked.savedAt)) / 60000)} min ago`
                : 'Just now'}{' '}
            · Directions
          </Button>
        </View>
      ) : null}
      {routeTarget && nav.route ? (
        <RouteDetails
          key={routeTarget.parking?.id ?? 'car'}
          destinationName={routeTarget.name}
          destination={routeTarget.coordinate}
          state={routeState}
          phase={drive.phase}
          starting={drive.starting}
          denied={drive.denied}
          message={
            navigationMessage ??
            drive.message ??
            (drive.phase === 'arrived' ? local.error : null)
          }
          fromMapCenter={fromMapCenter}
          remainingDistance={drive.progress?.remainingDistance}
          remainingDuration={drive.progress?.remainingDuration}
          saving={local.busy || location.status === 'locating'}
          onStart={() => {
            setNavigationMessage(null)
            navigationViewportPrivate.current = true
            drive.start()
          }}
          onPark={() => {
            if (saving.current) return
            saving.current = true
            setNavigationMessage(null)
            void location
              .locate()
              .then(async (point) => {
                if (!point) {
                  setNavigationMessage(
                    'Your car location could not be saved. Check location access and try again.',
                  )
                  return
                }
                if (await local.park(point)) {
                  drive.stop(false)
                  clearRoute()
                  updateNavigation(
                    { route: false, selectedId: null },
                    'replace',
                  )
                }
              })
              .finally(() => {
                saving.current = false
              })
          }}
          onNext={
            routeTarget.parking &&
            nextParking(
              parking.knownRecords,
              routeTarget.parking,
              drive.position ?? routeTarget.coordinate,
              rejected,
            )
              ? () => {
                  const current = routeTarget.parking
                  if (!current) return
                  setRejected(new Set([...rejected, current.id]))
                  const next = nextParking(
                    parking.knownRecords,
                    current,
                    drive.position ?? routeTarget.coordinate,
                    rejected,
                  )
                  if (!next) {
                    setNavigationMessage(
                      'No other mapped parking of this type nearby.',
                    )
                    return
                  }
                  const from = drive.position ?? routeTarget.coordinate
                  drive.stop(false)
                  const coordinate = anchor(next.geometry)
                  setRouteTarget({
                    name: parkingTitle(next),
                    coordinate,
                    parking: next,
                  })
                  updateNavigation(
                    { selectedId: next.id, route: true },
                    'replace',
                  )
                  setNavigationMessage(null)
                  void loadRoute(coordinate, async () => from).then((route) => {
                    if (route) drive.start()
                  })
                }
              : null
          }
          onHeightChange={setRouteHeight}
          onClose={endNavigation}
          onDetails={
            routeTarget.parking
              ? () => {
                  drive.stop(false)
                  clearRoute()
                  updateNavigation({
                    route: false,
                    selectedId: routeTarget.parking?.id ?? null,
                    center: routeTarget.coordinate,
                  })
                }
              : null
          }
          onRetry={() =>
            void loadRoute(
              routeTarget.coordinate,
              async () => location.point ?? target.coordinate,
            )
          }
        />
      ) : null}
      {panel === 'add' && !drawing ? (
        <ContributionForm
          draft={
            form ?? {
              id: `local-${now.getTime()}`,
              intent: 'add',
              targetId: null,
              kind: 'lot',
              geometry: { type: 'Point', coordinates: nav.center },
              side: 'unknown',
              name: '',
              restrictions: '',
              hours: '',
              fees: '',
              photoUri: null,
              createdAt: new Date().toISOString(),
              status: 'local_pending_review',
            }
          }
          onSave={save}
          onClose={() => {
            setPoints([])
            setAdjusted(null)
            closeNavigation({ panel: null })
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
          title={selected ? parkingTitle(selected) : resultsTitle}
          summary={`${visible.length} mapped ${visible.length === 1 ? 'location' : 'locations'} · ${filter === 'all' ? 'all parking' : filter === 'facilities' ? 'lots & garages' : filter === 'lot' ? 'lots' : filter === 'garage' ? 'garages' : 'street parking'}`}
          onPositionChange={changeSheetPosition}
          onHeightChange={setSheetHeight}
          onClose={() => setSelected(null)}
        >
          {selected ? (
            <ParkingDetails
              parking={selected}
              location={location.point}
              favorite={local.state.favorites.some(
                (item) => item.key === recordKey(selected),
              )}
              onFavorite={() => favorite(selected)}
              favoriteDisabled={local.status !== 'ready'}
              storageError={local.error}
              expanded={sheet.position === 'expanded'}
              onDirections={() => startDirections(selected)}
            />
          ) : null}
          <View
            style={[ui.flex, selected && { display: 'none' }]}
            onFocus={(event) => {
              if (
                Platform.OS !== 'web' ||
                nav.position === 'expanded' ||
                !(event.target instanceof HTMLElement) ||
                !(event.currentTarget instanceof HTMLElement)
              )
                return
              if (
                event.target.getBoundingClientRect().bottom >
                event.currentTarget.getBoundingClientRect().bottom
              )
                changeSheetPosition('expanded')
            }}
          >
            <FlatList
              ref={list}
              data={ranked}
              keyExtractor={(record) => record.id}
              style={ui.flex}
              scrollEnabled={sheet.position === 'expanded'}
              keyboardShouldPersistTaps="handled"
              getItemLayout={(_, index) => ({
                length: PARKING_ROW_HEIGHT,
                offset: PARKING_ROW_HEIGHT * index,
                index,
              })}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ListHeaderComponent={
                mapStatus === 'error' ||
                (parking.status === 'error' && !samples) ? (
                  <StatusMessage
                    message={
                      mapStatus === 'error'
                        ? 'The map couldn’t load.'
                        : parkingError
                    }
                    onRetry={() => {
                      setRevision((current) => current + 1)
                      setMapRevision((current) => current + 1)
                    }}
                  />
                ) : undefined
              }
              renderItem={({ item: record }) => (
                <ParkingRow
                  parking={record}
                  reference={reference}
                  onPress={() => select(record.id)}
                  onDirections={() => startDirections(record)}
                  onFavorite={() => favorite(record)}
                  favorite={local.state.favorites.some(
                    (item) => item.key === recordKey(record),
                  )}
                  disabled={local.status !== 'ready'}
                  selected={selected?.id === record.id}
                  testID={`parking-row-${record.id}`}
                />
              )}
              ListEmptyComponent={
                parking.status === 'loading' && !samples ? (
                  <LoadingRows />
                ) : (
                  <View style={{ gap: 12, paddingVertical: 12 }}>
                    <Text style={ui.heading}>
                      {!parking.canQuery
                        ? 'Zoom in to see mapped parking.'
                        : filteredOut
                          ? 'No parking matches this filter.'
                          : 'No parking mapped here. Zoom out or Add parking.'}
                    </Text>
                    {filteredOut ? (
                      <Button
                        secondary
                        onPress={() =>
                          updateNavigation({ filter: 'all', fees: 'all' })
                        }
                      >
                        Clear filters
                      </Button>
                    ) : null}
                    <Button secondary onPress={() => startContribution()}>
                      Add parking
                    </Button>
                  </View>
                )
              }
            />
          </View>
        </DiscoverySheet>
      ) : null}
      {toast ? (
        <View
          style={{
            position: 'absolute',
            bottom: Math.max(cameraBottom, insets.bottom) + 64,
            left: 16,
            right: 16,
            zIndex: 20,
          }}
        >
          <UndoToast message={toast.message} onUndo={toast.undo} />
        </View>
      ) : null}
      {areaRefresh &&
      discoveryVisible &&
      !selected &&
      sheet.position !== 'expanded' ? (
        <View
          style={{
            position: 'absolute',
            bottom: sheetHeight + 76,
            alignSelf: 'center',
          }}
        >
          <Button
            secondary
            onPress={() => {
              searchedCenter.current = [
                (viewport.west + viewport.east) / 2,
                (viewport.south + viewport.north) / 2,
              ]
              setAreaRefresh(false)
              setRevision((current) => current + 1)
            }}
          >
            Search this area
          </Button>
        </View>
      ) : null}
      {consent.confirmation}
      {(!discoveryVisible || selected || sheet.position !== 'expanded') &&
      !searchActive ? (
        <View
          style={[
            styles.mapInfo,
            { bottom: Math.max(cameraBottom, insets.bottom) + 12 },
          ]}
        >
          <MapAttribution onPress={() => setPanel('info')} />
        </View>
      ) : null}
      {panel === 'saved' ? (
        <SavedPlaces
          local={local}
          records={[...parking.knownRecords, ...previews]}
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
            updateNavigation(
              { panel: null, selectedId: null, center: point, route: false },
              'replace',
            )
          }}
          onDirections={() => {
            const parked = local.state.parked
            if (parked)
              void Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${parked.coordinate[1]},${parked.coordinate[0]}&travelmode=walking`,
              )
          }}
          onSelect={(record) => {
            clearRoute()
            setRouteTarget(null)
            updateNavigation(
              {
                panel: null,
                selectedId: record.id,
                center: anchor(record.geometry),
                route: false,
              },
              'replace',
            )
            viewed(record)
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
  resume: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  carChip: { position: 'absolute', left: 16, alignSelf: 'flex-start' },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: 12,
  },
  searchOverlay: {
    width: '100%',
    paddingHorizontal: 16,
    maxWidth: 620,
    alignSelf: 'center',
  },
  filters: { gap: 8, paddingBottom: 4, paddingHorizontal: 16 },
  addParking: {
    minWidth: 96,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: colors.positiveSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addParkingText: { color: colors.action, fontSize: 14, lineHeight: 20 },
  peek: { flex: 1, paddingHorizontal: 24, overflow: 'hidden' },
  unknownFees: { paddingTop: 16, fontFamily: fonts.semibold },
  mapInfo: { position: 'absolute', left: 16 },
  controls: {
    position: 'absolute',
    right: 16,
    gap: 12,
    alignItems: 'flex-end',
  },
  bottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
    maxWidth: 584,
    marginHorizontal: 'auto',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
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
  warningText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 18,
    color: colors.amber,
  },
  drawHeader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 16,
  },
  drawingPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    gap: 16,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  panelContent: { paddingHorizontal: 24, paddingBottom: 24 },
})
