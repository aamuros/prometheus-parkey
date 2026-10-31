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
