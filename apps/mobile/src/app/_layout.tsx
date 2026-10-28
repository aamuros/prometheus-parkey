import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import medium from '../../assets/fonts/PlusJakartaSans-Medium.ttf'
import semiBold from '../../assets/fonts/PlusJakartaSans-SemiBold.ttf'
import bold from '../../assets/fonts/PlusJakartaSans-Bold.ttf'
import extraBold from '../../assets/fonts/PlusJakartaSans-ExtraBold.ttf'
import interRegular from '../../assets/fonts/Inter-Regular.ttf'
import interMedium from '../../assets/fonts/Inter-Medium.ttf'
import interSemiBold from '../../assets/fonts/Inter-SemiBold.ttf'
import interBold from '../../assets/fonts/Inter-Bold.ttf'
import { PreviewProvider } from '../customer/context'
import { preloadArtwork } from '../customer/artwork'
import { MotionProvider, useReducedMotion } from '../customer/motion'

function CustomerStack() {
  const reduced = useReducedMotion()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reduced ? 'none' : 'slide_from_right',
        animationDuration: 320,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ animation: reduced ? 'none' : 'fade' }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{ animation: reduced ? 'none' : 'fade' }}
      />
      <Stack.Screen
        name="search"
        options={{ animation: reduced ? 'none' : 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="confirmation/[id]"
        options={{
          animation: reduced ? 'none' : 'fade_from_bottom',
          gestureEnabled: false,
        }}
      />
    </Stack>
  )
}

export default function RootLayout() {
  useEffect(() => {
    void preloadArtwork().catch(() =>
      console.warn('Some Parkey artwork could not be preloaded'),
    )
  }, [])
  const [loaded, error] = useFonts({
    JakartaMedium: medium,
    JakartaSemiBold: semiBold,
    JakartaBold: bold,
    JakartaExtraBold: extraBold,
    InterRegular: interRegular,
    InterMedium: interMedium,
    InterSemiBold: interSemiBold,
    InterBold: interBold,
  })
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator
          color="#000000"
          accessibilityLabel="Loading Parkey"
        />
      </View>
    )
  return (
    <SafeAreaProvider>
      <MotionProvider>
        <PreviewProvider>
          <StatusBar style="dark" />
          <CustomerStack />
        </PreviewProvider>
      </MotionProvider>
    </SafeAreaProvider>
  )
}
