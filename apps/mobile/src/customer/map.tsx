import { Pressable, StyleSheet, View } from 'react-native'

import { Artwork, Text, palette, useCanvas } from './ui'

type MapMode = 'welcome' | 'home' | 'results' | 'confirmation'
const pinLayouts = {
  welcome: [
    [50, 130, 60, 'burgos'],
    [252, 104, 120, 'kalayaan'],
    [150, 196, 80, 'polaris'],
    [282, 240, 100, 'street'],
    [40, 246, 70, 'garden'],
  ],
  home: [
    [92, 150, 80, 'polaris'],
    [250, 118, 120, 'kalayaan'],
    [284, 236, 60, 'burgos'],
    [56, 290, 100, 'street'],
    [150, 200, 90, 'garden'],
  ],
  results: [
    [72, 150, 120, 'kalayaan'],
    [262, 168, 60, 'burgos'],
    [118, 262, 80, 'polaris'],
    [270, 274, 100, 'street'],
  ],
  confirmation: [],
} satisfies Record<MapMode, [number, number, number, string][]>

export function ParkingMap({
  mode,
  selected = 'polaris',
  onSelect,
}: {
  mode: MapMode
  selected?: string
  onSelect?: (id: string) => void
}) {
  const { scale } = useCanvas()
  const offset = mode === 'welcome' ? -150 : mode === 'confirmation' ? -40 : 0
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.canvas, { transform: [{ scale }] }]}>
        <View style={{ position: 'absolute', top: offset }}>
          <Artwork name="mapArt" />
        </View>
        <Text style={[styles.street, { left: 160, top: 190 + offset }]}>
          Kalayaan Ave
        </Text>
        <Text style={[styles.street, { left: 20, top: 500 + offset }]}>
          P. Burgos St
        </Text>
        <Text style={[styles.street, { left: 170, top: 710 + offset }]}>
          Polaris St
        </Text>
        {pinLayouts[mode].map(([x, y, price, id]) => {
          const active =
            mode === 'welcome'
              ? price === 80
              : mode === 'home'
                ? price === 90
                : selected === id
          const pinStyle = [
            styles.pin,
            active && styles.pinActive,
            { left: x, top: y },
          ]
          const label = (
            <Text style={[styles.pinLabel, active && styles.pinLabelActive]}>
              ₱{price}
            </Text>
          )
          return onSelect ? (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`Sample parking, ${price} pesos per hour`}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(id)}
              style={({ pressed }) => [pinStyle, pressed && { opacity: 0.6 }]}
            >
              {label}
            </Pressable>
          ) : (
            <View key={id} style={pinStyle}>
              {label}
            </View>
          )
        })}
        {mode === 'home' && (
          <>
            <View style={{ position: 'absolute', left: 167, top: 302 }}>
              <Artwork name="userHalo" />
            </View>
            <View style={{ position: 'absolute', left: 173, top: 310 }}>
              <Artwork name="userLocation" />
            </View>
          </>
        )}
        {mode === 'results' && (
          <>
            <View style={{ position: 'absolute', left: 163, top: 198 }}>
              <Artwork name="destinationRing" />
            </View>
            <View style={{ position: 'absolute', left: 167, top: 206 }}>
              <Artwork name="destination" />
            </View>
          </>
        )}
        {mode === 'confirmation' && (
          <>
            <View style={StyleSheet.absoluteFill}>
              <Artwork name="route" />
            </View>
            <View style={styles.destination}>
              <Text style={styles.destinationLabel}>P</Text>
            </View>
            <View style={{ position: 'absolute', left: 268, top: 270 }}>
              <Artwork name="userLocation" />
            </View>
          </>
        )}
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 390,
    height: 844,
    transformOrigin: 'top left',
  },
  street: {
    position: 'absolute',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
    color: palette.light,
  },
  pin: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
    boxShadow: '0px 4px 16px rgba(0,0,0,0.16)',
  },
  pinActive: {
    backgroundColor: palette.black,
    borderColor: palette.black,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pinLabel: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  pinLabelActive: {
    color: palette.white,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  destination: {
    position: 'absolute',
    top: 72,
    left: 100,
    width: 40,
    height: 40,
    borderWidth: 3,
    borderColor: palette.white,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.black,
    boxShadow: '0px 4px 16px rgba(0,0,0,0.16)',
  },
  destinationLabel: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    color: palette.white,
  },
})
