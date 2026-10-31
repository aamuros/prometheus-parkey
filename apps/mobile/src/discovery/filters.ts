import type { DiscoveryParking } from '@parkey/shared-types'

export type DiscoveryFilter = 'all' | 'street' | 'facilities' | 'lot' | 'garage'
export type FeeFilter = 'all' | 'applies'
export type FilterPartition = {
  matched: DiscoveryParking[]
  nonmatched: DiscoveryParking[]
  unknown: DiscoveryParking[]
}

/** Free-form source fees cannot establish a price or a free-parking claim. */
export function partitionParking(
  records: DiscoveryParking[],
  kind: DiscoveryFilter,
  fees: FeeFilter = 'all',
): FilterPartition {
  const result: FilterPartition = { matched: [], nonmatched: [], unknown: [] }
  for (const record of records) {
    const kindMatches =
      kind === 'all' ||
      (kind === 'facilities' ? record.kind !== 'street' : record.kind === kind)
    if (!kindMatches) result.nonmatched.push(record)
    else if (
      fees === 'all' ||
      record.fees?.trim() === 'Fee applies; amount unavailable'
    )
      result.matched.push(record)
    else result.unknown.push(record)
  }
  return result
}
