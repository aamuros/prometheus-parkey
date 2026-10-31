import Constants, { ExecutionEnvironment } from 'expo-constants'
import { lazy, Suspense } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import type { ParkingMapProps } from './map-types'
import { colors, ui } from './ui'

const NativeMap = lazy(() => import('./native-map'))

export default function ParkingMap(props: ParkingMapProps) {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return (
      <View style={styles.unavailable}>
        <Text style={ui.heading}>Parkey needs a development build</Text>
        <Text style={ui.body}>
          The interactive map uses MapLibre Native. Install the Parkey
          development build; Expo Go does not include this map renderer.
        </Text>
      </View>
    )
  }
  return (
    <Suspense
      fallback={
        <ActivityIndicator
          style={StyleSheet.absoluteFill}
          color={colors.accent}
        />
      }
    >
      <NativeMap {...props} />
    </Suspense>
  )
}
const styles = StyleSheet.create({
  unavailable: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.canvas,
  },
})
