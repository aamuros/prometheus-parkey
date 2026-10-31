import { useEffect } from 'react'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { initializeTelemetry } from '../discovery/telemetry'
import { fontSources } from '../discovery/typography'

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontSources)
  useEffect(initializeTelemetry, [])

  if (!fontsLoaded && !fontError) return null

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </SafeAreaProvider>
  )
}
