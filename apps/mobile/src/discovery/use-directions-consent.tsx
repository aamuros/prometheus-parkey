import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { createRoutingConsent } from './routing-consent'
import { Button, colors, ui } from './ui'

const consent = createRoutingConsent(AsyncStorage)
export function useDirectionsConsent(
  visible: boolean,
  onOpen: () => void,
  onClose: () => void,
) {
  const pending = useRef<(() => void) | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function request(action: (confirmed: boolean) => void) {
    if (busy) return
    setBusy(true)
    try {
      if (await consent.accepted()) action(false)
      else {
        pending.current = () => action(true)
        onOpen()
      }
    } catch {
      pending.current = () => action(true)
      onOpen()
    } finally {
      setBusy(false)
    }
  }
  async function accept() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await consent.accept()
      pending.current?.()
    } catch {
      setError('Your choice could not be saved. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return {
    request,
    confirmation: visible ? (
      <Modal transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss directions privacy"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            role="alertdialog"
            accessibilityLabel="Directions privacy"
            style={styles.dialog}
          >
            <Text style={ui.body}>
              Directions use an external routing service, which receives your
              start and destination.
            </Text>
            {error ? (
              <Text accessibilityRole="alert" style={[ui.small, ui.error]}>
                {error}
              </Text>
            ) : null}
            <View style={ui.row}>
              <View style={ui.flex}>
                <Button secondary disabled={busy} onPress={onClose}>
                  Cancel
                </Button>
              </View>
              <View style={ui.flex}>
                <Button disabled={busy} onPress={() => void accept()}>
                  Continue
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    ) : null,
  }
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.backdrop,
  },
  dialog: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    padding: 24,
    gap: 20,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
})
