import { useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { customerColors as c, customerStyles as s } from './customer-styles'
import {
  CustomerBack,
  CustomerButton,
  CustomerChoice,
  CustomerSheet,
} from './customer-ui'
import { Icon } from './design-icons'
import {
  arrivalTimes,
  dateLabel,
  departureTime,
  displayTime,
  sampleAvailability,
  sampleBookingFee,
  sampleDates,
} from '../demo/driver'
import type {
  BookingDraft,
  DemoLocation,
  DemoTrip,
  DriverState,
} from '../demo/driver'

type BookingFlowProps = {
  location: DemoLocation
  state: DriverState
  initialDate: string
  initialArrival: string
  initialHours: number
  onClose: () => void
  onBook: (draft: BookingDraft) => string | null
  onVehicles: () => void
}

type Editor = 'arrival' | 'duration' | 'vehicle' | null

function ScheduleRow({
  label,
  value,
  first = false,
  onPress,
}: {
  label: string
  value: string
  first?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.detailRow,
        !first && s.detailBorder,
        pressed && s.pressed,
      ]}
    >
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
      <Icon name="chevron" size={16} color="#94A3B8" />
    </Pressable>
  )
}

export function BookingFlow({
  location,
  state,
  initialDate,
  initialArrival,
  initialHours,
  onClose,
  onBook,
  onVehicles,
}: BookingFlowProps) {
  const [review, setReview] = useState(false)
  const [hours, setHours] = useState(initialHours)
  const [date, setDate] = useState(initialDate)
  const [arrival, setArrival] = useState(initialArrival)
  const [vehicleId, setVehicleId] = useState(state.vehicles[0]?.id ?? '')
  const [editor, setEditor] = useState<Editor>(null)
  const [payment, setPayment] = useState<'gcash' | 'card'>('gcash')
  const [error, setError] = useState('')
  const vehicle = state.vehicles.find((item) => item.id === vehicleId)
  const parkingTotal = location.hourlyRate * hours
  const total = parkingTotal + sampleBookingFee
  const day = date === '2026-10-27' ? 'Today' : dateLabel(date)
  const timeLabel = `${displayTime(arrival)}–${displayTime(departureTime(arrival, hours))}`
  function submit() {
    const problem = onBook({
      locationId: location.id,
      vehicleId,
      date,
      arrival,
      hours,
    })
    if (problem) setError(problem)
  }
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => (review ? setReview(false) : onClose())}
    >
      <SafeAreaView style={[s.flow, review && s.review]}>
        {review && (
          <View style={s.progress}>
            <View style={s.progressBars}>
              <View style={[s.progressBar, s.progressDone]} />
              <View style={[s.progressBar, s.progressDone]} />
              <View style={s.progressBar} />
            </View>
            <Text style={s.step}>STEP 2 OF 3 · PAY</Text>
          </View>
        )}
        <View style={s.header}>
          <CustomerBack
            onPress={() => (review ? setReview(false) : onClose())}
            label={review ? 'Back to reservation' : 'Back to parking'}
          />
          <Text accessibilityRole="header" style={s.heading}>
            {review ? 'Review & pay' : 'Reserve'}
          </Text>
        </View>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.flowContent}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
        >
          {review ? (
            <>
              <View style={s.reviewLot}>
                <Text style={s.lotName}>{location.name}</Text>
                <Text style={s.meta}>
                  {day} · {timeLabel} · {hours} hrs
                </Text>
              </View>
              <View style={s.formSection}>
                <View style={s.between}>
                  <Text style={s.label}>
                    Plate number <Text style={s.small}>· saved vehicle</Text>
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setEditor('vehicle')}
                    style={s.textButton}
                  >
                    <Text style={s.link}>Edit</Text>
                  </Pressable>
                </View>
                <TextInput
                  accessibilityLabel="Saved plate number. Use Edit to choose a vehicle."
                  value={vehicle?.plate ?? ''}
                  editable={false}
                  style={s.input}
                />
              </View>
              <View style={s.formSection}>
                <Text style={s.label}>Payment method</Text>
                {(['gcash', 'card'] as const).map((method) => (
                  <Pressable
                    key={method}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: payment === method }}
                    onPress={() => setPayment(method)}
                    style={({ pressed }) => [s.payment, pressed && s.pressed]}
                  >
                    <View
                      style={[s.radio, payment === method && s.radioSelected]}
                    >
                      {payment === method && <View style={s.radioDot} />}
                    </View>
                    <Text style={s.body}>
                      {method === 'gcash' ? 'GCash' : 'Credit or debit card'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={s.lotSummary}>
                <View style={s.between}>
                  <Text accessibilityRole="header" style={s.lotTitle}>
                    {location.name}
                  </Text>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>Sample lot</Text>
                  </View>
                </View>
                <Text style={s.meta}>{location.address}, Makati</Text>
                <Text style={s.lotFacts}>
                  {location.walk} · {sampleAvailability(state, location)} spots
                  left · {location.covered ? 'Covered' : 'Open air'}
                </Text>
              </View>
              <View style={s.detailsBox}>
                <ScheduleRow
                  first
                  label="Arrive"
                  value={`${day}, ${displayTime(arrival)}`}
                  onPress={() => setEditor('arrival')}
                />
                <ScheduleRow
                  label="Duration"
                  value={`${hours} ${hours === 1 ? 'hour' : 'hours'}`}
                  onPress={() => setEditor('duration')}
                />
                <ScheduleRow
                  label="Vehicle"
                  value={vehicle?.plate ?? 'Add a vehicle'}
                  onPress={() => setEditor('vehicle')}
                />
                <ScheduleRow
                  label="Pay with"
                  value={payment === 'gcash' ? 'GCash' : 'Card'}
                  onPress={() => setReview(true)}
                />
              </View>
            </>
          )}
          <View style={s.bill}>
            <View style={s.billRow}>
              <Text style={s.meta}>
                Parking · {hours} hrs × ₱{location.hourlyRate}
              </Text>
              <Text style={s.billValue}>₱{parkingTotal}</Text>
            </View>
            <View style={s.billRow}>
              <Text style={s.meta}>Booking fee</Text>
              <Text style={s.billValue}>₱{sampleBookingFee}</Text>
            </View>
            <View style={s.total}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={review ? s.totalLabel : s.price}>₱{total}</Text>
            </View>
          </View>
          {error !== '' && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
        </ScrollView>
        <View style={s.flowFooter}>
          <CustomerButton
            disabled={!!vehicle && !sampleAvailability(state, location)}
            onPress={() =>
              !vehicle ? onVehicles() : review ? submit() : setReview(true)
            }
          >
            {!vehicle
              ? 'Add a vehicle'
              : review
                ? `Pay ₱${total} · Demo`
                : `Review ₱${total}`}
          </CustomerButton>
          <Text style={s.preview}>
            Demo only · No real reservation or payment
          </Text>
        </View>
        {editor && (
          <CustomerSheet
            title={editor === 'vehicle' ? 'Choose a vehicle' : 'Parking time'}
            onClose={() => setEditor(null)}
          >
            {editor === 'vehicle' ? (
              <>
                {state.vehicles.map((item) => (
                  <CustomerChoice
                    key={item.id}
                    selected={item.id === vehicleId}
                    onPress={() => {
                      setVehicleId(item.id)
                      setError('')
                      setEditor(null)
                    }}
                  >{`${item.label} · ${item.plate}`}</CustomerChoice>
                ))}
                <CustomerButton secondary onPress={onVehicles}>
                  Manage vehicles
                </CustomerButton>
              </>
            ) : (
              <>
                <Text style={s.label}>Date</Text>
                <View style={s.wrap}>
                  {sampleDates.map((item) => (
                    <CustomerChoice
                      key={item.value}
                      selected={date === item.value}
                      onPress={() => {
                        setDate(item.value)
                        setError('')
                      }}
                    >
                      {item.label}
                    </CustomerChoice>
                  ))}
                </View>
                <Text style={s.label}>Arrival · Manila time</Text>
                <View style={s.wrap}>
                  {arrivalTimes.map((time) => (
                    <CustomerChoice
                      key={time}
                      selected={arrival === time}
                      onPress={() => {
                        setArrival(time)
                        setError('')
                      }}
                    >
                      {displayTime(time)}
                    </CustomerChoice>
                  ))}
                </View>
                <Text style={s.label}>Duration</Text>
                <View style={s.wrap}>
                  {[1, 2, 3, 4].map((duration) => (
                    <CustomerChoice
                      key={duration}
                      selected={hours === duration}
                      onPress={() => {
                        setHours(duration)
                        setError('')
                      }}
                    >{`${duration} ${duration === 1 ? 'hour' : 'hours'}`}</CustomerChoice>
                  ))}
                </View>
                <CustomerButton onPress={() => setEditor(null)}>
                  Done
                </CustomerButton>
              </>
            )}
          </CustomerSheet>
        )}
      </SafeAreaView>
    </Modal>
  )
}

