import type { DiscoveryParking } from '@parkey/shared-types'

// Deliberately fictional. These records are opt-in, never production seed data.
const metadata = {
  address: 'Illustrative coordinates in Poblacion, Makati',
  fees: null,
  hours: null,
  regulations: [],
  sourceKind: 'sample',
  sourceLabel: 'Parkey development fixture — not a real parking claim',
  sourceUrl: null,
  license: 'Development sample only',
  sourceUpdatedAt: null,
  verification: 'unverified',
  verifiedAt: null,
} as const
export const sampleParking: DiscoveryParking[] = [
  {
    ...metadata,
    id: 'sample-lot',
    name: 'SAMPLE · Parking lot',
    kind: 'lot',
    side: 'unknown',
    geometry: { type: 'Point', coordinates: [121.0304, 14.5645] },
    regulations: [],
  },
  {
    ...metadata,
    id: 'sample-garage',
    name: 'SAMPLE · Garage',
    kind: 'garage',
    side: 'unknown',
    geometry: { type: 'Point', coordinates: [121.033, 14.566] },
    regulations: [],
  },
  {
    ...metadata,
    id: 'sample-street',
    name: 'SAMPLE · Street segment',
    kind: 'street',
    side: 'unknown',
    geometry: {
      type: 'LineString',
      coordinates: [
        [121.0306, 14.5656],
        [121.0313, 14.5657],
        [121.032, 14.5658],
      ],
    },
    regulations: [
      {
        description:
          'Illustration only. Parking permission and restrictions are unknown.',
        sourceLabel: metadata.sourceLabel,
        sourceUrl: null,
        observedAt: null,
      },
    ],
  },
]
