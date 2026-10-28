import type { ReactNode } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Icon } from './design-icons'
import type { IconName } from './design-icons'
import { Text } from './typography'

export const colors = {
  ink: '#1D1B3A',
  purple: '#5B3DF5',
  deepPurple: '#3A24B5',
  yellow: '#FFC83D',
  lavender: '#F5F2FF',
  mint: '#DDF4E8',
  background: '#FFFFFF',
  muted: '#5C5A7A',
  line: '#E3DAF5',
  white: '#FFFFFF',
}

export function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
  label,
  purple = false,
}: {
  children: string
  onPress: () => void
  secondary?: boolean
  disabled?: boolean
  label?: string
  purple?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? children}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        purple && ui.purple,
        secondary && ui.secondary,
        disabled && ui.disabled,
        pressed && ui.pressed,
      ]}
    >
      <Text style={[ui.buttonText, purple && !secondary && ui.whiteText]}>
        {children}
      </Text>
    </Pressable>
  )
}
export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
}: {
  name: IconName
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.iconButton,
        disabled && ui.disabled,
        pressed && ui.pressed,
      ]}
    >
      <Icon name={name} />
    </Pressable>
  )
}
export function Choice({
  children,
  selected,
  onPress,
  segmented = false,
}: {
  children: string
  selected: boolean
  onPress: () => void
  segmented?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        ui.choice,
        segmented && ui.segment,
        selected && (segmented ? ui.segmentSelected : ui.choiceSelected),
        pressed && ui.pressed,
      ]}
    >
      <Text style={[ui.choiceText, selected && !segmented && ui.whiteText]}>
        {children}
      </Text>
    </Pressable>
  )
}
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={ui.sheet}>
        <View style={ui.sheetHeader}>
          <Text accessibilityRole="header" style={ui.sheetTitle}>
            {title}
          </Text>
          <IconButton name="close" label="Close details" onPress={onClose} />
        </View>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={ui.sheetContent}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={ui.detail}>
      <Text style={ui.detailLabel}>{label}</Text>
      <Text style={ui.detailValue}>{value}</Text>
    </View>
  )
}
export function Empty({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <View style={ui.empty}>
      <Text accessibilityRole="header" style={ui.emptyTitle}>
        {title}
      </Text>
      <Text style={ui.emptyDescription}>{description}</Text>
    </View>
  )
}

export const ui = StyleSheet.create({
  button: {
    minHeight: 58,
    backgroundColor: colors.yellow,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 18,
    boxShadow: '0px 5px 0px #1D1B3A',
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 5,
  },
  buttonText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  purple: { backgroundColor: colors.purple },
  whiteText: { color: colors.white },
  secondary: { backgroundColor: colors.white },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ translateY: 2 }] },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 3px 0px #1D1B3A',
  },
  choice: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    boxShadow: '0px 2px 0px #1D1B3A',
  },
  choiceSelected: { backgroundColor: colors.ink },
  choiceText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  segment: {
    flex: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingHorizontal: 5,
    boxShadow: 'none',
  },
  segmentSelected: {
    backgroundColor: colors.white,
    borderColor: colors.ink,
    boxShadow: '0px 2px 0px #1D1B3A',
  },
  sheet: { flex: 1, backgroundColor: colors.white },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetTitle: { fontSize: 22, color: colors.ink, fontWeight: '800', flex: 1 },
  sheetContent: { padding: 16, paddingBottom: 35, gap: 4 },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  detailLabel: { color: colors.muted, fontSize: 13, flex: 1 },
  detailValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    flex: 1.5,
    textAlign: 'right',
    lineHeight: 21,
  },
  empty: { paddingVertical: 34, alignItems: 'center', gap: 10 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 300,
  },
})