export function GoScreen({
  trip,
  location,
  onClose,
  onExtend,
  extensionError,
}: {
  trip: DemoTrip
  location: DemoLocation
  onClose: () => void
  onExtend: () => void
  extensionError: string
}) {
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.screen}>
        <ScrollView contentContainerStyle={s.confirmationScroll}>
          <View style={s.confirmationHero}>
            <View style={s.checkCircle}>
              <Icon name="check" size={34} color={c.white} />
            </View>
            <Text accessibilityRole="header" style={s.confirmationTitle}>
              You’re booked
            </Text>
            <Text style={s.meta}>
              {location.name} · {dateLabel(trip.date)}
            </Text>
            <Text style={s.meta}>
              {displayTime(trip.arrival)}–
              {displayTime(departureTime(trip.arrival, trip.hours))}
            </Text>
            <Text style={s.preview}>
              Demo only · No space reserved or payment taken
            </Text>
          </View>
          <View style={s.pass}>
            <Text style={s.passCaption}>DEMO REFERENCE · NOT FOR ENTRY</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={s.passCode}>
              {trip.id}
            </Text>
            <View style={s.passDetails}>
              <View style={s.passColumn}>
                <Text style={s.small}>Arrival</Text>
                <Text style={s.passValue}>{displayTime(trip.arrival)}</Text>
              </View>
              <View style={s.passColumn}>
                <Text style={s.small}>Plate</Text>
                <Text style={s.passValue}>{trip.plate}</Text>
              </View>
              <View style={s.passColumn}>
                <Text style={s.small}>Demo total</Text>
                <Text style={s.passValue}>₱{trip.estimate}</Text>
              </View>
            </View>
          </View>
          <View style={s.confirmationFooter}>
            {extensionError !== '' && (
              <Text accessibilityRole="alert" style={s.error}>
                {extensionError}
              </Text>
            )}
            <CustomerButton
              onPress={() =>
                Alert.alert(
                  'Demo navigation',
                  `${location.address}. This is a fictional location; live directions are not connected.`,
                )
              }
            >
              ▲ Navigate
            </CustomerButton>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: trip.hours >= 4 }}
              disabled={trip.hours >= 4}
              onPress={onExtend}
              style={({ pressed }) => [
                s.textButton,
                trip.hours >= 4 && s.disabled,
                pressed && s.pressed,
              ]}
            >
              <Text style={s.link}>
                {trip.hours >= 4 ? '4-hour demo limit reached' : 'Extend time'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={s.textButton}
            >
              <Text style={s.small}>Back to my trips</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
