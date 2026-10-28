import { useState } from 'react'
import type { Dispatch } from 'react'
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native'

import { ParkingSticker } from './artwork'
import { Icon } from './design-icons'
import { styles as s } from './driver-styles'
import {
  Button,
  Choice,
  Detail,
  IconButton,
  Sheet,
  colors,
  ui,
} from './primitives'
import { Text } from './typography'
import { occupiedSpaces, validateLotSettings } from '../demo/owner'
import type { LotSettings, OwnerAction, OwnerState } from '../demo/owner'

type OwnerTab = 'home' | 'lot' | 'earnings'
const ownerTabs = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'lot', label: 'My lot', icon: 'parking' },
  { id: 'earnings', label: 'Earnings', icon: 'wallet' },
] as const
const recentEarnings = [
  { plate: 'ABC 1234', day: 'Sample day · 3 hrs', amount: 204 },
  { plate: 'DAX 9087', day: 'Sample day · 2 hrs', amount: 136 },
  { plate: 'NBC 5521', day: 'Previous day · 2 hrs', amount: 136 },
  { plate: 'QRT 3310', day: '2 days ago · 2 hrs', amount: 136 },
  { plate: 'HJL 2048', day: '2 days ago · 1 hr', amount: 68 },
]

export function OwnerWorkspace({
  state,
  dispatch,
  onDriver,
}: {
  state: OwnerState
  dispatch: Dispatch<OwnerAction>
  onDriver: () => void
}) {
  const [tab, setTab] = useState<OwnerTab>('home')
  const [checking, setChecking] = useState(false)
  const [code, setCode] = useState('')
  const [lookedUp, setLookedUp] = useState(false)
  const [draft, setDraft] = useState(state.settings)
  const [editingHours, setEditingHours] = useState(false)
  const [month, setMonth] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const occupied = occupiedSpaces(state)
  const booking = lookedUp
    ? state.bookings.find((item) => item.code === code.trim().toUpperCase())
    : undefined
  const gross = month ? 28000 : 8800
  const commission = gross * 0.15
  function openCheckIn(value = '') {
    setCode(value)
    setLookedUp(Boolean(value))
    setChecking(true)
  }
  function save() {
    const issue = validateLotSettings(state, draft)
    if (issue) {
      setError(issue)
      return
    }
    dispatch({ type: 'save-settings', settings: { ...draft } })
    setError('')
    setNotice('Sample lot settings saved for this preview only.')
  }
  function changeDraft(key: 'spaces' | 'hourlyRate', amount: number) {
    setDraft((current) => ({ ...current, [key]: current[key] + amount }))
    setError('')
  }
  return (
    <View style={s.ownerWorkspace}>
      <ScrollView
        contentContainerStyle={s.ownerContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.ownerHeading}>
          <View style={s.flex}>
            {tab === 'home' && (
              <Text style={s.ownerEyebrow}>PARKEY FOR OWNERS</Text>
            )}
            <Text accessibilityRole="header" style={s.ownerTitle}>
              {tab === 'home'
                ? 'Burgos Lot'
                : tab === 'lot'
                  ? 'My lot'
                  : 'Earnings'}
            </Text>
          </View>
          <IconButton
            name="user"
            label="Return to driver preview"
            onPress={onDriver}
          />
        </View>
        <Text style={s.optionMeta}>
          {tab === 'lot'
            ? 'P. Burgos St, Poblacion, Makati · Fictional lot'
            : 'Owner demo · Fictional activity and illustrative amounts'}
        </Text>
        {notice !== '' && (
          <View accessibilityLiveRegion="polite" style={s.notice}>
            <Text style={s.noticeText}>{notice}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss notification"
              onPress={() => setNotice('')}
              style={s.dismiss}
            >
              <Icon name="close" size={16} />
            </Pressable>
          </View>
        )}
        {tab === 'home' && (
          <>
            <View style={[s.outlinedCard, s.acceptingCard]}>
              <View style={s.flex}>
                <Text style={s.cardTitle}>
                  {state.accepting ? 'Accepting bookings' : 'Bookings paused'}
                </Text>
                <Text style={s.optionMeta}>
                  {state.accepting
                    ? 'Sample spaces are open in this preview'
                    : 'Existing demo arrivals are still listed'}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Accepting demo bookings"
                value={state.accepting}
                onValueChange={() => dispatch({ type: 'toggle-accepting' })}
                trackColor={{ false: '#CFC8E6', true: colors.purple }}
                thumbColor={colors.white}
              />
            </View>
            <View style={s.ownerStats}>
              <View style={[s.outlinedCard, s.flex]}>
                <Text style={s.smallText}>Sample earnings today</Text>
                <Text style={s.ownerStatValue}>₱1,240</Text>
              </View>
              <View style={[s.outlinedCard, s.flex]}>
                <Text style={s.smallText}>Occupied now</Text>
                <Text style={s.ownerStatValue}>
                  {occupied} of {state.settings.spaces}
                </Text>
              </View>
            </View>
            <Button purple onPress={() => openCheckIn()}>
              Check in a driver
            </Button>
            <View style={s.arrivalsTitle}>
              <Text style={s.sectionTitle}>Arriving on sample day</Text>
              <ParkingSticker size={67} />
            </View>
            {state.bookings.map((item) => (
              <Pressable
                key={item.code}
                accessibilityRole="button"
                accessibilityLabel={`${item.plate}, ${item.status === 'checked_in' ? 'parked' : item.status === 'completed' ? 'completed' : 'booked'}. View demo reservation.`}
                onPress={() => openCheckIn(item.code)}
                style={({ pressed }) => [s.ownerBooking, pressed && ui.pressed]}
              >
                <View style={s.flex}>
                  <Text style={s.optionName}>{item.plate}</Text>
                  <Text style={s.optionMeta}>{item.time}</Text>
                </View>
                <View
                  style={[
                    s.statusBadge,
                    item.status === 'checked_in' && s.parkedBadge,
                  ]}
                >
                  <Text style={s.statusText}>
                    {item.status === 'confirmed'
                      ? 'Booked'
                      : item.status === 'checked_in'
                        ? 'Parked'
                        : 'Completed'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        )}
        {tab === 'lot' && (
          <>
            <Text style={s.formLabel}>Spaces open for booking</Text>
            <View style={[s.outlinedCard, s.counterCard]}>
              <Counter
                label="Decrease sample spaces"
                value="−"
                disabled={draft.spaces <= occupied}
                onPress={() => changeDraft('spaces', -1)}
              />
              <View style={s.counterValue}>
                <Text style={s.counterNumber}>{draft.spaces}</Text>
                <Text style={s.smallText}>of 6 total spaces</Text>
              </View>
              <Counter
                label="Increase sample spaces"
                value="+"
                disabled={draft.spaces >= 6}
                onPress={() => changeDraft('spaces', 1)}
              />
            </View>
            <Text style={s.formLabel}>Price per hour</Text>
            <View style={[s.outlinedCard, s.counterCard]}>
              <Counter
                label="Decrease sample price"
                value="−"
                disabled={draft.hourlyRate <= 20}
                onPress={() => changeDraft('hourlyRate', -10)}
              />
              <View style={s.counterValue}>
                <Text style={s.counterNumber}>₱{draft.hourlyRate}</Text>
                <Text style={s.smallText}>Plus a ₱20 sample booking fee</Text>
              </View>
              <Counter
                label="Increase sample price"
                value="+"
                disabled={draft.hourlyRate >= 500}
                onPress={() => changeDraft('hourlyRate', 10)}
              />
            </View>
            <View style={[s.outlinedCard, s.row]}>
              <View style={s.flex}>
                <Text style={s.cardTitle}>Opening hours</Text>
                <Text style={s.optionMeta}>{draft.hours}</Text>
              </View>
              <Choice selected={false} onPress={() => setEditingHours(true)}>
                Edit
              </Choice>
            </View>
            <Text style={s.footnote}>
              Rates and schedules are illustrative. Saving does not change
              driver discovery or real inventory. Pricing and commission
              policies are not implemented.
            </Text>
            {error !== '' && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
            <Button purple onPress={save}>
              Save changes
            </Button>
          </>
        )}
        {tab === 'earnings' && (
          <>
            <View style={s.wrapChoices}>
              <Choice selected={!month} onPress={() => setMonth(false)}>
                This week
              </Choice>
              <Choice selected={month} onPress={() => setMonth(true)}>
                This month
              </Choice>
            </View>
            <View style={s.earningsIntro}>
              <Text style={s.smallText}>Sample earnings</Text>
              <Text style={s.earningsValue}>
                ₱{(gross - commission).toLocaleString('en-PH')}
              </Text>
            </View>
            <View style={s.outlinedCard}>
              <Detail
                label={`Sample bookings (${month ? 112 : 38})`}
                value={`₱${gross.toLocaleString('en-PH')}`}
              />
              <Detail
                label="Example commission (15%)"
                value={`−₱${commission.toLocaleString('en-PH')}`}
              />
              <Detail
                label="Illustrative earnings"
                value={`₱${(gross - commission).toLocaleString('en-PH')}`}
              />
            </View>
            <Text style={s.footnote}>
              Illustrative totals only. No real earnings, payout schedule, or
              GCash account is connected.
            </Text>
            <Text style={s.formLabel}>Recent sample bookings</Text>
            {recentEarnings.map((item) => (
              <View style={s.ownerBooking} key={item.plate}>
                <View style={s.flex}>
                  <Text style={s.optionName}>{item.plate}</Text>
                  <Text style={s.optionMeta}>{item.day}</Text>
                </View>
                <Text style={s.optionName}>+₱{item.amount}</Text>
              </View>
            ))}
          </>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            dispatch({ type: 'reset' })
            setDraft({
              ...state.settings,
              spaces: 6,
              hourlyRate: 80,
              hours: 'Open 24 hours',
            })
            setError('')
            setNotice('Owner preview reset.')
          }}
          style={s.resetLink}
        >
          <Text style={s.linkText}>Reset owner demo</Text>
        </Pressable>
      </ScrollView>
      <View accessibilityRole="tablist" style={s.ownerNav}>
        {ownerTabs.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.id }}
            onPress={() => {
              setTab(item.id)
              setError('')
            }}
            style={({ pressed }) => [
              s.ownerTab,
              tab === item.id && s.ownerTabSelected,
              pressed && ui.pressed,
            ]}
          >
            <Icon
              name={item.icon}
              size={20}
              color={tab === item.id ? colors.purple : colors.muted}
            />
            <Text style={[s.ownerTabLabel, tab === item.id && s.linkText]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {checking && (
        <Sheet title="Check in driver" onClose={() => setChecking(false)}>
          <Text style={s.formLabel}>Reservation code</Text>
          <TextInput
            style={s.codeInput}
            value={code}
            onChangeText={(value) => {
              setCode(value)
              setLookedUp(false)
            }}
            accessibilityLabel="Demo reservation code"
            placeholder="PKY-4821"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="search"
            onSubmitEditing={() => setLookedUp(true)}
          />
          <Button secondary onPress={() => setLookedUp(true)}>
            Find demo reservation
          </Button>
          <Pressable
            accessibilityRole="button"
            style={s.resetLink}
            onPress={() => {
              setCode('PKY-4821')
              setLookedUp(true)
            }}
          >
            <Text style={s.linkText}>Use sample code PKY-4821</Text>
          </Pressable>
          {lookedUp && !booking && (
            <Text accessibilityRole="alert" style={s.error}>
              No sample reservation matches this code.
            </Text>
          )}
          {booking && (
            <>
              <View style={s.checkinCard}>
                <View style={s.checkinBanner}>
                  <Icon name="check" color={colors.white} size={19} />
                  <Text style={s.checkinBannerText}>
                    Sample reservation found
                  </Text>
                </View>
                <View style={s.checkinDetails}>
                  <Detail label="Plate" value={booking.plate} />
                  <Detail label="Time" value={booking.time} />
                  <Detail
                    label="Payment"
                    value="Demo only · No payment collected"
                  />
                  <Detail
                    label="Status"
                    value={
                      booking.status === 'confirmed'
                        ? 'Booked'
                        : booking.status === 'checked_in'
                          ? 'Parked'
                          : 'Completed'
                    }
                  />
                </View>
              </View>
              {booking.status === 'confirmed' && (
                <>
                  <Button
                    purple
                    disabled={occupied >= state.settings.spaces}
                    onPress={() => {
                      dispatch({ type: 'check-in', code: booking.code })
                      setNotice(`${booking.plate} checked in to this preview.`)
                      setChecking(false)
                    }}
                  >
                    Confirm demo arrival
                  </Button>
                  {occupied >= state.settings.spaces && (
                    <Text style={s.footnote}>
                      The sample lot is full. Check out a parked demo vehicle
                      first.
                    </Text>
                  )}
                </>
              )}
              {booking.status === 'checked_in' && (
                <Button
                  purple
                  onPress={() => {
                    dispatch({ type: 'check-out', code: booking.code })
                    setNotice(`${booking.plate} checked out of this preview.`)
                    setChecking(false)
                  }}
                >
                  Check out demo driver
                </Button>
              )}
            </>
          )}
          <Text style={s.footnote}>
            All codes and plates here are fictional. Camera scanning, payment
            verification, and real entry authorization are not connected.
          </Text>
        </Sheet>
      )}
      {editingHours && (
        <Sheet
          title="Sample opening hours"
          onClose={() => setEditingHours(false)}
        >
          {(
            ['Open 24 hours', '08:00–22:00'] satisfies LotSettings['hours'][]
          ).map((hours) => (
            <View key={hours} style={s.hoursChoice}>
              <Choice
                selected={draft.hours === hours}
                onPress={() => {
                  setDraft((current) => ({ ...current, hours }))
                  setEditingHours(false)
                }}
              >
                {hours}
              </Choice>
            </View>
          ))}
          <Text style={s.footnote}>
            Choose a sample schedule, then save changes on My lot.
          </Text>
        </Sheet>
      )}
    </View>
  )
}
function Counter({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string
  value: string
  onPress: () => void
  disabled: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.counterButton,
        disabled && ui.disabled,
        pressed && ui.pressed,
      ]}
    >
      <Text style={s.counterSign}>{value}</Text>
    </Pressable>
  )
}
