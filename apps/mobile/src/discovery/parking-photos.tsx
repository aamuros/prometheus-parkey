import type { ParkingPhoto } from '@parkey/shared-types'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { photoPage } from './photos'
import { colors, Icon, IconButton, ui } from './ui'
import { useReducedMotion } from './use-reduced-motion'

export function ParkingImage({
  photo,
  thumbnail = false,
}: {
  photo: ParkingPhoto | undefined
  thumbnail?: boolean
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [opacity] = useState(() => new Animated.Value(0))
  const reduced = useReducedMotion()
  useEffect(() => () => opacity.stopAnimation(), [opacity])
  return (
    <View style={[styles.image, thumbnail ? styles.thumbnail : styles.full]}>
      {!photo || status === 'error' ? (
        <View
          accessibilityLabel={
            photo ? 'Parking photo unavailable' : 'No parking photos yet'
          }
          style={styles.placeholder}
        >
          <Icon
            name="camera"
            color={colors.disabled}
            size={thumbnail ? 22 : 32}
          />
          <Text style={ui.small}>
            {photo ? 'Photo unavailable' : 'No photos yet'}
          </Text>
        </View>
      ) : (
        <>
          <Animated.Image
            accessibilityLabel={photo.caption}
            source={{ uri: thumbnail ? photo.thumbnailUrl : photo.imageUrl }}
            resizeMode="cover"
            fadeDuration={0}
            onLoad={() => {
              setStatus('ready')
              Animated.timing(opacity, {
                toValue: 1,
                duration: reduced ? 0 : 160,
                useNativeDriver: true,
              }).start()
            }}
            onError={() => setStatus('error')}
            style={[StyleSheet.absoluteFill, { opacity }]}
          />
          {status === 'loading' ? (
            <ActivityIndicator
              accessibilityLabel="Loading parking photo"
              color={colors.action}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </>
      )}
    </View>
  )
}

export function ParkingGallery({ photos }: { photos: ParkingPhoto[] }) {
  const [width, setWidth] = useState(0)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const list = useRef<FlatList<ParkingPhoto>>(null)
  const reduced = useReducedMotion()
  const current = photos[index] ?? photos[0]
  function move(next: number) {
    if (next < 0 || next >= photos.length || width <= 0) return
    setIndex(next)
    list.current?.scrollToOffset({ offset: next * width, animated: !reduced })
  }
  return (
    <View
      style={{ gap: 10 }}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width
        if (next !== width) {
          setWidth(next)
          setIndex(0)
          list.current?.scrollToOffset({ offset: 0, animated: false })
        }
      }}
    >
      {current ? (
        <>
          {width > 0 ? (
            <FlatList
              ref={list}
              style={{ height: (width * 9) / 16, flexGrow: 0, flexShrink: 0 }}
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(photo) => photo.id}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              getItemLayout={(_, itemIndex) => ({
                length: width,
                offset: width * itemIndex,
                index: itemIndex,
              })}
              onScroll={(event) =>
                setIndex(
                  photoPage(
                    event.nativeEvent.contentOffset.x,
                    width,
                    photos.length,
                  ),
                )
              }
              scrollEventThrottle={32}
              renderItem={({ item: photo }) => (
                <View style={{ width }}>
                  <ParkingImage key={photo.imageUrl} photo={photo} />
                </View>
              )}
            />
          ) : null}
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <IconButton
              icon="back"
              label="Previous parking photo"
              disabled={index === 0}
              onPress={() => move(index - 1)}
            />
            <Text accessibilityLiveRegion="polite" style={ui.small}>
              Photo {index + 1} of {photos.length}
            </Text>
            <IconButton
              icon="arrow"
              label="Next parking photo"
              disabled={index >= photos.length - 1}
              onPress={() => move(index + 1)}
            />
          </View>
          <Text style={ui.body}>{current.caption}</Text>
          <Pressable
            accessibilityRole="link"
            style={styles.credit}
            onPress={() => {
              void Linking.openURL(current.sourceUrl).catch(() =>
                setError('The photo source could not be opened.'),
              )
            }}
          >
            <Text style={[ui.small, ui.link]}>
              {current.credit} · {current.license} ↗
            </Text>
          </Pressable>
          {error ? (
            <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
              {error}
            </Text>
          ) : null}
        </>
      ) : (
        <ParkingImage photo={undefined} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.canvas,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: { width: 92, height: 96 },
  full: { width: '100%', aspectRatio: 16 / 9 },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
  },
  credit: { minHeight: 44, justifyContent: 'center' },
})
