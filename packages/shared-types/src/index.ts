/** Display metadata shared by the starter applications; not a domain model. */
export type AppInfo = {
  name: string
  description: string
}

/** Schema-backed vocabularies; no runtime values or authorization decisions. */
export type VerificationStatus =
  'pending' | 'verified' | 'rejected' | 'suspended'

export type OperatorStaffRole = 'owner' | 'staff'

export type InventoryUnitKind = 'dedicated_space' | 'capacity_unit'

export type ReservationStatus =
  | 'held'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'no_show'
