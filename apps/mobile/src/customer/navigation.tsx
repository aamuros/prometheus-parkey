import { router } from 'expo-router'
import type { NativeStackNavigationProp } from 'expo-router'
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { useEffect, useState } from 'react'
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'

import { useMotionValue, useReducedMotion } from './motion'
import { Artwork, Text, ui, useCanvas } from './ui'

const tabs = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    selectedIcon: 'homeSelected',
    href: '/home',
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: 'calendar',
    selectedIcon: 'calendarSelected',
    href: '/bookings',
  },
  {
    id: 'account',
    label: 'Account',
    icon: 'user',
    selectedIcon: 'userSelected',
    href: '/account',
  },
] as const
export type Tab = (typeof tabs)[number]['id']
export type RootNavigation = NativeStackNavigationProp<{
  index: undefined
  phone: undefined
  '(tabs)': undefined
  search: { query?: string } | undefined
  'parking/[id]': { id: string }
  'reserve/[id]': { id: string }
  'confirmation/[id]': { id: string; navigate?: string }
}>

function NavigationPill({
  active,
  onSelect,
  onLongPress,
}: {
  active: string
  onSelect: (tab: Tab) => void
  onLongPress?: (tab: Tab) => void
}) {
  const { bottom } = useCanvas()
  const reduced = useReducedMotion()
  const [keyboardVisible, setKeyboardVisible] = useState(() =>
    Keyboard.isVisible(),
  )
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true),
    )
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false),
    )
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === active),
  )
  const position = useMotionValue(index)
  useEffect(() => {
    if (reduced) {
      position.setValue(index)
      return
    }
    const animation = Animated.spring(position, {
      toValue: index,
      stiffness: 360,
      damping: 28,
      mass: 0.7,
      useNativeDriver: Platform.OS !== 'web',
    })
    animation.start()
    return () => animation.stop()
  }, [index, reduced, position])
  if (keyboardVisible) return null
  return (
    <View accessibilityRole="tablist" style={[ui.nav, { bottom: bottom + 12 }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          ui.navSelected,
          styles.indicator,
          {
            transform: [
              {
                translateX: position.interpolate({
                  inputRange: [0, 2],
                  outputRange: [0, 184],
                }),
              },
            ],
          },
        ]}
      />
      {tabs.map((tab, tabIndex) => (
        <Pressable
          key={tab.id}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === tab.id }}
          onPress={() => {
            Keyboard.dismiss()
            onSelect(tab.id)
          }}
          onLongPress={() => onLongPress?.(tab.id)}
          style={({ pressed }) => [ui.navItem, pressed && ui.pressed]}
        >
          <Animated.View
            style={{
              transform: [
                {
                  translateY: position.interpolate({
                    inputRange: [tabIndex - 1, tabIndex, tabIndex + 1],
                    outputRange: [0, reduced ? 0 : -3, 0],
                    extrapolate: 'clamp',
                  }),
                },
                {
                  scale: position.interpolate({
                    inputRange: [tabIndex - 1, tabIndex, tabIndex + 1],
                    outputRange: [1, reduced ? 1 : 1.1, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}
          >
            <Artwork name={active === tab.id ? tab.selectedIcon : tab.icon} />
          </Animated.View>
          <Text style={[ui.navLabel, active === tab.id && ui.ink]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

export function TabNavigation({
  state,
  emitter,
  navigateToTab,
}: BottomTabBarProps) {
  const active = state.routes[state.index]?.name ?? 'home'
  return (
    <NavigationPill
      active={active}
      onSelect={(tab) => {
        const route = state.routes.find((item) => item.name === tab)
        if (!route) return
        const event = emitter.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        })
        if (active !== tab && !event.defaultPrevented) navigateToTab(route.key)
      }}
      onLongPress={(tab) => {
        const route = state.routes.find((item) => item.name === tab)
        if (route) emitter.emit({ type: 'tabLongPress', target: route.key })
      }}
    />
  )
}

// Dismiss the checkout stack to the existing tabs, retaining their state.
export function FlowNavigation() {
  return (
    <NavigationPill
      active="bookings"
      onSelect={(tab) => {
        const destination = tabs.find((item) => item.id === tab)
        if (destination) router.dismissTo(destination.href)
      }}
    />
  )
}
const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 88,
    height: 52,
    borderRadius: 100,
  },
})
