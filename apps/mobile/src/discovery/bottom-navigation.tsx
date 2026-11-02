import { Pressable, StyleSheet, Text, View } from 'react-native'

import { FigmaAsset } from './figma-assets'
import type { FigmaAssetName } from './figma-assets'
import { colors } from './palette'
import { fonts } from './typography'
import { ui } from './ui'

export type DiscoveryTab = 'map' | 'saved' | 'add' | 'you' | 'more'
export const TAB_BAR_HEIGHT = 58
const tabs: {
  id: DiscoveryTab
  label: string
  icon: FigmaAssetName
  active?: FigmaAssetName
}[] = [
  { id: 'map', label: 'Map', icon: 'map', active: 'map-active' },
  { id: 'saved', label: 'Saved', icon: 'saved', active: 'saved-active' },
  { id: 'add', label: 'Add', icon: 'plus' },
  { id: 'you', label: 'You', icon: 'user', active: 'user-active' },
  { id: 'more', label: 'More', icon: 'more' },
]

export function BottomNavigation({
  selected,
  bottom,
  onHeightChange,
  onSelect,
}: {
  selected: DiscoveryTab
  bottom: number
  onHeightChange?: (height: number) => void
  onSelect: (tab: DiscoveryTab) => void
}) {
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
      style={[styles.bar, { paddingBottom: Math.max(bottom, 16) }]}
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          accessibilityRole="tab"
          accessibilityLabel={tab.label}
          aria-selected={selected === tab.id}
          onPress={() => onSelect(tab.id)}
          style={({ pressed }) => [styles.tab, pressed && { opacity: 0.65 }]}
        >
          {tab.id === 'add' ? (
            <View style={[styles.add, ui.shadow]}>
              <FigmaAsset name="plus" size={28} />
            </View>
          ) : (
            <FigmaAsset
              name={selected === tab.id ? (tab.active ?? tab.icon) : tab.icon}
              size={26}
            />
          )}
          <Text
            style={[
              styles.label,
              tab.id === 'add' && { marginTop: 30 },
              (selected === tab.id || tab.id === 'add') && {
                color: colors.brand,
              },
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 620,
    marginHorizontal: 'auto',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 8,
    boxShadow: '0px -6px 24px rgba(30,27,56,0.12)',
  },
  tab: { flex: 1, minHeight: 46, alignItems: 'center', gap: 4 },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.disabled,
  },
  add: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 5,
    borderColor: colors.surface,
    backgroundColor: colors.brand,
    position: 'absolute',
    top: -38,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
