import type { ReactNode } from 'react'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

import { colors } from './palette'

export { colors } from './palette'

export const detailsPeekHeight = 420

const paths = {
  star: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2 1.2-6.8-5-4.9 6.9-1L12 2Z',
  search: 'm21 21-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
  locate: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'm5 12 14 0m-6-6 6 6-6 6',
  chevron: 'm6 14 6-6 6 6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z',
  layers: 'm12 3 10 6-10 6L2 9l10-6ZM2 14l10 6 10-6',
  street: 'M8 2 5 22M16 2l3 20M12 3v3m0 4v4m0 4v3',
  camera: 'M4 6h4l2-3h4l2 3h4v15H4V6ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  check: 'm5 12 4 4L20 5',
  back: 'm14 5-7 7 7 7',
  undo: 'M9 4 3 10l6 6M3 10h11a7 7 0 0 1 7 7',
  info: 'M12 11v6M12 7h.01',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
}
export type IconName = keyof typeof paths

export function Icon({
  name,
  color = colors.ink,
  size = 22,
}: {
  name: IconName
  color?: string
  size?: number
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'info' ? <Circle cx={12} cy={12} r={10} /> : null}
      <Path d={paths[name]} />
    </Svg>
  )
}

export function IconButton({
  icon,
  label,
  onPress,
  style,
  disabled = false,
}: {
  icon: IconName
  label: string
  onPress: () => void
  style?: StyleProp<ViewStyle>
  disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        ui.iconButton,
        style,
        pressed && ui.pressed,
        disabled && ui.disabled,
        focused && ui.focused,
      ]}
    >
      <Icon name={icon} color={disabled ? colors.disabled : colors.action} />
    </Pressable>
  )
}

export function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
  icon,
  testID,
}: {
  children: ReactNode
  onPress: () => void
  secondary?: boolean
  disabled?: boolean
  icon?: IconName
  testID?: string
}) {
  const [focused, setFocused] = useState(false)
  const foreground = disabled
    ? colors.disabled
    : secondary
      ? colors.brandDeep
      : colors.surface
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        ui.button,
        secondary && ui.secondary,
        pressed && (secondary ? ui.secondaryPressed : ui.buttonPressed),
        disabled && ui.disabled,
        focused && ui.focused,
      ]}
    >
      <Text style={[ui.buttonText, { color: foreground }]}>{children}</Text>
      {icon ? <Icon name={icon} color={foreground} size={19} /> : null}
    </Pressable>
  )
}

export function Choice({
  children,
  selected,
  onPress,
}: {
  children: ReactNode
  selected: boolean
  onPress: () => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        ui.choice,
        selected && ui.choiceSelected,
        pressed && (selected ? ui.secondaryPressed : ui.pressed),
        focused && ui.focused,
      ]}
    >
      <Text style={[ui.choiceText, selected && { color: colors.brandDeep }]}>
        {children}
      </Text>
    </Pressable>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <View style={ui.notice}>
      <Icon name="info" color={colors.action} size={18} />
      <Text style={[ui.small, { flex: 1 }]}>{children}</Text>
    </View>
  )
}

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  muted: { fontSize: 14, lineHeight: 20, color: colors.muted },
  small: { fontSize: 12, lineHeight: 18, color: colors.muted },
  link: { color: colors.brandDeep, fontWeight: '500' },
  error: { color: colors.error },
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.7,
    color: colors.ink,
  },
  heading: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
    color: colors.ink,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.muted,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `inset 0px 0px 0px 1px ${colors.border}`,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: colors.action,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.surface,
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: colors.surface,
    boxShadow: `inset 0px 0px 0px 1px ${colors.brand}`,
  },
  choice: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 17,
    borderRadius: 14,
    backgroundColor: colors.surface,
    boxShadow: `inset 0px 0px 0px 1px ${colors.border}`,
  },
  choiceSelected: {
    backgroundColor: colors.selected,
    boxShadow: `inset 0px 0px 0px 1px ${colors.brand}`,
  },
  choiceText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.ink,
  },
  pressed: { backgroundColor: colors.soft },
  buttonPressed: { backgroundColor: colors.actionPressed },
  secondaryPressed: { backgroundColor: colors.selectedPressed },
  disabled: {
    backgroundColor: colors.disabledSurface,
    boxShadow: `inset 0px 0px 0px 1px ${colors.border}`,
  },
  focused: {
    outlineColor: colors.brandDeep,
    outlineWidth: 2,
    outlineOffset: 2,
  },
  shadow: {
    boxShadow: `0px 3px 16px ${colors.shadow}, inset 0px 0px 0px 1px ${colors.border}`,
  },
  notice: {
    flexDirection: 'row',
    gap: 9,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.canvas,
    alignItems: 'flex-start',
  },
  input: {
    backgroundColor: colors.surface,
    boxShadow: `inset 0px 0px 0px 1px ${colors.border}`,
    borderRadius: 13,
    padding: 14,
    minHeight: 48,
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
})
