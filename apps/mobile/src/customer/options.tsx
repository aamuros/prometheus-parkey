import { useState } from 'react'
import { Switch, TextInput, View } from 'react-native'

import { usePreview } from './context'
import { Button, PreviewNote, Sheet, Text, palette, ui } from './ui'

export type AccountOption = 'vehicle' | 'payment' | 'notifications' | 'help'
export function Options({
  kind,
  onClose,
}: {
  kind: AccountOption
  onClose: () => void
}) {
  const { state, dispatch } = usePreview()
  const [name, setName] = useState(state.vehicle.name)
  const [plate, setPlate] = useState(state.vehicle.plate)
  const [error, setError] = useState('')
  const titles = {
    vehicle: 'Your vehicle',
    payment: 'Payment methods',
    notifications: 'Notifications',
    help: 'Help center',
  }
  function saveVehicle(close: () => void) {
    if (
      name.trim().length < 2 ||
      name.trim().length > 30 ||
      !/^[A-Z0-9][A-Z0-9 -]{1,11}$/i.test(plate.trim())
    ) {
      setError(
        'Enter a vehicle name (2–30 characters) and plate (2–12 letters, numbers, spaces, or hyphens).',
      )
      return
    }
    dispatch({ type: 'vehicle', name, plate })
    close()
  }
  return (
    <Sheet title={titles[kind]} onClose={onClose}>
      {(close) => (
        <>
          {kind === 'vehicle' && (
            <>
              <Text style={ui.bodyMuted}>
                Use sample details to explore the reservation screens.
              </Text>
              <Text style={ui.subheading}>Vehicle name</Text>
              <TextInput
                accessibilityLabel="Vehicle name"
                value={name}
                onChangeText={(value) => {
                  setName(value)
                  setError('')
                }}
                maxLength={30}
                style={ui.input}
              />
              <Text style={ui.subheading}>Plate number</Text>
              <TextInput
                accessibilityLabel="Sample plate number"
                value={plate}
                onChangeText={(value) => {
                  setPlate(value)
                  setError('')
                }}
                maxLength={12}
                autoCapitalize="characters"
                autoCorrect={false}
                style={ui.input}
                onSubmitEditing={() => saveVehicle(close)}
              />
              {error !== '' && (
                <Text
                  accessibilityRole="alert"
                  style={[ui.bodyMuted, ui.danger]}
                >
                  {error}
                </Text>
              )}
              <Button onPress={() => saveVehicle(close)}>
                Save sample vehicle
              </Button>
            </>
          )}
          {kind === 'payment' && (
            <>
              <Text style={ui.heading}>GCash · •••• 0917</Text>
              <Text style={ui.bodyMuted}>
                This is the sample payment method shown in the design. No wallet
                is linked, and no money will be charged.
              </Text>
              <Button onPress={() => close()}>Use sample GCash</Button>
            </>
          )}
          {kind === 'notifications' && (
            <>
              <View style={ui.between}>
                <Text style={ui.subheading}>Booking reminders</Text>
                <Switch
                  accessibilityLabel="Sample booking reminders"
                  value={state.reminders}
                  onValueChange={(enabled) =>
                    dispatch({ type: 'reminders', enabled })
                  }
                  trackColor={{ true: palette.black }}
                />
              </View>
              <Text style={ui.bodyMuted}>
                This preference lasts for the preview session. Notifications are
                not scheduled or sent.
              </Text>
            </>
          )}
          {kind === 'help' && (
            <>
              <Text style={ui.subheading}>How do I try a reservation?</Text>
              <Text style={ui.bodyMuted}>
                Choose a garage from Home, review the sample time and price,
                then preview the confirmation. Your sample booking appears in
                Bookings.
              </Text>
              <Text style={ui.subheading}>
                Can I use the booking code at a garage?
              </Text>
              <Text style={ui.bodyMuted}>
                No. Codes, parking locations, availability, and payment details
                in this preview are sample data.
              </Text>
              <Text style={ui.subheading}>How do I cancel?</Text>
              <Text style={ui.bodyMuted}>
                Open a sample booking from Bookings, then choose Cancel sample
                booking. No charge or refund is involved.
              </Text>
            </>
          )}
          <PreviewNote />
        </>
      )}
    </Sheet>
  )
}
