import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { usePreview } from './context'
import { Options } from './options'
import type { AccountOption } from './options'
import { formattedPhone, parkingPlaces, timeRangeLabel } from './preview'
import type { PreviewBooking } from './preview'
import {
  Artwork,
  Button,
  ListRow,
  PreviewNote,
  Screen,
  Sheet,
  Text,
  palette,
  ui,
  useCanvas,
} from './ui'

export function Bookings() {
  const { state } = usePreview()
  const { top, bottom } = useCanvas()
  const [past, setPast] = useState(false)
  const upcoming = state.bookings.filter(
    (booking) => booking.status === 'reserved',
  )
  const history = state.bookings.filter(
    (booking) => booking.status !== 'reserved',
  )
  function open(booking: PreviewBooking, navigate = false) {
    router.navigate({
      pathname: '/confirmation/[id]',
      params: { id: booking.id, navigate: navigate ? '1' : '0' },
    })
  }
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          ui.pageContent,
          { paddingTop: top + 20, paddingBottom: bottom + 112 },
        ]}
      >
        <Text accessibilityRole="header" style={ui.title}>
          Bookings
        </Text>
        <View accessibilityRole="tablist" style={styles.segment}>
          {['Upcoming', 'Past'].map((label, index) => (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: past === (index === 1) }}
              onPress={() => setPast(index === 1)}
              style={({ pressed }) => [
                styles.segmentItem,
                past === (index === 1) && styles.segmentSelected,
                pressed && ui.pressed,
              ]}
            >
              <Text
                style={[styles.segmentLabel, past === (index === 1) && ui.ink]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {!past &&
          upcoming.map((booking) => {
            const place = parkingPlaces.find((p) => p.id === booking.placeId)
            if (!place) return null
            return (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={ui.row}>
                  <View style={styles.bookingIcon}>
                    <Artwork name="parkingSmall" />
                  </View>
                  <View style={ui.flex}>
                    <Text style={ui.subheading}>{place.name}</Text>
                    <Text style={ui.bodyMuted}>
                      {booking.day} ·{' '}
                      {timeRangeLabel(booking.arrival, booking.hours)}
                    </Text>
                  </View>
                  <View style={styles.reserved}>
                    <Text style={styles.reservedText}>Reserved</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={ui.between}>
                  {[
                    ['Slot', booking.slot],
                    ['Booking code', booking.code],
                    ['Total', `₱${booking.total}`],
                  ].map(([label, value]) => (
                    <View key={label} style={{ gap: 2 }}>
                      <Text style={ui.caption}>{label}</Text>
                      <Text style={ui.subheading}>{value}</Text>
                    </View>
                  ))}
                </View>
                <View style={[ui.row, { gap: 12 }]}>
                  <Button style={ui.flex} onPress={() => open(booking, true)}>
                    Navigate
                  </Button>
                  <Button
                    secondary
                    style={ui.flex}
                    onPress={() => open(booking)}
                  >
                    Details
                  </Button>
                </View>
              </View>
            )
          })}
        {!past && upcoming.length === 0 && (
          <View style={ui.column}>
            <Text style={ui.heading}>Your next stop is waiting</Text>
            <Text style={ui.bodyMuted}>
              Sample reservations will appear here.
            </Text>
            <Button onPress={() => router.navigate('/home')}>
              Find parking
            </Button>
          </View>
        )}
        <View style={{ gap: 4 }}>
          <Text style={ui.subheading}>Past</Text>
          {history.map((booking) => {
            const place = parkingPlaces.find((p) => p.id === booking.placeId)
            return place ? (
              <ListRow
                key={booking.id}
                icon="iconClock"
                title={place.name}
                subtitle={`${booking.day} · ${booking.hours} ${booking.hours === 1 ? 'hr' : 'hrs'} · ₱${booking.total}${booking.status === 'cancelled' ? ' · Cancelled' : ''}`}
                onPress={() => open(booking)}
              />
            ) : null
          })}
          {history.length === 0 && (
            <Text style={ui.bodyMuted}>No past sample bookings yet.</Text>
          )}
        </View>
        <PreviewNote compact />
      </ScrollView>
    </Screen>
  )
}

export function Account() {
  const { state, dispatch } = usePreview()
  const { top, bottom } = useCanvas()
  const [option, setOption] = useState<AccountOption | 'logout' | null>(null)
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          ui.pageContent,
          { paddingTop: top + 20, paddingBottom: bottom + 112, gap: 24 },
        ]}
      >
        <Text accessibilityRole="header" style={ui.title}>
          Account
        </Text>
        <View style={[ui.row, { gap: 16 }]}>
          <View style={styles.avatar}>
            <Text style={[ui.title24, ui.white]}>A</Text>
          </View>
          <View style={ui.flex}>
            <Text style={ui.title24}>Adrian</Text>
            <Text style={ui.bodyMuted}>+63 {formattedPhone(state.phone)}</Text>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={ui.subheading}>Your account</Text>
          <ListRow
            icon="iconCar"
            title="Vehicles"
            subtitle={`${state.vehicle.name} · ${state.vehicle.plate}`}
            onPress={() => setOption('vehicle')}
          />
          <ListRow
            icon="iconCard"
            title="Payment methods"
            subtitle="GCash •••• 0917"
            onPress={() => setOption('payment')}
          />
          <ListRow
            icon="iconBell"
            title="Notifications"
            subtitle={`Booking reminders ${state.reminders ? 'on' : 'off'}`}
            onPress={() => setOption('notifications')}
          />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={ui.subheading}>Support</Text>
          <ListRow
            icon="iconHelp"
            title="Help center"
            subtitle="FAQs and contact us"
            onPress={() => setOption('help')}
          />
          <ListRow
            icon="iconLogout"
            title="Log out"
            subtitle={`Signed in with +63 ${formattedPhone(state.phone)}`}
            danger
            onPress={() => setOption('logout')}
          />
        </View>
        <View style={{ paddingTop: 22, gap: 8 }}>
          <Text style={[ui.caption, ui.previewNote]}>
            Parkey 0.1 · Poblacion pilot
          </Text>
          <PreviewNote compact />
        </View>
      </ScrollView>
      {option && option !== 'logout' && (
        <Options kind={option} onClose={() => setOption(null)} />
      )}
      {option === 'logout' && (
        <Sheet title="Leave the preview?" onClose={() => setOption(null)}>
          {(close) => (
            <>
              <Text style={ui.body}>
                This resets your sample bookings, vehicle details, and
                preferences.
              </Text>
              <Button
                onPress={() => {
                  close(() => {
                    dispatch({ type: 'reset' })
                    router.replace('/')
                  })
                }}
              >
                Log out
              </Button>
              <Button secondary onPress={() => close()}>
                Stay here
              </Button>
            </>
          )}
        </Sheet>
      )}
    </Screen>
  )
}
const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: palette.secondary,
    padding: 4,
    borderRadius: 100,
    marginBottom: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 38,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  segmentSelected: {
    backgroundColor: palette.white,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
  },
  segmentLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: palette.muted,
  },
  bookingCard: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 24,
    padding: 16,
    gap: 16,
    backgroundColor: palette.white,
    boxShadow: '0px 4px 8px rgba(0,0,0,0.06)',
  },
  bookingIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.secondary,
  },
  divider: { height: 1, backgroundColor: palette.line },
  reserved: {
    backgroundColor: '#E8EFFF',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reservedText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#276EF1',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
