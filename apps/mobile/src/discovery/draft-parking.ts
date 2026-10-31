import type {
  DiscoveryParking,
  ParkingContribution,
} from '@parkey/shared-types'

import { kindLabels } from './model.ts'

/** Device-local previews are never uploaded or marked verified. */
export function draftParking(draft: ParkingContribution): DiscoveryParking {
  return {
    id: draft.id,
    name: draft.name.trim() || kindLabels[draft.kind],
    kind: draft.kind,
    geometry: draft.geometry,
    address: null,
    side: draft.side,
    fees: draft.fees.trim() || null,
    hours: draft.hours.trim() || null,
    regulations: draft.restrictions.trim()
      ? [
          {
            description: draft.restrictions.trim(),
            sourceLabel: 'Private draft on this device',
            sourceUrl: null,
            observedAt: draft.createdAt,
          },
        ]
      : [],
    sourceKind: 'community',
    sourceLabel: 'Private draft on this device',
    sourceUrl: null,
    license: '',
    sourceUpdatedAt: draft.createdAt,
    verification: 'unverified',
    verifiedAt: null,
  }
}
