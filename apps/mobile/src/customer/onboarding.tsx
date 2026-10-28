import { router } from 'expo-router'
import { useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg'

import { usePreview } from './context'
import { ParkingMap } from './map'
import { formattedPhone, phoneDigits, validPhone } from './preview'
import {
  Artwork,
  Back,
  Button,
  PreviewNote,
  Screen,
  Text,
  palette,
  ui,
  useCanvas,
} from './ui'

export function Welcome() {
  const { height, bottom, top } = useCanvas()
  const heroHeight = Math.min(470, (height * 470) / 844)
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: bottom + 16 }}>
        <View style={{ height: heroHeight, overflow: 'hidden' }}>
          <ParkingMap mode="welcome" />
          <View pointerEvents="none" style={styles.fade}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="welcomeFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="white" stopOpacity="0" />
                  <Stop offset="1" stopColor="white" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#welcomeFade)" />
            </Svg>
          </View>
          <View style={[styles.brand, { top: top + 8 }]}>
            <View style={styles.logo}>
              <Text style={[ui.subheading, ui.white]}>P</Text>
            </View>
            <Text style={ui.subheading}>Parkey</Text>
          </View>
          <View style={[styles.previewBadge, { top: top + 22 }]}>
            <Text style={ui.caption}>Design preview</Text>
          </View>
        </View>
        <View style={styles.welcomeContent}>
          <Text accessibilityRole="header" style={styles.display}>
            Park before{'\n'}you arrive.
          </Text>
          <Text style={[ui.body, ui.muted]}>
            Find and reserve a parking spot near your destination in Poblacion,
            Makati.
          </Text>
          <View style={styles.welcomeButtons}>
            <Button onPress={() => router.navigate('/phone')}>
              Get started
            </Button>
            <Button secondary onPress={() => router.navigate('/phone')}>
              I already have an account
            </Button>
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

export function PhoneNumber() {
  const { state, dispatch } = usePreview()
  const [phone, setPhone] = useState(state.phone)
  const [error, setError] = useState('')
  const { top, bottom } = useCanvas()
  function continuePreview() {
    if (!validPhone(phone)) {
      setError('Enter a 10-digit Philippine mobile number starting with 9.')
      return
    }
    dispatch({ type: 'phone', phone })
    Keyboard.dismiss()
    router.replace('/home')
  }
  function changePhone(value: string) {
    setPhone(phoneDigits(value))
    setError('')
  }
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={ui.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.phoneContent, { paddingTop: top + 8 }]}
        >
          <Back
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/')
            }
          />
          <View style={styles.phoneHeader}>
            <Text accessibilityRole="header" style={ui.title}>
              What&apos;s your mobile number?
            </Text>
            <Text style={[ui.body, ui.muted]}>
              We&apos;ll text you a code to verify it&apos;s you.
            </Text>
          </View>
          <View style={styles.phoneInput}>
            <Text style={ui.medium}>+63</Text>
            <Artwork name="iconDown" />
            <View style={styles.inputDivider} />
            <TextInput
              accessibilityLabel="Philippine mobile number"
              value={formattedPhone(phone)}
              onChangeText={changePhone}
              keyboardType="phone-pad"
              autoComplete="tel-national"
              textContentType="telephoneNumber"
              maxLength={12}
              autoFocus={Platform.OS !== 'web'}
              showSoftInputOnFocus={Platform.OS !== 'web'}
              returnKeyType="done"
              onSubmitEditing={continuePreview}
              style={styles.phoneText}
            />
          </View>
          <Text style={[ui.caption, { color: palette.light }]}>
            By continuing, you agree to Parkey&apos;s Terms of Use and Privacy
            Policy.
          </Text>
          <Text style={ui.caption}>
            Preview only. No verification text will be sent.
          </Text>
          {error !== '' && (
            <Text accessibilityRole="alert" style={[ui.bodyMuted, ui.danger]}>
              {error}
            </Text>
          )}
        </ScrollView>
        <View
          style={[
            styles.phoneFooter,
            {
              paddingBottom: Platform.OS === 'web' ? 18 : Math.max(bottom, 18),
            },
          ]}
        >
          <Button onPress={continuePreview} disabled={!validPhone(phone)}>
            Continue
          </Button>
        </View>
        {Platform.OS === 'web' && (
          <View style={styles.keypad}>
            {[
              [1, 2, 3],
              [4, 5, 6],
              [7, 8, 9],
              ['', 0, 'back'],
            ].map((row, i) => (
              <View key={i} style={styles.keyRow}>
                {row.map((key) =>
                  key === '' ? (
                    <View key="blank" style={styles.keyBlank} />
                  ) : (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={
                        key === 'back' ? 'Delete last digit' : String(key)
                      }
                      onPress={() =>
                        changePhone(
                          key === 'back' ? phone.slice(0, -1) : phone + key,
                        )
                      }
                      style={({ pressed }) => [
                        styles.key,
                        key === 'back' && styles.deleteKey,
                        pressed && ui.pressed,
                      ]}
                    >
                      {key === 'back' ? (
                        <Artwork name="iconBack" />
                      ) : (
                        <Text style={ui.heading}>{key}</Text>
                      )}
                    </Pressable>
                  ),
                )}
              </View>
            ))}
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  )
}
export function NotFound({ title = 'Sample not found' }: { title?: string }) {
  const { top } = useCanvas()
  return (
    <Screen>
      <View style={[ui.pageContent, { paddingTop: top + 24 }]}>
        <Text style={ui.title}>{title}</Text>
        <PreviewNote />
        <Button onPress={() => router.replace('/home')}>Find parking</Button>
      </View>
    </Screen>
  )
}
const styles = StyleSheet.create({
  fade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 170 },
  brand: {
    position: 'absolute',
    left: 24,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 100,
    boxShadow: '0px 4px 16px rgba(0,0,0,0.16)',
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: palette.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadge: {
    position: 'absolute',
    right: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: palette.white,
  },
  welcomeContent: { paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  display: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
    fontWeight: '700',
    color: palette.ink,
  },
  welcomeButtons: { gap: 12, paddingTop: 24 },
  phoneContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
    flexGrow: 1,
  },
  phoneHeader: { gap: 8, marginTop: 12 },
  phoneInput: {
    marginTop: 50,
    minHeight: 60,
    backgroundColor: palette.secondary,
    borderWidth: 2,
    borderColor: palette.ink,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputDivider: { width: 1, height: 24, backgroundColor: '#CFCFCF' },
  phoneText: {
    flex: 1,
    fontFamily: 'InterMedium',
    fontSize: 16,
    color: palette.ink,
    paddingVertical: 14,
  },
  phoneFooter: { paddingHorizontal: 24, paddingTop: 12 },
  keypad: {
    backgroundColor: '#D1D4D9',
    height: 291,
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 12,
  },
  keyRow: { flexDirection: 'row', gap: 6 },
  key: {
    flex: 1,
    height: 46,
    backgroundColor: palette.white,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBlank: { flex: 1 },
  deleteKey: { backgroundColor: '#ADB2BA' },
})
