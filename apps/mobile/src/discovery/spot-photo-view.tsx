import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { DiscoveryParking } from '@parkey/shared-types'

import { resolveSpotPhoto } from './spot-photo'
import type { SpotPhoto } from './spot-photo'
import { FigmaAsset } from './figma-assets'
import { colors, IconButton, ui } from './ui'
import { useReducedMotion } from './use-reduced-motion'

function Viewer({
  photo,
  name,
  close,
}: {
  photo: SpotPhoto
  name: string
  close: () => void
}) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const pinch = useRef(0)
  const start = useRef({ scale: 1, x: 0, y: 0 })
  const lastTap = useRef(0)
  useEffect(() => {
    if (Platform.OS !== 'web') return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [close])
  const zoom = useRef({ scale, offset })
  useEffect(() => {
    zoom.current = { scale, offset }
  }, [scale, offset])
  const [pan, setPan] = useState<ReturnType<typeof PanResponder.create>>()
  useEffect(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        start.current = { scale: zoom.current.scale, ...zoom.current.offset }
        const [a, b] = event.nativeEvent.touches
        pinch.current =
          a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0
      },
      onPanResponderMove: (event, gesture) => {
        const [a, b] = event.nativeEvent.touches
        if (a && b) {
          const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY)
          if (!pinch.current) pinch.current = distance
          setScale(
            Math.min(
              5,
              Math.max(1, (start.current.scale * distance) / pinch.current),
            ),
          )
        } else if (zoom.current.scale > 1)
          setOffset({
            x: start.current.x + gesture.dx,
            y: start.current.y + gesture.dy,
          })
      },
      onPanResponderRelease: (_, gesture) => {
        if (zoom.current.scale === 1 && gesture.dy > 80) {
          close()
          return
        }
        if (Math.abs(gesture.dx) + Math.abs(gesture.dy) < 10) {
          const now = Date.now()
          if (now - lastTap.current < 300) {
            setScale(zoom.current.scale > 1 ? 1 : 2.5)
            setOffset({ x: 0, y: 0 })
          }
          lastTap.current = now
        }
      },
    })
    setPan(responder)
  }, [close])
  const [viewedAt] = useState(() => Date.now())
  const captured = photo.captured ? new Date(photo.captured) : null
  const old = captured && viewedAt - captured.getTime() > 3 * 365.25 * 86400000
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.viewer} accessibilityViewIsModal>
        <Pressable
          accessibilityLabel="Close photo backdrop"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.picture} {...pan?.panHandlers}>
          <Animated.Image
            accessibilityLabel={`Photo near ${name}`}
            source={{ uri: photo.url }}
            resizeMode="contain"
            style={[
              ui.flex,
              {
                width: '100%',
                transform: [
                  { translateX: offset.x },
                  { translateY: offset.y },
                  { scale },
                ],
              },
            ]}
          />
        </View>
        <View style={styles.caption}>
          <Text style={ui.body}>
            {captured
              ? `Street view · captured ${captured.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}${old ? ' · Photo older than 3 years' : ''}`
              : `Photo near ${name}`}
          </Text>
          {photo.credit ? <Text style={ui.small}>{photo.credit}</Text> : null}
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              void Linking.openURL(photo.licenseUrl ?? photo.source).catch(
                () => undefined,
              )
            }}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={[ui.small, ui.link]}>
              {photo.license ?? 'View original source'}
            </Text>
          </Pressable>
        </View>
        <IconButton
          icon="close"
          label="Close photo"
          onPress={close}
          style={styles.close}
        />
      </View>
    </Modal>
  )
}
export function SpotThumbnail({
  parking,
  name,
  strip = false,
}: {
  strip?: boolean
  parking: DiscoveryParking
  name: string
}) {
  const deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [photo, setPhoto] = useState<SpotPhoto>()
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [opacity] = useState(() => new Animated.Value(0))
  const reduced = useReducedMotion()
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
      setPhoto(undefined)
      setLoading(false)
    }, 1500)
    deadline.current = timeout
    void resolveSpotPhoto(parking, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setPhoto(result)
          if (!result) {
            clearTimeout(timeout)
            setLoading(false)
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          clearTimeout(timeout)
          setLoading(false)
          setPhoto(undefined)
        }
      })
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [parking])

  return (
    <View
      style={
        strip ? { paddingHorizontal: 16, paddingTop: 16, gap: 8 } : undefined
      }
    >
      <View style={strip ? { flexDirection: 'row', gap: 8 } : undefined}>
        <Pressable
          disabled={!photo || loading}
          accessibilityRole="button"
          accessibilityLabel={
            photo
              ? `Open photo near ${name}`
              : loading
                ? 'Loading parking photo'
                : 'No parking photo available'
          }
          onPress={() => setVisible(true)}
          style={[
            styles.thumbnail,
            strip && { flex: 1, width: undefined, height: 84 },
          ]}
        >
          {!photo ? (
            <FigmaAsset
              name={strip ? 'camera-large' : 'camera'}
              size={strip ? 28 : 24}
            />
          ) : null}
          {photo ? (
            <Animated.Image
              source={{ uri: photo.url }}
              accessibilityLabel={`Photo near ${name}`}
              style={[StyleSheet.absoluteFill, { opacity }]}
              onLoad={() => {
                clearTimeout(deadline.current)
                setLoading(false)
                Animated.timing(opacity, {
                  toValue: 1,
                  duration: reduced ? 0 : 180,
                  useNativeDriver: true,
                }).start()
              }}
              onError={() => {
                setLoading(false)
                setPhoto(undefined)
              }}
            />
          ) : null}
        </Pressable>
        {strip
          ? [1, 2].map((index) => (
              <View
                key={index}
                accessibilityLabel="No additional photo available"
                style={[
                  styles.thumbnail,
                  { flex: 1, width: undefined, height: 84 },
                ]}
              >
                <FigmaAsset name="camera-large" size={28} />
              </View>
            ))
          : null}
      </View>
      {strip ? (
        <Text style={ui.small}>
          {photo
            ? 'Tap the photo for its source and capture date.'
            : loading
              ? 'Loading street photos…'
              : 'No street photos available yet.'}
        </Text>
      ) : null}
      {photo && visible ? (
        <Viewer photo={photo} name={name} close={() => setVisible(false)} />
      ) : null}
    </View>
  )
}
const styles = StyleSheet.create({
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#CFE6E9',
    experimental_backgroundImage: 'linear-gradient(#CFE6E9, #E6E2DC)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewer: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  picture: { height: '65%', width: '100%', overflow: 'hidden' },
  caption: { padding: 20 },
  close: {
    position: 'absolute',
    top: 36,
    right: 16,
    width: 44,
    height: 44,
    backgroundColor: colors.surface,
  },
})
