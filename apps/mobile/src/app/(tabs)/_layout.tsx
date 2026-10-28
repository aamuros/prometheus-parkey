import { useFocusEffect, useNavigation } from 'expo-router'
import { Tabs } from 'expo-router/js-tabs'
import { useCallback } from 'react'
import { Easing } from 'react-native'

import { useReducedMotion } from '../../customer/motion'
import { TabNavigation } from '../../customer/navigation'
import type { RootNavigation } from '../../customer/navigation'

export default function CustomerTabs() {
  const reduced = useReducedMotion()
  const navigation = useNavigation<RootNavigation>('/')
  useFocusEffect(
    useCallback(() => {
      const state = navigation.getState()
      const current = state.routes[state.index]
      if (
        current?.name === '(tabs)' &&
        state.index > 0 &&
        state.routes
          .slice(0, state.index)
          .every((route) => route.name === 'index' || route.name === 'phone')
      ) {
        // SDK 58 requires complete state. Keep the mounted tab route and its key
        // while removing onboarding underneath it, without another screen transition.
        navigation.reset({ ...state, index: 0, routes: [current] })
      }
    }, [navigation]),
  )
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        animation: reduced ? 'none' : 'shift',
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: reduced ? 0 : 320,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
          },
        },
        lazy: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: '#FFFFFF' },
      }}
      tabBar={TabNavigation}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  )
}
