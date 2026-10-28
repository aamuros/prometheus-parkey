import type { ReservationStatus } from '@parkey/shared-types'

export type DemoLocation = {
  id: string
  name: string
  address: string
  walk: string
  covered: boolean
  available: number
  hourlyRate: number
  description: string
}

export const locations: DemoLocation[] = [
  {
    id: 'courtyard',
    name: 'Burgos Lot',
    address: 'P. Burgos St, Poblacion',
    walk: '3 min walk',
    covered: true,
    available: 4,
    hourlyRate: 80,
    description:
      'A covered neighborhood lot with an attendant and clearly marked spaces. Fictional location for exploring Parkey.',
  },
  {
    id: 'corner',
    name: 'Polaris Parking',
    address: 'Polaris St, Poblacion',
    walk: '5 min walk',
    covered: false,
    available: 2,
    hourlyRate: 100,
    description:
      'An open-air lot with easy entry from the neighborhood. Fictional location; directions and live availability are not connected.',
  },
  {
    id: 'garden',
    name: 'Kalayaan Garage',
    address: 'Kalayaan Ave, Makati',
    walk: '7 min walk',
    covered: true,
    available: 9,
    hourlyRate: 120,
    description:
      'A small covered garage. A fictional garage for exploring the reservation flow.',
  },
]
export const sampleDates = [
  { value: '2026-10-27', label: 'Tue, 27 Oct' },
  { value: '2026-10-28', label: 'Wed, 28 Oct' },
  { value: '2026-10-29', label: 'Thu, 29 Oct' },
]
export const arrivalTimes = [
  '09:00',
  '11:00',
  '13:00',
  '15:00',
  '17:00',
  '19:00',
]
export const sampleBookingFee = 20
export type DemoVehicle = { id: string; label: string; plate: string }
export type DemoTrip = {
  id: string
  locationId: string
  vehicleId: string
  vehicleLabel: string
  plate: string
  date: string
  arrival: string
  hours: number
  estimate: number
  status: ReservationStatus
}
export type DriverState = {
  vehicles: DemoVehicle[]
  trips: DemoTrip[]
  nextVehicle: number
  nextTrip: number
}
export const initialDriver: DriverState = {
  vehicles: [{ id: 'vehicle-1', label: 'My sedan', plate: 'DEMO 201' }],
  trips: [
    {
      id: 'DEMO-1000',
      locationId: 'corner',
      vehicleId: 'vehicle-1',
      vehicleLabel: 'My sedan',
      plate: 'DEMO 201',
      date: '2026-10-26',
      arrival: '09:00',
      hours: 2,
      estimate: 90,
      status: 'completed',
    },
  ],
  nextVehicle: 2,
  nextTrip: 1001,
}
export type BookingDraft = {
  locationId: string
  vehicleId: string
  date: string
  arrival: string
  hours: number
}
export type DriverAction =
  | { type: 'book'; draft: BookingDraft }
  | { type: 'cancel'; id: string }
  | { type: 'extend'; id: string }
  | { type: 'add-vehicle'; label: string; plate: string }
  | { type: 'remove-vehicle'; id: string }
  | { type: 'reset' }

export function isActive(trip: DemoTrip) {
  return trip.status === 'confirmed' || trip.status === 'checked_in'
}
export function vehicleInUse(state: DriverState, id: string) {
  return state.trips.some((trip) => trip.vehicleId === id && isActive(trip))
}
export function sampleAvailability(state: DriverState, location: DemoLocation) {
  return Math.max(
    0,
    location.available -
      state.trips.filter(
        (trip) => trip.locationId === location.id && isActive(trip),
      ).length,
  )
}
export function normalizePlate(plate: string) {
  return plate.trim().toUpperCase().replace(/\s+/g, ' ')
}
export function validateVehicle(
  state: DriverState,
  label: string,
  plate: string,
): string | null {
  if (label.trim().length < 2 || label.trim().length > 30)
    return 'Enter a vehicle name with 2–30 characters.'
  const normalized = normalizePlate(plate)
  if (!/^[A-Z0-9][A-Z0-9 -]{1,11}$/.test(normalized))
    return 'Use 2–12 letters, numbers, spaces, or hyphens for the plate.'
  if (
    state.vehicles.some(
      (vehicle) =>
        vehicle.plate.replace(/[ -]/g, '') === normalized.replace(/[ -]/g, ''),
    )
  )
    return 'That plate is already in your demo vehicles.'
  return null
}

