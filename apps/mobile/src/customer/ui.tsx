import { router, useSegments } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'
import type { StyleProp, TextProps, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Artwork } from './artwork'
import type { DesignAssetName } from './assets'
import {
  useMotionValue,
  usePageMotion,
  usePressMotion,
  useReducedMotion,
} from './motion'
import { Text as Typography } from '../components/typography'

export { Artwork } from './artwork'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export const palette = {
  ink: '#111111',
  black: '#000000',
  white: '#FFFFFF',
  secondary: '#F3F3F3',
  tertiary: '#E8E8E8',
  muted: '#5E5E5E',
  light: '#8F8F8F',
  line: '#E6E6E6',
  green: '#05944F',
  greenBg: '#E3F4EB',
  amber: '#D66A00',
  amberBg: '#FFF0E3',
  red: '#E11900',
}
export function Text(props: TextProps) {
  return <Typography {...props} typeface="inter" />
}
export function useCanvas() {
  const dimensions = useWindowDimensions()
  const safe = useSafeAreaInsets()
  const width = Math.min(dimensions.width, 520)
  return {
    width,
    height: dimensions.height,
    scale: width / 390,
    top: Platform.OS === 'web' ? 54 : safe.top,
    bottom: Platform.OS === 'web' ? 34 : safe.bottom,
  }
}

export function Screen({ children }: { children: ReactNode }) {
  const { bottom } = useCanvas()
  const segments = useSegments()
  const motion = usePageMotion(
    Platform.OS === 'web' && segments[0] !== '(tabs)',
  )
  return (
    <View style={ui.screen}>
      <Animated.View style={[ui.flex, motion]}>{children}</Animated.View>
      {Platform.OS === 'web' && (
        <>
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            style={ui.status}
          >
            <Text style={ui.statusTime}>9:41</Text>
            <Artwork name="statusIcons" />
          </View>
          <View
            pointerEvents="none"
            style={[ui.homeIndicator, { height: bottom }]}
          >
            <View style={ui.homeBar} />
          </View>
        </>
      )}
    </View>
  )
}

export function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
  style,
}: {
  children: string
  onPress: () => void
  secondary?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const motion = usePressMotion()
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress()}
      onPressIn={motion.onPressIn}
      onPressOut={motion.onPressOut}
      style={[
        ui.button,
        secondary && ui.buttonSecondary,
        disabled && ui.disabled,
        style,
        motion.style,
      ]}
    >
      <Text style={[ui.buttonText, secondary && ui.ink]}>{children}</Text>
    </AnimatedPressable>
  )
}
export function RoundButton({
  icon = 'iconBack',
  label,
  onPress,
  selected = false,
}: {
  icon?: DesignAssetName
  label: string
  onPress: () => void
  selected?: boolean
}) {
  const motion = usePressMotion()
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => onPress()}
      onPressIn={motion.onPressIn}
      onPressOut={motion.onPressOut}
      style={[ui.round, selected && ui.selectedRound, motion.style]}
    >
      <Artwork name={icon} />
    </AnimatedPressable>
  )
}
export function Back({ onPress }: { onPress?: () => void }) {
  return (
    <RoundButton
      label="Go back"
      onPress={
        onPress ??
        (() => (router.canGoBack() ? router.back() : router.navigate('/home')))
      }
    />
  )
}
export function Chip({
  children,
  selected,
  onPress,
}: {
  children: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        ui.chip,
        selected && ui.chipSelected,
        pressed && ui.pressed,
      ]}
    >
      <Text style={[ui.chipLabel, selected && ui.white]}>{children}</Text>
    </Pressable>
  )
}
export function Handle() {
  return <View style={ui.handle} />
}
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: {
  icon: DesignAssetName
  title: string
  subtitle: string
  onPress: () => void
  danger?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [ui.listRow, pressed && ui.pressed]}
    >
      <View style={ui.listIcon}>
        <Artwork name={icon} />
      </View>
      <View style={ui.flex}>
        <Text style={[ui.medium, danger && ui.danger]}>{title}</Text>
        <Text style={ui.bodyMuted}>{subtitle}</Text>
      </View>
      <Artwork name="iconChevron" />
    </Pressable>
  )
}
export function PreviewNote({ compact = false }: { compact?: boolean }) {
  return (
    <Text style={[ui.caption, ui.previewNote]}>
      {compact
        ? 'Design preview · Sample data'
        : 'Design preview only. No real accounts, reservations, or payments.'}
    </Text>
  )
}
type CloseSheet = (afterClose?: () => void) => void
type SheetChildren = ReactNode | ((close: CloseSheet) => ReactNode)

function SheetBody({
  children,
  close,
}: {
  children: SheetChildren
  close: CloseSheet
}) {
  return typeof children === 'function' ? children(close) : children
}

