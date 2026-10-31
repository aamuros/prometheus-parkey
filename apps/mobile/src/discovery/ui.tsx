import type { ComponentRef, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

import { colors } from './palette'
import { parkingPin } from './parking-pin'
import { fonts } from './typography'

export { colors } from './palette'

export const detailsPeekHeight = 420

const paths = {
  clock: 'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  fees: 'M4 3h16v18l-4-2-4 2-4-2-4 2V3ZM8 8h8M8 12h6',
  access: 'M5 21V3h14v18M9 21V7h6v14M13 14h.01M3 21h18',
  star: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2 1.2-6.8-5-4.9 6.9-1L12 2Z',
  search: 'm21 21-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
  locate:
    'M12 2v3m0 14v3M2 12h3m14 0h3M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'm5 12 14 0m-6-6 6 6-6 6',
  chevron: 'm6 14 6-6 6 6',
  chevronRight: 'm9 5 7 7-7 7',
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

export function ParkingPinIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 44) / 36} viewBox="0 0 36 44">
      <Path
        d={parkingPin.outline}
        fill={colors.surface}
        stroke={colors.brand}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d={parkingPin.letter} fill={colors.brand} fillRule="evenodd" />
    </Svg>
  )
}

export function Icon({
  name,
  color = colors.ink,
  size = 22,
  filled = false,
}: {
  name: IconName
  color?: string
  size?: number
  filled?: boolean
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'info' ? <Circle cx={12} cy={12} r={10} /> : null}
      {name === 'pin' ? <Circle cx={12} cy={10} r={2.5} /> : null}
      <Path d={paths[name]} fill={name === 'star' && filled ? color : 'none'} />
    </Svg>
  )
}

export function IconButton({
  icon,
  label,
  onPress,
  style,
  disabled = false,
  selected = false,
  color,
}: {
  icon: IconName
  label: string
  onPress: () => void
  style?: StyleProp<ViewStyle>
  disabled?: boolean
  selected?: boolean
  color?: string
}) {
  const [focused, setFocused] = useState(false)
  const target = useRef<ComponentRef<typeof View>>(null)
  useEffect(() => {
    if (Platform.OS === 'web' && target.current instanceof HTMLElement)
      target.current.title = label
  }, [label])
  return (
    <Pressable
      ref={target}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      aria-pressed={icon === 'star' ? selected : undefined}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        ui.iconButton,
        style,
        selected && ui.choiceSelected,
        pressed && (selected ? ui.secondaryPressed : ui.iconPressed),
        disabled && ui.disabled,
        focused && ui.focused,
      ]}
    >
      <Icon
        name={icon}
        filled={selected}
        color={
          disabled
            ? colors.disabled
            : selected
              ? colors.brandDeep
              : (color ?? colors.action)
        }
      />
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
      aria-pressed={selected}
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
      <Text style={[ui.choiceText, selected && ui.choiceTextSelected]}>
        {children}
      </Text>
    </Pressable>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <View style={ui.notice}>
      <Icon name="info" color={colors.action} size={18} />
      <Text style={[ui.muted, ui.flex]}>{children}</Text>
    </View>
  )
}

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  muted: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  small: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  link: { color: colors.brandDeep, fontFamily: fonts.semibold },
  error: { color: colors.error },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.63,
    color: colors.ink,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  heading: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: colors.action,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    fontFamily: fonts.semibold,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 24,
    color: colors.surface,
    textAlign: 'center',
  },
  secondary: {
    backgroundColor: colors.selected,
  },
  choice: {
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.surface,
    boxShadow: `inset 0px 0px 0px 1px ${colors.border}`,
  },
  choiceSelected: {
    backgroundColor: colors.selected,
    boxShadow: 'none',
  },
  choiceText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  choiceTextSelected: { color: colors.brandDeep },
  pressed: { backgroundColor: colors.soft },
  iconPressed: { backgroundColor: colors.disabledSurface },
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
    boxShadow: `0px 4px 24px ${colors.shadow}`,
  },
  notice: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    alignItems: 'flex-start',
  },
  input: {
    fontFamily: fonts.regular,
    backgroundColor: colors.surface,
    boxShadow: `inset 0px 0px 0px 1px ${colors.border}`,
    borderRadius: 12,
    padding: 16,
    minHeight: 56,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
})

export function UndoToast({
  message,
  onUndo,
}: {
  message: string
  onUndo: () => void
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.ink,
        paddingHorizontal: 16,
        borderRadius: 16,
      }}
    >
      <Text style={[ui.body, ui.flex, { color: colors.surface }]}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Undo last change"
        onPress={onUndo}
        style={({ pressed }) => [
          { minHeight: 44, minWidth: 44, justifyContent: 'center' },
          pressed && { backgroundColor: colors.muted },
        ]}
      >
        <Text style={[ui.heading, { color: colors.surface }]}>Undo</Text>
      </Pressable>
    </View>
  )
}
export function LoadingRows() {
  return (
    <View
      accessibilityLabel="Loading parking"
      accessibilityRole="progressbar"
      style={{ gap: 16, padding: 16 }}
    >
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: 8, paddingVertical: 8 }}>
          <View
            style={{
              height: 16,
              width: '65%',
              borderRadius: 8,
              backgroundColor: colors.disabledSurface,
            }}
          />
          <View
            style={{
              height: 12,
              width: '40%',
              borderRadius: 6,
              backgroundColor: colors.line,
            }}
          />
        </View>
      ))}
    </View>
  )
}
