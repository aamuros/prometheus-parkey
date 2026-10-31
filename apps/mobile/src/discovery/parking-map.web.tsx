import { Map, setWorkerUrl } from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'

import { config } from './config'
import { draftGeoJSON, parkingGeoJSON } from './map-data'
import type { CameraTarget, ParkingMapProps } from './map-types'
import { PILOT_CENTER } from './model'
import { mapColors } from './palette'
import { routeBounds } from './routing'
import { useReducedMotion } from './use-reduced-motion'

export default function ParkingMap(props: ParkingMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const previousTarget = useRef<CameraTarget | null>(null)
  const reduced = useReducedMotion()
  const [loaded, setLoaded] = useState(false)
  const parking = useMemo(
    () => parkingGeoJSON(props.records, props.selectedId),
    [props.records, props.selectedId],
  )
  const draft = useMemo(
    () => draftGeoJSON(props.draftPoints),
    [props.draftPoints],
  )
  const { top, bottom } = props.cameraPadding
  const pressed = useEffectEvent(
    (event: {
      point: { x: number; y: number }
      lngLat: { lng: number; lat: number }
    }) => {
      const features = map.current?.queryRenderedFeatures(
        [
          [event.point.x - 14, event.point.y - 14],
          [event.point.x + 14, event.point.y + 14],
        ],
        { layers: ['facilities', 'streets'] },
      )
      const id: unknown = features?.[0]?.properties.id
      if (!props.drawing && typeof id === 'string') props.onSelect(id)
      else props.onMapPress([event.lngLat.lng, event.lngLat.lat])
    },
  )
  const moved = useEffectEvent(() => {
    const instance = map.current
    const bounds = instance?.getBounds()
    if (instance && bounds)
      props.onViewport({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
        zoom: instance.getZoom(),
      })
  })
  const status = useEffectEvent(props.onStatus)

  useEffect(() => {
    if (!container.current) return
    setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')
    status('loading')
    let instance: Map
    try {
      instance = new Map({
        container: container.current,
        style: config.mapStyle,
        center: PILOT_CENTER,
        zoom: 15.5,
        minZoom: 3,
        maxZoom: 20,
        attributionControl: false,
      })
    } catch {
      status('error')
      return
    }
    map.current = instance
    instance.on('load', () => {
      instance.addSource('route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      for (const [id, color, width] of [
        ['route-casing', mapColors.casing, 10],
        ['route-line', mapColors.route, 6],
      ] as const) {
        instance.addLayer({
          id,
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': color, 'line-width': width },
        })
      }
      instance.addSource('parking', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      instance.addLayer({
        id: 'street-casing',
        type: 'line',
        source: 'parking',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': mapColors.casing,
          'line-width': 10,
          'line-opacity': ['case', ['get', 'muted'], 0.75, 1],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      instance.addLayer({
        id: 'streets',
        type: 'line',
        source: 'parking',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': [
            'case',
            ['get', 'selected'],
            mapColors.streetSelected,
            mapColors.street,
          ],
          'line-width': 6,
          'line-opacity': ['case', ['get', 'muted'], 0.75, 1],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      instance.addLayer({
        id: 'facilities',
        type: 'circle',
        source: 'parking',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': [
            'case',
            ['get', 'selected'],
            mapColors.facilitySelected,
            mapColors.facility,
          ],
          'circle-radius': ['case', ['get', 'selected'], 21, 17],
          'circle-stroke-width': 3,
          'circle-opacity': ['case', ['get', 'muted'], 0.75, 1],
          'circle-stroke-opacity': ['case', ['get', 'muted'], 0.75, 1],
          'circle-stroke-color': [
            'case',
            ['get', 'selected'],
            mapColors.facilitySelectedOutline,
            mapColors.facilityOutline,
          ],
        },
      })
      instance.addLayer({
        id: 'parking-labels',
        type: 'symbol',
        source: 'parking',
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 15,
          'text-allow-overlap': true,
        },
        paint: {
          'text-opacity': ['case', ['get', 'muted'], 0.75, 1],
          'text-color': [
            'case',
            ['get', 'selected'],
            mapColors.facilitySelectedLabel,
            mapColors.facilityLabel,
          ],
        },
      })
      for (const [id, color, radius] of [
        ['user', mapColors.user, 7],
        ['destination', mapColors.destination, 8],
        ['parked', mapColors.parked, 10],
      ] as const) {
        instance.addSource(id, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        instance.addLayer({
          id: `${id}-dot`,
          type: 'circle',
          source: id,
          paint: {
            'circle-radius': radius,
            'circle-color': color,
            'circle-stroke-color': mapColors.casing,
            'circle-stroke-width': 3,
          },
        })
      }
      instance.addLayer({
        id: 'parked-label',
        type: 'symbol',
        source: 'parked',
        layout: {
          'text-field': 'CAR',
          'text-size': 10,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': mapColors.casing },
      })
      instance.addSource('draft', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      instance.addLayer({
        id: 'draft-line',
        type: 'line',
        source: 'draft',
        paint: {
          'line-color': mapColors.draft,
          'line-width': 5,
          'line-dasharray': [2, 1],
        },
      })
      instance.addLayer({
        id: 'draft-points',
        type: 'circle',
        source: 'draft',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 7,
          'circle-color': mapColors.draft,
          'circle-stroke-color': mapColors.casing,
          'circle-stroke-width': 3,
        },
      })
      setLoaded(true)
      status('ready')
      moved()
    })
    instance.on('click', pressed)
    instance.on('moveend', moved)
    instance.on('error', () => status('error'))
    instance.on('idle', () => status('ready'))
    return () => {
      instance.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (props.route) {
      map.current?.fitBounds(routeBounds(props.route), {
        padding: { top: top + 20, bottom: bottom + 20, left: 28, right: 28 },
        duration: reduced ? 0 : 400,
        maxZoom: 17,
      })
      return
    }
    const focusTarget =
      previousTarget.current !== props.target || props.selectedId !== null
    previousTarget.current = props.target
    map.current?.easeTo({
      ...(focusTarget ? { center: props.target.coordinate, zoom: 16 } : {}),
      duration: reduced ? 0 : 400,
      padding: { top, bottom, left: 0, right: 0 },
    })
  }, [
    props.target,
    props.route,
    loaded,
    top,
    bottom,
    props.selectedId,
    reduced,
  ])
  useEffect(() => {
    if (!loaded) return
    const source = map.current?.getSource<GeoJSONSource>('parking')
    source?.setData(parking)
  }, [loaded, parking])
  useEffect(() => {
    if (!loaded) return
    map.current
      ?.getSource<GeoJSONSource>('route')
      ?.setData(
        props.route?.geometry ?? { type: 'FeatureCollection', features: [] },
      )
  }, [loaded, props.route])
  useEffect(() => {
    if (!loaded) return
    map.current?.getSource<GeoJSONSource>('draft')?.setData(draft)
  }, [loaded, draft])
  useEffect(() => {
    if (!loaded) return
    map.current
      ?.getSource<GeoJSONSource>('user')
      ?.setData(
        props.userLocation
          ? { type: 'Point', coordinates: props.userLocation }
          : { type: 'FeatureCollection', features: [] },
      )
  }, [loaded, props.userLocation])
  useEffect(() => {
    if (!loaded) return
    map.current
      ?.getSource<GeoJSONSource>('destination')
      ?.setData(
        props.destination
          ? { type: 'Point', coordinates: props.destination }
          : { type: 'FeatureCollection', features: [] },
      )
  }, [loaded, props.destination])

  useEffect(() => {
    if (!loaded) return
    map.current
      ?.getSource<GeoJSONSource>('parked')
      ?.setData(
        props.parkedLocation
          ? { type: 'Point', coordinates: props.parkedLocation }
          : { type: 'FeatureCollection', features: [] },
      )
  }, [loaded, props.parkedLocation])

  return (
    <div
      ref={container}
      aria-label="Interactive parking map. Use the parking list for accessible location selection."
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}
