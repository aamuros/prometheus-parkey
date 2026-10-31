/** Development fixtures must never become a user-selectable release dataset. */
export function developmentSamplesEnabled(
  requested: boolean,
  environment: string | undefined,
): boolean {
  return requested && environment === 'development'
}

/** Remove only the historical dataset qualifier; preserve actual source credits. */
export function displaySourceLabel(label: string): string {
  return label === '© OpenStreetMap contributors · pilot snapshot'
    ? '© OpenStreetMap contributors'
    : label
}

/** Align refreshes to minute boundaries without a zero-delay timer loop. */
export function millisecondsToNextMinute(now: number): number {
  return Number.isSafeInteger(now) && now >= 0 && now <= 8640000000000000
    ? 60000 - (now % 60000)
    : 60000
}
import type { DiscoveryParking } from '@parkey/shared-types'

import { hoursLabel, hoursStatus } from './hours.ts'
import { anchor, distanceLabel, kindLabels } from './model.ts'
import type { ParkingReference } from './model.ts'

/** Presentation only: preserve names and provenance on the underlying record. */
export function parkingTitle(parking: DiscoveryParking): string {
  const name = parking.name.trim()
  return !name ||
    /^Unnamed (?:parking|street parking|garage)(?: · .+)?$/i.test(name)
    ? kindLabels[parking.kind]
    : name
}

export function parkingRowText(
  parking: DiscoveryParking,
  reference: ParkingReference,
  now: Date,
) {
  const hours = parking.hours?.trim()
  const fees = parking.fees?.trim()
  const status = hoursStatus(parking.hours, now)
  const hoursFact = hours
    ? status === 'unknown'
      ? `Recorded hours: ${hours}`
      : `${hoursLabel(status)} · recorded schedule`
    : null
  return {
    title: parkingTitle(parking),
    distance: distanceLabel(
      reference.coordinate,
      anchor(parking.geometry),
      reference.label,
    ).replace(' · straight line', ''),
    verification:
      parking.sourceKind === 'sample'
        ? 'Sample'
        : parking.verification === 'verified'
          ? 'Verified information'
          : 'Unverified',
    facts:
      [hoursFact, fees].filter(Boolean).join(' · ') ||
      'Hours and fees not recorded',
  }
}
