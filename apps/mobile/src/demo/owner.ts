export type OwnerBooking = {
  code: string
  plate: string
  time: string
  status: 'confirmed' | 'checked_in' | 'completed'
}
export type LotSettings = {
  spaces: number
  hourlyRate: number
  hours: 'Open 24 hours' | '08:00–22:00'
}
export type OwnerState = {
  accepting: boolean
  settings: LotSettings
  bookings: OwnerBooking[]
}
export const initialOwner: OwnerState = {
  accepting: true,
  settings: { spaces: 6, hourlyRate: 80, hours: 'Open 24 hours' },
  bookings: [
    {
      code: 'PKY-4821',
      plate: 'ABC 1234',
      time: '7:00–10:00 PM · 3 hrs',
      status: 'confirmed',
    },
    {
      code: 'PKY-4822',
      plate: 'NBC 5521',
      time: '7:30–9:30 PM · 2 hrs',
      status: 'confirmed',
    },
    {
      code: 'PKY-4818',
      plate: 'DAX 9087',
      time: '6:00–8:00 PM · 2 hrs',
      status: 'checked_in',
    },
    {
      code: 'PKY-4823',
      plate: 'KRT 2290',
      time: '9:00–11:00 PM · 2 hrs',
      status: 'confirmed',
    },
    {
      code: 'PKY-4817',
      plate: 'MPL 7710',
      time: '6:00–9:00 PM · 3 hrs',
      status: 'checked_in',
    },
    {
      code: 'PKY-4816',
      plate: 'TGB 4402',
      time: '5:00–8:00 PM · 3 hrs',
      status: 'checked_in',
    },
  ],
}
export type OwnerAction =
  | { type: 'toggle-accepting' }
  | { type: 'save-settings'; settings: LotSettings }
  | { type: 'check-in'; code: string }
  | { type: 'check-out'; code: string }
  | { type: 'reset' }
export function occupiedSpaces(state: OwnerState) {
  return state.bookings.filter((booking) => booking.status === 'checked_in')
    .length
}
export function validateLotSettings(
  state: OwnerState,
  settings: LotSettings,
): string | null {
  if (
    !Number.isInteger(settings.spaces) ||
    settings.spaces < occupiedSpaces(state) ||
    settings.spaces > 6
  )
    return 'Sample capacity must cover parked vehicles and cannot exceed 6 spaces.'
  if (
    !Number.isInteger(settings.hourlyRate) ||
    settings.hourlyRate < 20 ||
    settings.hourlyRate > 500
  )
    return 'Choose a sample hourly rate from ₱20 to ₱500.'
  if (settings.hours !== 'Open 24 hours' && settings.hours !== '08:00–22:00')
    return 'Choose one of the sample opening schedules.'
  return null
}
// Local owner preview only. This does not authorize access or change real inventory.
export function ownerReducer(
  state: OwnerState,
  action: OwnerAction,
): OwnerState {
  switch (action.type) {
    case 'reset':
      return initialOwner
    case 'toggle-accepting':
      return { ...state, accepting: !state.accepting }
    case 'save-settings':
      return validateLotSettings(state, action.settings)
        ? state
        : { ...state, settings: action.settings }
    case 'check-in':
      if (occupiedSpaces(state) >= state.settings.spaces) return state
      return {
        ...state,
        bookings: state.bookings.map((booking) =>
          booking.code === action.code && booking.status === 'confirmed'
            ? { ...booking, status: 'checked_in' }
            : booking,
        ),
      }
    case 'check-out':
      return {
        ...state,
        bookings: state.bookings.map((booking) =>
          booking.code === action.code && booking.status === 'checked_in'
            ? { ...booking, status: 'completed' }
            : booking,
        ),
      }
  }
}
