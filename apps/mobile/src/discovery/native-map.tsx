import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
} from '@maplibre/maplibre-react-native'
import type { CameraRef } from '@maplibre/maplibre-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'

import { config } from './config'
import { draftGeoJSON, parkingGeoJSON } from './map-data'
import type { CameraTarget, ParkingMapProps } from './map-types'
import { PILOT_CENTER } from './model'
import { mapColors } from './palette'
import { routeBounds } from './routing'
import { useReducedMotion } from './use-reduced-motion'

export default function NativeMap(props: ParkingMapProps) {
  const camera = useRef<CameraRef>(null)
  const previousTarget = useRef<CameraTarget | null>(null)
  const reduced = useReducedMotion()
  const [loaded, setLoaded] = useState(false)
  const records = useMemo(
    () => parkingGeoJSON(props.records, props.selectedId),
    [props.records, props.selectedId],
  )
  const draft = useMemo(
    () => draftGeoJSON(props.draftPoints),
    [props.draftPoints],
  )
  const { target, route, onStatus } = props
  const { top, bottom } = props.cameraPadding
  useEffect(() => {
    if (!loaded) return
    if (route) {
      const [[west, south], [east, north]] = routeBounds(route)
      camera.current?.fitBounds([west, south, east, north], {
        duration: reduced ? 0 : 400,
        padding: { top: top + 20, bottom: bottom + 20, left: 28, right: 28 },
      })
      return
    }
    const focusTarget =
      previousTarget.current !== target || props.selectedId !== null
    previousTarget.current = target
    if (!focusTarget) {
      void camera.current
        ?.setStop({
          padding: { top, bottom, left: 0, right: 0 },
          duration: reduced ? 0 : 400,
          easing: 'ease',
        })
        .catch(() => onStatus('error'))
      return
    }
    camera.current?.easeTo({
      center: target.coordinate,
      zoom: 16,
      duration: reduced ? 0 : 400,
      padding: { top, bottom, left: 0, right: 0 },
    })
  }, [target, route, top, bottom, loaded, props.selectedId, onStatus, reduced])

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={config.mapStyle}
      attribution={false}
      logo={false}
      compass={false}
      onWillStartLoadingMap={() => props.onStatus('loading')}
      onDidFinishLoadingMap={() => {
        setLoaded(true)
        props.onStatus('ready')
      }}
      onDidFailLoadingMap={() => props.onStatus('error')}
      onPress={(event) => props.onMapPress(event.nativeEvent.lngLat)}
      onRegionDidChange={(event) => {
        const {
          bounds: [west, south, east, north],
          zoom,
        } = event.nativeEvent
        props.onViewport({ west, south, east, north, zoom })
      }}
    >
      <Camera
        ref={camera}
        initialViewState={{ center: PILOT_CENTER, zoom: 15.5 }}
        minZoom={3}
        maxZoom={20}
      />
      <GeoJSONSource
        id="route"
        data={route?.geometry ?? { type: 'FeatureCollection', features: [] }}
      >
        <Layer
          id="route-casing"
          type="line"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{ 'line-color': mapColors.casing, 'line-width': 10 }}
        />
        <Layer
          id="route-line"
          type="line"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{ 'line-color': mapColors.route, 'line-width': 6 }}
        />
      </GeoJSONSource>
      <GeoJSONSource
        id="parking"
        data={records}
        onPress={(event) => {
          if (props.drawing) return
          event.stopPropagation()
          const id: unknown = event.nativeEvent.features[0]?.properties?.id
          if (typeof id === 'string') props.onSelect(id)
        }}
      >
        <Layer
          id="street-casing"
          type="line"
          filter={['==', ['geometry-type'], 'LineString']}
          paint={{
            'line-color': mapColors.casing,
            'line-width': 10,
            'line-opacity': ['case', ['get', 'muted'], 0.75, 1],
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
        <Layer
          id="streets"
          type="line"
          filter={['==', ['geometry-type'], 'LineString']}
          paint={{
            'line-color': [
              'case',
              ['get', 'selected'],
              mapColors.streetSelected,
              mapColors.street,
            ],
            'line-width': 6,
            'line-opacity': ['case', ['get', 'muted'], 0.75, 1],
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
        <Layer
          id="facilities"
          type="circle"
          filter={['==', ['geometry-type'], 'Point']}
          paint={{
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
          }}
        />
        <Layer
          id="parking-labels"
          type="symbol"
          filter={['==', ['geometry-type'], 'Point']}
          layout={{
            'text-field': ['get', 'label'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 15,
            'text-allow-overlap': true,
          }}
          paint={{
            'text-opacity': ['case', ['get', 'muted'], 0.75, 1],
            'text-color': [
              'case',
              ['get', 'selected'],
              mapColors.facilitySelectedLabel,
              mapColors.facilityLabel,
            ],
          }}
        />
      </GeoJSONSource>
      {props.userLocation ? (
        <GeoJSONSource
          id="user"
          data={{ type: 'Point', coordinates: props.userLocation }}
        >
          <Layer
            id="user-halo"
            type="circle"
            paint={{
              'circle-radius': 16,
              'circle-color': mapColors.userHalo,
              'circle-opacity': 0.15,
            }}
          />
          <Layer
            id="user-dot"
            type="circle"
            paint={{
              'circle-radius': 6,
              'circle-color': mapColors.user,
              'circle-stroke-color': mapColors.casing,
              'circle-stroke-width': 3,
            }}
          />
        </GeoJSONSource>
      ) : null}
      {props.destination ? (
        <GeoJSONSource
          id="destination"
          data={{ type: 'Point', coordinates: props.destination }}
        >
          <Layer
            id="destination-dot"
            type="circle"
            paint={{
              'circle-radius': 8,
              'circle-color': mapColors.destination,
              'circle-stroke-color': mapColors.casing,
              'circle-stroke-width': 3,
            }}
          />
        </GeoJSONSource>
      ) : null}
      <GeoJSONSource id="draft" data={draft}>
        <Layer
          id="draft-line"
          type="line"
          paint={{
            'line-color': mapColors.draft,
            'line-width': 5,
            'line-dasharray': [2, 1],
          }}
        />
        <Layer
          id="draft-points"
          type="circle"
          filter={['==', ['geometry-type'], 'Point']}
          paint={{
            'circle-radius': 7,
            'circle-color': mapColors.draft,
            'circle-stroke-color': mapColors.casing,
            'circle-stroke-width': 3,
          }}
        />
      </GeoJSONSource>
    </Map>
  )
}
