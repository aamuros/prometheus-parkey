import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'
import type { FeatureCollection, LineString, Point } from 'geojson'

export function parkingGeoJSON(
  records: DiscoveryParking[],
  selectedId: string | null,
): FeatureCollection<Point | LineString> {
  return {
    type: 'FeatureCollection',
    features: records.map((record) => ({
      type: 'Feature',
      id: record.id,
      geometry: record.geometry,
      properties: {
        id: record.id,
        kind: record.kind,
        sample: record.sourceKind === 'sample',
        selected: record.id === selectedId,
        muted: selectedId !== null && record.id !== selectedId,
        label: record.kind === 'garage' ? 'G' : 'P',
      },
    })),
  }
}

export function draftGeoJSON(
  points: Coordinate[],
): FeatureCollection<Point | LineString> {
  return {
    type: 'FeatureCollection',
    features: [
      ...(points.length >= 2
        ? [
            {
              type: 'Feature' as const,
              properties: {},
              geometry: { type: 'LineString' as const, coordinates: points },
            },
          ]
        : []),
      ...points.map((point) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Point' as const, coordinates: point },
      })),
    ],
  }
}
