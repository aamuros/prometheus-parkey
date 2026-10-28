// Session-only Figma fixtures. These are not live availability or reservations.
export type ParkingPlace = {
  id: string
  name: string
  street: string
  minutes: number
  meters: number
  rate: number
  spaces: number
  covered: boolean
  ev: boolean
}

export const parkingPlaces: readonly ParkingPlace[] = [
  {
    id: 'polaris',
    name: 'Polaris Garage',
    street: 'Polaris St',
    minutes: 2,
    meters: 120,
    rate: 80,
    spaces: 5,
    covered: true,
    ev: true,
  },
  {
    id: 'kalayaan',
    name: 'Kalayaan Garage',
    street: 'Kalayaan Ave',
    minutes: 4,
    meters: 280,
    rate: 120,
    spaces: 12,
    covered: true,
    ev: false,
  },
  {
    id: 'burgos',
    name: 'Burgos Street Lot',
    street: 'P. Burgos St',
    minutes: 6,
    meters: 450,
    rate: 60,
    spaces: 2,
    covered: true,
    ev: false,
  },
  {
    id: 'street',
    name: 'Polaris Street Parking',
    street: 'Polaris St',
    minutes: 7,
    meters: 510,
    rate: 100,
    spaces: 3,
    covered: true,
    ev: false,
  },
  {
    id: 'garden',
    name: 'Poblacion Parking',
    street: 'P. Burgos St',
    minutes: 8,
    meters: 590,
    rate: 90,
    spaces: 6,
    covered: true,
    ev: true,
  },
]

export type Filters = { covered: boolean; ev: boolean; budget: boolean }
export function filterPlaces(query: string, filters: Filters): ParkingPlace[] {
  const search = query.trim().toLowerCase()
  const destination = [
    'polaris street',
    'polaris st',
    'polaris st, poblacion',
    'poblacion, makati',
    'poblacion',
    'makati',
    'kalayaan avenue',
    'p. burgos street',
  ].includes(search)
  return parkingPlaces.filter(
    (place) =>
      (!search ||
        destination ||
        `${place.name} ${place.street}`.toLowerCase().includes(search)) &&
      (!filters.covered || place.covered) &&
      (!filters.ev || place.ev) &&
      (!filters.budget || place.rate < 100),
  )
}

export const serviceFee = 15
export function previewTotal(place: ParkingPlace, hours: number): number {
  return place.rate * hours + serviceFee
}
export function timeLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 10)
}
export function timeRangeLabel(arrival: number, hours: number): string {
  const start = timeLabel(arrival)
  const end = timeLabel(arrival + hours * 60)
  return `${start.endsWith(end.slice(-2)) ? start.slice(0, -3) : start} – ${end}`
}
export function formattedPhone(phone: string): string {
  const digits = phoneDigits(phone)
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)]
    .filter(Boolean)
    .join(' ')
}
export function validPhone(phone: string): boolean {
  return /^9\d{9}$/.test(phoneDigits(phone))
}

export type PreviewBooking = {
  id: string
  placeId: string
  hours: number
  arrival: number
  total: number
  slot: string
  code: string
  status: 'reserved' | 'cancelled' | 'completed'
  day: string
}
export type PreviewState = {
  phone: string
  reminders: boolean
  saved: readonly string[]
  vehicle: { name: string; plate: string }
  bookings: readonly PreviewBooking[]
  nextBooking: number
}
export const initialPreview: PreviewState = {
  phone: '9171234567',
  reminders: true,
  saved: [],
  vehicle: { name: 'Toyota Vios', plate: 'ABC 1234' },
  bookings: [
    {
      id: 'sample-4821',
      placeId: 'polaris',
      hours: 3,
      arrival: 1110,
      total: 255,
      slot: 'B-12',
      code: 'PK-4821',
      status: 'reserved',
      day: 'Today',
    },
    {
      id: 'sample-4820',
      placeId: 'kalayaan',
      hours: 2,
      arrival: 840,
      total: 240,
      slot: 'A-04',
      code: 'PK-4820',
      status: 'completed',
      day: 'Oct 21',
    },
    {
      id: 'sample-4819',
      placeId: 'burgos',
      hours: 1,
      arrival: 840,
      total: 60,
      slot: 'C-02',
      code: 'PK-4819',
      status: 'completed',
      day: 'Oct 14',
    },
  ],
  nextBooking: 4822,
}
export type PreviewAction =
  | { type: 'phone'; phone: string }
  | { type: 'reminders'; enabled: boolean }
  | { type: 'save'; placeId: string }
  | { type: 'vehicle'; name: string; plate: string }
  | { type: 'reserve'; placeId: string; hours: number; arrival: number }
  | { type: 'cancel'; id: string }
  | { type: 'reset' }

export function previewReducer(
  state: PreviewState,
  action: PreviewAction,
): PreviewState {
  switch (action.type) {
    case 'phone':
      return validPhone(action.phone)
        ? { ...state, phone: phoneDigits(action.phone) }
        : state
    case 'reminders':
      return { ...state, reminders: action.enabled }
    case 'save':
      return parkingPlaces.some((p) => p.id === action.placeId)
        ? {
            ...state,
            saved: state.saved.includes(action.placeId)
              ? state.saved.filter((id) => id !== action.placeId)
              : [...state.saved, action.placeId],
          }
        : state
    case 'vehicle':
      return {
        ...state,
        vehicle: {
          name: action.name.trim(),
          plate: action.plate.trim().toUpperCase(),
        },
      }
    case 'reserve': {
      const place = parkingPlaces.find((p) => p.id === action.placeId)
      if (
        !place ||
        !Number.isInteger(action.hours) ||
        action.hours < 1 ||
        action.hours > 4 ||
        ![540, 720, 900, 1110].includes(action.arrival)
      )
        return state
      // Keep repeated taps and overlapping sample bookings from creating duplicates.
      if (
        state.bookings.some(
          (b) =>
            b.status === 'reserved' &&
            b.day === 'Today' &&
            action.arrival < b.arrival + b.hours * 60 &&
            b.arrival < action.arrival + action.hours * 60,
        )
      )
        return state
      const number = state.nextBooking
      return {
        ...state,
        nextBooking: number + 1,
        bookings: [
          {
            id: `sample-${number}`,
            placeId: place.id,
            hours: action.hours,
            arrival: action.arrival,
            total: previewTotal(place, action.hours),
            slot: 'B-12',
            code: `PK-${number}`,
            status: 'reserved',
            day: 'Today',
          },
          ...state.bookings,
        ],
      }
    }
    case 'cancel':
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id && b.status === 'reserved'
            ? { ...b, status: 'cancelled' }
            : b,
        ),
      }
    case 'reset':
      return initialPreview
  }
}
