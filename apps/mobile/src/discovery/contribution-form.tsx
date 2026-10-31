import * as ImagePicker from 'expo-image-picker'
import type { ParkingContribution } from '@parkey/shared-types'
import { useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { kindLabels } from './model'
import { ModalSheet } from './sheets'
import { Button, Choice, colors, Notice, ui } from './ui'

export function ContributionForm({
  draft,
  onClose,
  onSave,
  onAdjust,
}: {
  draft: ParkingContribution
  onClose: () => void
  onAdjust: (draft: ParkingContribution) => void
  onSave: (draft: ParkingContribution) => Promise<string | null>
}) {
  const [form, setForm] = useState(draft)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function photo() {
    setError(null)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        selectionLimit: 1,
      })
      const asset = result.assets?.[0]
      if (result.canceled || !asset) return
      if ((asset.fileSize ?? 0) > 8 * 1024 * 1024) {
        setError('Choose a photograph smaller than 8 MB.')
        return
      }
      setForm((current) => ({ ...current, photoUri: asset.uri }))
    } catch {
      setError(
        'The photo picker could not open. You can continue without a photograph.',
      )
    }
  }
  async function save() {
    if (busy) return
    setBusy(true)
    setError(null)
    const issue = await onSave(form)
    setBusy(false)
    if (issue) setError(issue)
    else setSaved(true)
  }

  return (
    <ModalSheet
      title={
        saved
          ? 'Draft saved on this device'
          : form.intent === 'correction'
            ? 'Report information'
            : 'Add parking'
      }
      onClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flexShrink: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {saved ? (
            <>
              <Text style={ui.title}>Your draft is saved.</Text>
              <Notice>
                Saved on this device only. Nothing has been sent to Parkey or
                queued for automatic upload.
              </Notice>
              <Text style={ui.body}>
                This draft hasn’t been submitted for review and won’t appear on
                the map.
              </Text>
              <Text style={ui.muted}>
                You can review or delete it in Map information. Photos remain on
                this device and may be removed by the system.
              </Text>
              <Button onPress={onClose}>Back to map</Button>
            </>
          ) : (
            <>
              <Notice>
                Save a private draft on this device. Sharing drafts with Parkey
                isn’t available yet.
              </Notice>
              <View style={{ gap: 5 }}>
                <Text style={ui.eyebrow}>
                  {kindLabels[form.kind].toUpperCase()}
                </Text>
                <Text style={ui.small}>
                  {form.geometry.type === 'Point'
                    ? 'Map point selected'
                    : `${form.geometry.coordinates.length} street points selected`}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onAdjust(form)}
                  style={({ pressed }) => [styles.link, pressed && ui.pressed]}
                >
                  <Text style={[ui.heading, ui.link]}>Adjust on map</Text>
                </Pressable>
              </View>
              <Field
                label={
                  form.kind === 'street'
                    ? 'Street name or description'
                    : 'Parking name or description'
                }
                value={form.name}
                maxLength={100}
                onChange={(name) =>
                  setForm((current) => ({ ...current, name }))
                }
              />
              {form.kind === 'street' ? (
                <View style={{ gap: 8 }}>
                  <Text style={ui.small}>
                    Street side · following the points you drew
                  </Text>
                  <View style={[ui.row, { flexWrap: 'wrap', gap: 6 }]}>
                    {(['unknown', 'left', 'right', 'both'] as const).map(
                      (side) => (
                        <Choice
                          key={side}
                          selected={form.side === side}
                          onPress={() =>
                            setForm((current) => ({ ...current, side }))
                          }
                        >
                          {side === 'unknown'
                            ? 'Not sure'
                            : side[0]?.toUpperCase() + side.slice(1)}
                        </Choice>
                      ),
                    )}
                  </View>
                </View>
              ) : null}
              <Field
                label={
                  form.intent === 'correction'
                    ? 'What needs correcting? (required)'
                    : 'Restrictions / posted signs (optional)'
                }
                placeholder="Only what you have observed or read on a sign"
                value={form.restrictions}
                onChange={(restrictions) =>
                  setForm((current) => ({ ...current, restrictions }))
                }
                multiline
              />
              <Field
                label="Operating hours (optional)"
                placeholder="Leave blank if unknown"
                value={form.hours}
                onChange={(hours) =>
                  setForm((current) => ({ ...current, hours }))
                }
              />
              <Field
                label="Fees (optional)"
                placeholder="Only if shown on a sign or other source"
                value={form.fees}
                onChange={(fees) =>
                  setForm((current) => ({ ...current, fees }))
                }
              />
              <View style={{ gap: 10 }}>
                {form.photoUri ? (
                  <>
                    <Image
                      source={{ uri: form.photoUri }}
                      accessibilityLabel="Attached parking signage"
                      style={styles.photo}
                      resizeMode="contain"
                    />
                    <Button
                      secondary
                      onPress={() =>
                        setForm((current) => ({ ...current, photoUri: null }))
                      }
                    >
                      Remove photo
                    </Button>
                  </>
                ) : (
                  <Button secondary icon="camera" onPress={() => void photo()}>
                    Attach signage photo
                  </Button>
                )}
                <Text style={ui.small}>
                  Avoid faces, number plates, and personal details. A photo is
                  optional.
                </Text>
              </View>
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <Button disabled={busy} onPress={() => void save()}>
                {busy ? 'Saving on device…' : 'Save draft on device'}
              </Button>
              <Text style={ui.small}>
                A draft does not establish permission to park. Always check
                posted signs.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalSheet>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  maxLength = 500,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  maxLength?: number
}) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={{ gap: 7 }}>
      <Text style={ui.small}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? ''}
        placeholderTextColor={colors.muted}
        selectionColor={colors.action}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={maxLength}
        multiline={multiline}
        style={[
          ui.input,
          focused && ui.focused,
          multiline && { minHeight: 88, textAlignVertical: 'top' },
        ]}
      />
    </View>
  )
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 20, gap: 20 },
  link: { minHeight: 44, justifyContent: 'center', borderRadius: 12 },
  photo: {
    height: 150,
    width: '100%',
    backgroundColor: colors.soft,
    borderRadius: 14,
  },
  error: { fontSize: 14, lineHeight: 20, color: colors.error },
})