export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string
  children: SheetChildren
  onClose: () => void
}) {
  const { top, bottom, height } = useCanvas()
  const reduced = useReducedMotion()
  const progress = useMotionValue(0)
  const [distance] = useState(() => Dimensions.get('screen').height)
  const closing = useRef(false)
  useEffect(() => {
    if (closing.current) return
    if (reduced) {
      progress.setValue(1)
      return
    }
    const animation = Animated.spring(progress, {
      toValue: 1,
      stiffness: 280,
      damping: 34,
      mass: 1,
      useNativeDriver: Platform.OS !== 'web',
    })
    animation.start()
    return () => animation.stop()
  }, [progress, reduced])
  const close = useCallback(
    (afterClose?: () => void) => {
      if (closing.current) return
      closing.current = true
      Keyboard.dismiss()
      const finish = () => {
        onClose()
        afterClose?.()
      }
      if (reduced) {
        progress.setValue(0)
        finish()
        return
      }
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished) finish()
      })
    },
    [onClose, progress, reduced],
  )
  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={() => close()}
    >
      <View style={ui.sheetOverlay}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000000',
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.28],
              }),
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss options"
          style={StyleSheet.absoluteFill}
          onPress={() => close()}
        />
        <KeyboardAvoidingView
          pointerEvents="box-none"
          style={ui.sheetAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View
            accessibilityViewIsModal
            style={[
              ui.sheetPage,
              {
                maxHeight: Math.max(240, height - top - 16),
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [distance, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={ui.sheetHeader}>
              <Handle />
              <View style={ui.between}>
                <Text accessibilityRole="header" style={ui.heading}>
                  {title}
                </Text>
                <RoundButton
                  icon="iconClose"
                  label="Close options"
                  onPress={() => close()}
                />
              </View>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                ui.sheetContent,
                { paddingBottom: Math.max(bottom, 16) + 24 },
              ]}
            >
              <SheetBody close={close}>{children}</SheetBody>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
export const ui = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: palette.white,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  column: { gap: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    fontWeight: '700',
    color: palette.ink,
  },
  title24: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    fontWeight: '700',
    color: palette.ink,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    fontWeight: '600',
    color: palette.ink,
  },
  subheading: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.1,
    fontWeight: '600',
    color: palette.ink,
  },
  body: { fontSize: 16, lineHeight: 24, color: palette.ink },
  bodyMuted: { fontSize: 14, lineHeight: 20, color: palette.muted },
  medium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: palette.ink,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: palette.muted,
  },
  white: { color: palette.white },
  ink: { color: palette.ink },
  green: { color: palette.green },
  danger: { color: palette.red },
  muted: { color: palette.muted },
  button: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: palette.black,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: { backgroundColor: palette.secondary },
  buttonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: palette.white,
    textAlign: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.82 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 16px rgba(0,0,0,0.16)',
  },
  selectedRound: { backgroundColor: '#E3F4EB' },
  chip: {
    backgroundColor: palette.secondary,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: palette.black },
  chipLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: palette.ink,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    minHeight: 66,
  },
  listIcon: {
    width: 44,
    height: 44,
    backgroundColor: palette.secondary,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    height: 5,
    width: 40,
    borderRadius: 3,
    backgroundColor: palette.tertiary,
    alignSelf: 'center',
    marginBottom: 16,
  },
  panel: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    boxShadow: '0px -6px 24px rgba(0,0,0,0.12)',
  },
  panelContent: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  pageContent: { paddingHorizontal: 24, gap: 16 },
  input: {
    fontFamily: 'InterMedium',
    minHeight: 56,
    backgroundColor: palette.secondary,
    borderRadius: 16,
    color: palette.ink,
    fontSize: 16,
    paddingHorizontal: 16,
  },
  previewNote: { textAlign: 'center', color: palette.light },
  nav: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.white,
    borderRadius: 100,
    padding: 6,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.08), 0px 10px 30px rgba(0,0,0,0.16)',
  },
  navItem: {
    width: 88,
    height: 52,
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  navSelected: {
    backgroundColor: palette.white,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.12)',
  },
  navLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
    color: palette.muted,
  },
  sheetOverlay: { flex: 1 },
  sheetAvoiding: { flex: 1, justifyContent: 'flex-end' },
  sheetPage: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: palette.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingTop: 12,
  },
  sheetHeader: { paddingHorizontal: 24, paddingBottom: 12 },
  sheetContent: { paddingTop: 12, paddingHorizontal: 24, gap: 16 },
  footer: {
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingHorizontal: 24,
    paddingTop: 15,
  },
  status: {
    position: 'absolute',
    top: 0,
    left: 34,
    right: 34,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTime: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: palette.ink,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  homeBar: {
    width: 134,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.black,
  },
})
