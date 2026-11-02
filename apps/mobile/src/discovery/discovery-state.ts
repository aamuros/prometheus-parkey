export type DiscoveryState =
  'zoomed-out' | 'location-off' | 'filtered' | 'loading' | 'empty' | 'ready'

/** Connectivity is a separate banner so cached places stay browsable. */
export function discoveryState({
  canQuery,
  locationDenied,
  filteredOut,
  loading,
  count,
}: {
  canQuery: boolean
  locationDenied: boolean
  filteredOut: boolean
  loading: boolean
  count: number
}): DiscoveryState {
  if (!canQuery) return 'zoomed-out'
  if (locationDenied) return 'location-off'
  if (loading && count === 0) return 'loading'
  if (filteredOut) return 'filtered'
  return count === 0 ? 'empty' : 'ready'
}

export function isNightNavigation(
  navigating: boolean,
  hour: number,
  scheme: string | null | undefined,
): boolean {
  return navigating && (scheme === 'dark' || hour < 6 || hour >= 18)
}
