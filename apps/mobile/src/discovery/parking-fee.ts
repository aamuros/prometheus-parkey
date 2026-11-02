import type { DiscoveryParking } from '@parkey/shared-types'

/** Only explicit source values establish a parking fee. */
export function parkingFee(parking: DiscoveryParking): string | undefined {
  const tags = parking.osmTags ?? {}
  const rawFees = parking.fees?.trim()
  const fees =
    rawFees &&
    !/\b(?:unknown|unavailable|not recorded)\b|^(?:n\/a|none|-)$/i.test(rawFees)
      ? rawFees
      : undefined
  const rawCharge = tags.charge?.trim()
  const charge =
    rawCharge &&
    !/\b(?:unknown|unavailable|not recorded)\b|^(?:n\/a|none|-)$/i.test(
      rawCharge,
    )
      ? rawCharge
      : undefined
  return tags.fee === 'no' ||
    /^(?:free(?: parking)?|no (?:fee|charge)|OSM records no fee; check posted signs)$/i.test(
      fees ?? '',
    )
    ? 'Free'
    : tags.fee === 'yes' ||
        charge ||
        /^(?:paid(?: parking)?|fee applies|PHP\s*\d|₱\s*\d)/i.test(fees ?? '')
      ? (charge ?? (fees && /^(?:PHP|₱)/i.test(fees) ? fees : 'Paid'))
      : undefined
}
