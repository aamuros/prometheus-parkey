import type { ReactNode } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { customerColors as c, customerStyles as s } from './customer-styles'
import { Icon } from './design-icons'

export function CustomerButton({
  children,
  onPress,
  disabled = false,
  secondary = false,
}: {
  children: string
  onPress: () => void
  disabled?: boolean
  secondary?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondaryButton,
        disabled && s.disabled,
        pressed && s.pressed,
      ]}
    >
      <Text style={[s.buttonLabel, secondary && s.secondaryLabel]}>
        {children}
      </Text>
    </Pressable>
  )
}

export function CustomerBack({
  onPress,
  label = 'Go back',
}: {
  onPress: () => void
  label?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.back, pressed && s.pressed]}
    >
      <Icon name="back" size={20} color={c.ink} />
    </Pressable>
  )
}

export function CustomerChoice({
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
        s.choice,
        selected && s.choiceSelected,
        pressed && s.pressed,
      ]}
    >
      <Text style={[s.choiceLabel, selected && s.white]}>{children}</Text>
    </Pressable>
  )
}

export function CustomerSheet({
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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.sheet}>
        <View style={s.header}>
          <CustomerBack onPress={onClose} label="Close options" />
          <Text accessibilityRole="header" style={s.heading}>
            {title}
          </Text>
        </View>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.sheetContent}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
