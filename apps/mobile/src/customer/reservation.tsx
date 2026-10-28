import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  BackHandler,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native'

import { usePreview } from './context'
import { ParkingCard } from './discovery'
import { ParkingMap } from './map'
import { FlowNavigation } from './navigation'
import { NotFound } from './onboarding'
import { Options } from './options'
import { parkingPlaces, previewTotal, serviceFee, timeLabel } from './preview'
import { qrPattern } from './qr-pattern'
import {
  Artwork,
  Back,
  Button,
  Chip,
  Handle,
  ListRow,
  PreviewNote,
  RoundButton,
  Screen,
  Sheet,
  Text,
  palette,
  ui,
  useCanvas,
} from './ui'

function usePlace() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return parkingPlaces.find((place) => place.id === id)
}
export function ParkingDetails() {
  const place = usePlace()
  const { state, dispatch } = usePreview()
  const { top, bottom, scale } = useCanvas()
  const [shareError, setShareError] = useState('')
  if (!place) return <NotFound title="Parking not found" />
  const saved = state.saved.includes(place.id)
  async function share() {
    if (!place) return
    try {
      await Share.share({
        message: `Parkey design preview — ${place.name}, ${place.street}, Poblacion, Makati. Sample parking at ₱${place.rate}/hr; not a live listing.`,
      })
    } catch {
      setShareError('Sharing is unavailable on this device.')
    }
  }
  const amenities = [
    ...(place.covered
      ? ([{ icon: 'iconRoof', label: 'Covered' }] as const)
      : []),
    { icon: 'iconVideo', label: 'CCTV' } as const,
    ...(place.ev ? ([{ icon: 'iconZap', label: 'EV charging' }] as const) : []),
    { icon: 'iconShield', label: 'Guard on duty' } as const,
  ]
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View
          style={{
            height: 300 * scale,
            overflow: 'hidden',
            backgroundColor: palette.secondary,
          }}
        >
          <View style={{ transform: [{ scale }], transformOrigin: 'top left' }}>
            <Artwork name="garageIllustration" />
          </View>
        </View>
        <View style={styles.detailPanel}>
          <View style={{ gap: 6 }}>
            <Text accessibilityRole="header" style={ui.title}>
              {place.name}
            </Text>
            <View style={ui.row}>
              <Artwork name="iconStar" />
              <Text style={[ui.bodyMuted, ui.ink]}>4.8 (126)</Text>
              <Text style={ui.caption}>·</Text>
              <Text style={[ui.bodyMuted, ui.green]}>Open 24 hours</Text>
            </View>
          </View>
          <View style={ui.row}>
            <Artwork name="pinMuted" />
            <Text style={ui.bodyMuted}>{place.street}, Poblacion, Makati</Text>
          </View>
          <View style={[ui.row, { gap: 10 }]}>
            {[
              [`${place.minutes} min`, 'walk away'],
              [`₱${place.rate}`, 'per hour'],
              [String(place.spaces), 'spots left'],
            ].map(([value, label]) => (
              <View key={label} style={styles.fact}>
                <Text style={ui.heading}>{value}</Text>
                <Text style={ui.caption}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={{ gap: 10 }}>
            <Text style={ui.subheading}>What’s included</Text>
            <View style={ui.wrap}>
              {amenities.map((item) => (
                <View key={item.label} style={styles.amenity}>
                  <Artwork name={item.icon} />
                  <Text style={styles.amenityText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={ui.bodyMuted}>
            Covered garage with a 24/7 attendant. Enter via {place.street} and
            show your Parkey code at the gate.
          </Text>
          {shareError !== '' && (
            <Text accessibilityRole="alert" style={[ui.bodyMuted, ui.danger]}>
              {shareError}
            </Text>
          )}
          <PreviewNote compact />
        </View>
      </ScrollView>
      <View style={[styles.detailHeader, { top: top + 8 }]}>
        <Back />
        <View style={ui.row}>
          <RoundButton
            icon="iconShare"
            label="Share sample parking"
            onPress={() => {
              void share()
            }}
          />
          <RoundButton
            icon="iconHeart"
            label={saved ? 'Remove saved parking' : 'Save parking'}
            selected={saved}
            onPress={() => dispatch({ type: 'save', placeId: place.id })}
          />
        </View>
      </View>
      <View style={[ui.footer, ui.between, { paddingBottom: bottom + 19 }]}>
        <View style={{ gap: 2 }}>
          <Text style={ui.heading}>₱{place.rate} / hr</Text>
          <Text style={[ui.caption, ui.green]}>Free cancellation</Text>
        </View>
        <Button
          style={{ flex: 1, maxWidth: 220 }}
          onPress={() =>
            router.navigate({
              pathname: '/reserve/[id]',
              params: { id: place.id },
            })
          }
        >
          Reserve spot
        </Button>
      </View>
    </Screen>
  )
}

export function ReviewReserve() {
  const place = usePlace()
  const { state, dispatch } = usePreview()
  const { top, bottom } = useCanvas()
  const [hours, setHours] = useState(3)
  const [arrival, setArrival] = useState(1110)
  const [option, setOption] = useState<
    'time' | 'vehicle' | 'payment' | 'confirm' | null
  >(null)
  const [error, setError] = useState('')
  if (!place) return <NotFound title="Parking not found" />
  const total = previewTotal(place, hours)
  function confirm() {
    if (!place) return
    const overlapping = state.bookings.find(
      (b) =>
        b.status === 'reserved' &&
        b.day === 'Today' &&
        arrival < b.arrival + b.hours * 60 &&
        b.arrival < arrival + hours * 60,
    )
    if (overlapping) {
      if (
        overlapping.placeId === place.id &&
        overlapping.arrival === arrival &&
        overlapping.hours === hours
      ) {
        setOption(null)
        router.replace({
          pathname: '/confirmation/[id]',
          params: { id: overlapping.id },
        })
        return
      }
      setOption(null)
      setError(
        'Your sample vehicle already has a booking at this time. Choose another arrival time or cancel that booking first.',
      )
      return
    }
    const id = `sample-${state.nextBooking}`
    dispatch({ type: 'reserve', placeId: place.id, hours, arrival })
    setOption(null)
    router.replace({ pathname: '/confirmation/[id]', params: { id } })
  }
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          ui.pageContent,
          { paddingTop: top + 8, paddingBottom: 24 },
        ]}
      >
        <Back />
        <Text accessibilityRole="header" style={ui.title}>
          Review &amp; reserve
        </Text>
        <ParkingCard place={place} />
        <View style={{ gap: 10 }}>
          <Text style={ui.subheading}>When</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change arrival time and parking duration"
            onPress={() => setOption('time')}
            style={({ pressed }) => [styles.timeCard, pressed && ui.pressed]}
          >
            <View style={ui.flex}>
              <Text style={ui.caption}>Arrive</Text>
              <Text style={ui.medium}>Today, {timeLabel(arrival)}</Text>
            </View>
            <View style={ui.flex}>
              <Text style={ui.caption}>Leave</Text>
              <Text style={ui.medium}>
                Today, {timeLabel(arrival + hours * 60)}
              </Text>
            </View>
          </Pressable>
        </View>
        <View>
          <ListRow
            icon="iconCar"
            title={state.vehicle.name}
            subtitle={state.vehicle.plate}
            onPress={() => setOption('vehicle')}
          />
          <ListRow
            icon="iconCard"
            title="GCash"
            subtitle="Sample · •••• 0917"
            onPress={() => setOption('payment')}
          />
        </View>
        <View style={{ gap: 8 }}>
          <View style={ui.between}>
            <Text style={ui.bodyMuted}>
              Parking · {hours} hrs × ₱{place.rate}
            </Text>
            <Text style={[ui.bodyMuted, ui.ink]}>₱{place.rate * hours}</Text>
          </View>
          <View style={ui.between}>
            <Text style={ui.bodyMuted}>Service fee</Text>
            <Text style={[ui.bodyMuted, ui.ink]}>₱{serviceFee}</Text>
          </View>
          <View style={styles.line} />
          <View style={ui.between}>
            <Text style={ui.subheading}>Total</Text>
            <Text style={ui.subheading}>₱{total}</Text>
          </View>
        </View>
        {error !== '' && (
          <Text accessibilityRole="alert" style={[ui.bodyMuted, ui.danger]}>
            {error}
          </Text>
        )}
        <PreviewNote />
      </ScrollView>
      <View style={[ui.footer, { paddingBottom: bottom + 19 }]}>
        <Button
          onPress={() => setOption('confirm')}
        >{`Confirm & pay ₱${total}`}</Button>
      </View>
      {(option === 'vehicle' || option === 'payment') && (
        <Options kind={option} onClose={() => setOption(null)} />
      )}
      {option === 'time' && (
        <Sheet title="Parking time" onClose={() => setOption(null)}>
          {(close) => (
            <>
              <Text style={ui.subheading}>Arrival · Today, Manila time</Text>
              <View style={ui.wrap}>
                {[540, 720, 900, 1110].map((value) => (
                  <Chip
                    key={value}
                    selected={arrival === value}
                    onPress={() => {
                      setArrival(value)
                      setError('')
                    }}
                  >
                    {timeLabel(value)}
                  </Chip>
                ))}
              </View>
              <Text style={ui.subheading}>Duration</Text>
              <View style={ui.wrap}>
                {[1, 2, 3, 4].map((value) => (
                  <Chip
                    key={value}
                    selected={hours === value}
                    onPress={() => {
                      setHours(value)
                      setError('')
                    }}
                  >{`${value} ${value === 1 ? 'hour' : 'hours'}`}</Chip>
                ))}
              </View>
              <Button onPress={() => close()}>Done</Button>
            </>
          )}
        </Sheet>
      )}
      {option === 'confirm' && (
        <Sheet title="Preview this reservation" onClose={() => setOption(null)}>
          {(close) => (
            <>
              <Text style={ui.body}>
                This creates a sample booking for {place.name}. No parking space
                will be reserved and no payment will be taken.
              </Text>
              <Text style={ui.heading}>Sample total · ₱{total}</Text>
              <Button onPress={() => close(confirm)}>
                Preview confirmation
              </Button>
              <Button secondary onPress={() => close()}>
                Back to review
              </Button>
            </>
          )}
        </Sheet>
      )}
    </Screen>
  )
}

export function BookingConfirmed() {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          router.dismissTo('/bookings')
          return true
        },
      )
      return () => subscription.remove()
    }, []),
  )
  const { id, navigate } = useLocalSearchParams<{
    id: string
    navigate?: string
  }>()
  const { state, dispatch } = usePreview()
  const booking = state.bookings.find((item) => item.id === id)
  const place = parkingPlaces.find((item) => item.id === booking?.placeId)
  const { top, bottom, height } = useCanvas()
  const [option, setOption] = useState<'navigate' | 'cancel' | null>(
    navigate === '1' ? 'navigate' : null,
  )
  if (!booking || !place) return <NotFound title="Booking not found" />
  const reserved = booking.status === 'reserved'
  return (
    <Screen>
      <ParkingMap mode="confirmation" />
      <View style={{ position: 'absolute', top: top + 8, left: 24 }}>
        <RoundButton
          icon="iconClose"
          label="Close confirmation"
          onPress={() => router.dismissTo('/bookings')}
        />
      </View>
      <View
        style={[
          ui.panel,
          {
            position: 'absolute',
            top: Math.max(top + 220, (height * 304) / 844),
            bottom: 0,
            left: 0,
            right: 0,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            ui.panelContent,
            { paddingBottom: bottom + 100 },
          ]}
        >
          <View>
            <Handle />
            <View style={[ui.row, { gap: 14 }]}>
              <View style={styles.check}>
                <Artwork name="iconCheck" />
              </View>
              <View style={ui.flex}>
                <Text accessibilityRole="header" style={ui.title24}>
                  {reserved
                    ? 'Spot reserved'
                    : booking.status === 'cancelled'
                      ? 'Booking cancelled'
                      : 'Past booking'}
                </Text>
                <Text style={ui.bodyMuted}>
                  {place.name} · Slot {booking.slot}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.codeCard}>
            <View style={ui.flex}>
              <Text style={ui.caption}>BOOKING CODE</Text>
              <Text selectable style={styles.code}>
                {booking.code}
              </Text>
              <Text style={ui.caption}>Sample code · Not valid for entry</Text>
            </View>
            <View
              accessible
              accessibilityLabel="Decorative sample QR pattern, not a valid entry pass"
              style={styles.qr}
            >
              {qrPattern.map(([left, top]) => (
                <View
                  key={`${left}-${top}`}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    width: 6,
                    height: 6,
                    backgroundColor: palette.black,
                  }}
                />
              ))}
            </View>
          </View>
          <View style={ui.between}>
            {[
              ['Arrive by', timeLabel(booking.arrival + 15)],
              ['Duration', `${booking.hours} hrs`],
              ['Sample total', `₱${booking.total}`],
            ].map(([label, value]) => (
              <View key={label} style={ui.flex}>
                <Text style={ui.caption}>{label}</Text>
                <Text style={ui.subheading}>{value}</Text>
              </View>
            ))}
          </View>
          {reserved && (
            <Button onPress={() => setOption('navigate')}>
              Navigate to garage
            </Button>
          )}
          <PreviewNote compact />
          {reserved && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOption('cancel')}
              style={styles.cancel}
            >
              <Text style={[ui.bodyMuted, ui.danger]}>
                Cancel sample booking
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
      <FlowNavigation />
      {option === 'navigate' && (
        <Sheet title="Sample directions" onClose={() => setOption(null)}>
          {(close) => (
            <>
              <View
                style={{ height: 300, overflow: 'hidden', borderRadius: 20 }}
              >
                <ParkingMap mode="confirmation" />
              </View>
              <Text style={ui.heading}>{place.name}</Text>
              <Text style={ui.bodyMuted}>
                {place.street}, Poblacion, Makati
              </Text>
              <Text style={ui.bodyMuted}>
                The route illustrates the Figma design. Live GPS and
                turn-by-turn navigation are not connected.
              </Text>
              <Button onPress={() => close()}>Back to booking</Button>
            </>
          )}
        </Sheet>
      )}
      {option === 'cancel' && (
        <Sheet title="Cancel sample booking?" onClose={() => setOption(null)}>
          {(close) => (
            <>
              <Text style={ui.body}>
                This moves the sample booking to Past. No payment or refund is
                involved.
              </Text>
              <Button
                onPress={() => {
                  close(() => {
                    dispatch({ type: 'cancel', id: booking.id })
                    router.dismissTo('/bookings')
                  })
                }}
              >
                Cancel sample booking
              </Button>
              <Button secondary onPress={() => close()}>
                Keep booking
              </Button>
            </>
          )}
        </Sheet>
      )}
    </Screen>
  )
}
const styles = StyleSheet.create({
  detailPanel: {
    marginTop: -36,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.white,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
  },
  detailHeader: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fact: {
    flex: 1,
    gap: 2,
    backgroundColor: palette.secondary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  amenity: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: palette.secondary,
  },
  amenityText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: palette.ink,
  },
  timeCard: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: palette.secondary,
  },
  line: { height: 1, backgroundColor: palette.line },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCard: {
    backgroundColor: palette.secondary,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  code: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 3,
    fontWeight: '700',
    color: palette.ink,
    marginVertical: 4,
  },
  qr: {
    height: 92,
    width: 92,
    backgroundColor: palette.white,
    borderRadius: 14,
  },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
})
