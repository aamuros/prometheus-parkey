import type { ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, IconButton, ui } from './ui'

export function ModalSheet({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close panel"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.modal,
            { paddingBottom: Math.max(insets.bottom, 20), maxHeight: '90%' },
          ]}
        >
          <View
            style={[
              ui.row,
              { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 10 },
            ]}
          >
            <Text accessibilityRole="header" style={[ui.heading, ui.flex]}>
              {title}
            </Text>
            <IconButton
              icon="close"
              label={`Close ${title}`}
              onPress={onClose}
            />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
})
