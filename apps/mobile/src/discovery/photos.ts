import type { DiscoveryParking, ParkingPhoto } from '@parkey/shared-types'

export type PhotoCatalog = Readonly<Record<string, readonly ParkingPhoto[]>>

// Add only approved, location-matched photographs with reuse rights and credits.
// Prefer sourceUrl keys (stable across OSM snapshots and server UUIDs); put the
// entrance photograph first. Never copy local contribution photo URIs here.
export const curatedParkingPhotos: PhotoCatalog = {}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

export function isParkingPhoto(value: unknown): value is ParkingPhoto {
  if (typeof value !== 'object' || value === null) return false
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    !!value.id.trim() &&
    'thumbnailUrl' in value &&
    isHttpsUrl(value.thumbnailUrl) &&
    'imageUrl' in value &&
    isHttpsUrl(value.imageUrl) &&
    'sourceUrl' in value &&
    isHttpsUrl(value.sourceUrl) &&
    'caption' in value &&
    typeof value.caption === 'string' &&
    !!value.caption.trim() &&
    'credit' in value &&
    typeof value.credit === 'string' &&
    !!value.credit.trim() &&
    'license' in value &&
    typeof value.license === 'string' &&
    !!value.license.trim()
  )
}

export function parkingPhotos(
  parking: DiscoveryParking,
  catalog: PhotoCatalog = curatedParkingPhotos,
): ParkingPhoto[] {
  const sourcePhotos =
    parking.sourceUrl && Object.hasOwn(catalog, parking.sourceUrl)
      ? catalog[parking.sourceUrl]
      : undefined
  const photos =
    sourcePhotos ??
    (Object.hasOwn(catalog, parking.id) ? catalog[parking.id] : undefined) ??
    []
  return photos.filter(isParkingPhoto)
}

export function photoPage(offset: number, width: number, count: number) {
  if (width <= 0 || count <= 0 || !Number.isFinite(offset)) return 0
  return Math.max(0, Math.min(count - 1, Math.round(offset / width)))
}
