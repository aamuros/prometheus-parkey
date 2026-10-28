import type { ReservationStatus } from '@parkey/shared-types'

export type DemoReservation = {
  id: string
  driver: string
  initials: string
  plate: string
  vehicle: string
  bay: string
  arrival: string
  departure: string
  status: ReservationStatus
}

export const reservations: DemoReservation[] = [
  {
    id: 'PK-1028',
    driver: 'Alex Santos',
    initials: 'AS',
    plate: 'DEMO 101',
    vehicle: 'White sedan',
    bay: 'A-01',
    arrival: '09:00',
    departure: '12:00',
    status: 'checked_in',
  },
  {
    id: 'PK-1029',
    driver: 'Sam Reyes',
    initials: 'SR',
    plate: 'DEMO 102',
    vehicle: 'Silver SUV',
    bay: 'A-03',
    arrival: '09:30',
    departure: '12:30',
    status: 'checked_in',
  },
  {
    id: 'PK-1030',
    driver: 'Jamie Cruz',
    initials: 'JC',
    plate: 'DEMO 103',
    vehicle: 'Black hatchback',
    bay: 'A-06',
    arrival: '10:00',
    departure: '13:00',
    status: 'checked_in',
  },
  {
    id: 'PK-1031',
    driver: 'Taylor Lim',
    initials: 'TL',
    plate: 'DEMO 104',
    vehicle: 'Blue sedan',
    bay: 'B-02',
    arrival: '10:30',
    departure: '13:30',
    status: 'checked_in',
  },
  {
    id: 'PK-1032',
    driver: 'Casey Tan',
    initials: 'CT',
    plate: 'DEMO 105',
    vehicle: 'White SUV',
    bay: 'A-02',
    arrival: '11:00',
    departure: '14:00',
    status: 'confirmed',
  },
  {
    id: 'PK-1033',
    driver: 'Jordan Garcia',
    initials: 'JG',
    plate: 'DEMO 106',
    vehicle: 'Red sedan',
    bay: 'A-05',
    arrival: '11:30',
    departure: '14:30',
    status: 'confirmed',
  },
  {
    id: 'PK-1034',
    driver: 'Riley Flores',
    initials: 'RF',
    plate: 'DEMO 107',
    vehicle: 'Gray hatchback',
    bay: 'B-01',
    arrival: '12:00',
    departure: '15:00',
    status: 'confirmed',
  },
  {
    id: 'PK-1026',
    driver: 'Morgan Lee',
    initials: 'ML',
    plate: 'DEMO 108',
    vehicle: 'White sedan',
    bay: 'A-04',
    arrival: '07:00',
    departure: '09:00',
    status: 'completed',
  },
]

export const bays = ['A', 'B'].flatMap((row) =>
  Array.from(
    { length: 8 },
    (_, i) => `${row}-${String(i + 1).padStart(2, '0')}`,
  ),
)

export type WorkspaceState = {
  reservations: DemoReservation[]
  blockedBays: string[]
}
export const initialWorkspace: WorkspaceState = {
  reservations,
  blockedBays: ['B-08'],
}
export type WorkspaceAction =
  | { type: 'reservation'; id: string; status: ReservationStatus }
  | { type: 'toggle-bay'; bay: string }
  | { type: 'reset' }

export function activeReservation(state: WorkspaceState, bay: string) {
  return state.reservations.find(
    (reservation) =>
      reservation.bay === bay &&
      (reservation.status === 'confirmed' ||
        reservation.status === 'checked_in'),
  )
}

// Session-only interaction rules for this preview, never booking authority.
export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  if (action.type === 'reset') return initialWorkspace
  if (action.type === 'toggle-bay') {
    if (!bays.includes(action.bay) || activeReservation(state, action.bay))
      return state
    return {
      ...state,
      blockedBays: state.blockedBays.includes(action.bay)
        ? state.blockedBays.filter((bay) => bay !== action.bay)
        : [...state.blockedBays, action.bay],
    }
  }
  return {
    ...state,
    reservations: state.reservations.map((reservation) => {
      if (reservation.id !== action.id) return reservation
      const allowed =
        (reservation.status === 'confirmed' &&
          (action.status === 'checked_in' || action.status === 'cancelled')) ||
        (reservation.status === 'checked_in' && action.status === 'completed')
      return allowed ? { ...reservation, status: action.status } : reservation
    }),
  }
}

export const statusLabels: Record<ReservationStatus, string> = {
  held: 'On hold',
  confirmed: 'Upcoming',
  checked_in: 'Parked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  no_show: 'No show',
}

export function filterReservations(
  items: DemoReservation[],
  search: string,
  status: string,
) {
  const query = search.trim().toLowerCase()
  return items.filter(
    (item) =>
      (status === 'all' || item.status === status) &&
      `${item.id} ${item.driver} ${item.plate} ${item.bay}`
        .toLowerCase()
        .includes(query),
  )
}
