import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'

import { anchor, distanceLabel, kindLabels } from './model.ts'
import { parkingTitle } from './presentation.ts'

export type ParkingDetailRow = {
  icon: 'clock' | 'fees' | 'access' | 'list'
  label: string
  value: string
}

function recordedText(value: string | null): string | null {
  const text = value?.trim()
  return !text ||
    /\b(?:unknown|unavailable|not recorded)\b|^(?:n\/a|none|-)$/i.test(text)
    ? null
    : text
}

function feeSummary(fees: string | null): 'Free' | 'Paid' | null {
  if (!fees) return null
  if (/^(?:free(?: parking)?|no (?:fee|charge))$/i.test(fees)) return 'Free'
  if (
    /^(?:paid(?: parking)?|fee applies(?:; amount unavailable)?)$/i.test(fees)
  )
    return 'Paid'
  const amount = /^(?:PHP|₱)\s*(\d[\d,]*(?:\.\d+)?)/i.exec(fees)?.[1]
  return amount && Number(amount.replaceAll(',', '')) > 0 ? 'Paid' : null
}

export function parkingDetailData(
  parking: DiscoveryParking,
  location: Coordinate | null,
): { title: string; meta: string; rows: ParkingDetailRow[] } {
  const fees = parking.fees?.trim() || null
  const fee = feeSummary(fees)
  const rows: ParkingDetailRow[] = []
  const hours = recordedText(parking.hours)
  if (hours) rows.push({ icon: 'clock', label: 'Hours', value: hours })
  const feeDetails = recordedText(fees)
  if (
    feeDetails &&
    !/^(?:free(?: parking)?|no (?:fee|charge)|paid(?: parking)?|fee applies)$/i.test(
      feeDetails,
    )
  )
    rows.push({ icon: 'fees', label: 'Fees', value: feeDetails })
  for (const rule of parking.regulations) {
    // The importer adds a generic geometry warning, not a fact about this spot.
    if (rule.sourceLabel === 'Parkey import geometry note') continue
    const value = recordedText(rule.description)?.replace(
      ' recorded by OpenStreetMap',
      '',
    )
    if (!value || rows.some((row) => row.value === value)) continue
    const access = /^(?:access|road ownership)\b/i.test(value)
    rows.push({
      icon: access ? 'access' : 'list',
      label: access ? 'Access' : 'Restrictions',
      value,
    })
  }
  return {
    title: recordedText(parking.name)
      ? parkingTitle(parking)
      : kindLabels[parking.kind],
    meta: [
      kindLabels[parking.kind],
      parking.sourceLabel === 'Private draft on this device'
        ? 'Private draft'
        : null,
      fee,
      location
        ? distanceLabel(location, anchor(parking.geometry)).split(' from ')[0]
        : null,
    ]
      .filter(Boolean)
      .join(' · '),
    rows,
  }
}