// Preview guards only; real availability, pricing, and policies require a server.
export function validateBooking(
  state: DriverState,
  draft: BookingDraft,
): string | null {
  const location = locations.find((item) => item.id === draft.locationId)
  if (!location || sampleAvailability(state, location) < 1)
    return 'No sample spaces are available at this location.'
  if (!state.vehicles.some((vehicle) => vehicle.id === draft.vehicleId))
    return 'Add or select a vehicle first.'
  if (
    !sampleDates.some((date) => date.value === draft.date) ||
    !arrivalTimes.includes(draft.arrival) ||
    !Number.isInteger(draft.hours) ||
    draft.hours < 1 ||
    draft.hours > 4
  )
    return 'Choose a sample date, arrival time, and duration.'
  const start = Number(draft.arrival.slice(0, 2))
  const overlaps = state.trips.some((trip) => {
    const existingStart = Number(trip.arrival.slice(0, 2))
    return (
      isActive(trip) &&
      trip.vehicleId === draft.vehicleId &&
      trip.date === draft.date &&
      start < existingStart + trip.hours &&
      existingStart < start + draft.hours
    )
  })
  return overlaps
    ? 'This vehicle already has a demo trip during that time. Choose another time or vehicle.'
    : null
}

export function driverReducer(
  state: DriverState,
  action: DriverAction,
): DriverState {
  switch (action.type) {
    case 'reset':
      return initialDriver
    case 'add-vehicle':
      if (validateVehicle(state, action.label, action.plate)) return state
      return {
        ...state,
        nextVehicle: state.nextVehicle + 1,
        vehicles: [
          ...state.vehicles,
          {
            id: `vehicle-${state.nextVehicle}`,
            label: action.label.trim(),
            plate: normalizePlate(action.plate),
          },
        ],
      }
    case 'remove-vehicle':
      if (vehicleInUse(state, action.id)) return state
      return {
        ...state,
        vehicles: state.vehicles.filter((vehicle) => vehicle.id !== action.id),
      }
    case 'extend': {
      const trip = state.trips.find((item) => item.id === action.id)
      if (!trip || trip.status !== 'confirmed') return state
      const draft = { ...trip, hours: trip.hours + 1 }
      const withoutTrip = {
        ...state,
        trips: state.trips.filter((item) => item.id !== trip.id),
      }
      if (validateBooking(withoutTrip, draft)) return state
      const location = locations.find((item) => item.id === trip.locationId)
      if (!location) return state
      return {
        ...state,
        trips: state.trips.map((item) =>
          item.id === trip.id
            ? {
                ...item,
                hours: draft.hours,
                estimate: location.hourlyRate * draft.hours + sampleBookingFee,
              }
            : item,
        ),
      }
    }
    case 'cancel':
      return {
        ...state,
        trips: state.trips.map((trip) =>
          trip.id === action.id && trip.status === 'confirmed'
            ? { ...trip, status: 'cancelled' }
            : trip,
        ),
      }
    case 'book': {
      if (validateBooking(state, action.draft)) return state
      const location = locations.find(
        (item) => item.id === action.draft.locationId,
      )
      const vehicle = state.vehicles.find(
        (item) => item.id === action.draft.vehicleId,
      )
      if (!location || !vehicle) return state
      return {
        ...state,
        nextTrip: state.nextTrip + 1,
        trips: [
          {
            ...action.draft,
            id: `DEMO-${state.nextTrip}`,
            vehicleLabel: vehicle.label,
            plate: vehicle.plate,
            estimate:
              location.hourlyRate * action.draft.hours + sampleBookingFee,
            status: 'confirmed',
          },
          ...state.trips,
        ],
      }
    }
  }
}

export function departureTime(arrival: string, hours: number) {
  return `${String(Number(arrival.slice(0, 2)) + hours).padStart(2, '0')}:00`
}
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat('en-PH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date(`${date}T00:00:00+08:00`))
}

export function displayTime(time: string) {
  const hour = Number(time.slice(0, 2))
  return `${hour % 12 || 12}:${time.slice(3)} ${hour >= 12 ? 'PM' : 'AM'}`
}
