import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DiscoveryParking } from '@parkey/shared-types'

import { anchor, distanceMeters, isObject } from './model'

export type SpotPhoto = {
  url: string
  source: string
  credit?: string
  license?: string
  captured?: string
  licenseUrl?: string
}
type CachedPhoto = { expires: number; id?: string; missing?: boolean }
const memory = new Map<string, CachedPhoto>()
const token = process.env.EXPO_PUBLIC_MAPILLARY_TOKEN || ''
const https = (value: string | undefined) =>
  value && /^https:\/\//i.test(value) ? value : undefined
async function json(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Photo lookup unavailable')
  return response.json()
}
async function image(
  url: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  const response = await fetch(url, { method: 'HEAD', signal })
  if (response.status === 429) throw new Error('Photo lookup unavailable')
  return response.ok &&
    response.headers.get('content-type')?.startsWith('image/') &&
    https(response.url || url)
    ? response.url || url
    : undefined
}
function mapillaryPhoto(value: unknown): SpotPhoto | undefined {
  if (
    !isObject(value) ||
    value.is_pano === true ||
    typeof value.thumb_1024_url !== 'string' ||
    !https(value.thumb_1024_url) ||
    typeof value.id !== 'string'
  )
    return undefined
  const creator =
    isObject(value.creator) && typeof value.creator.username === 'string'
      ? value.creator.username
      : undefined
  const captured =
    typeof value.captured_at === 'number'
      ? new Date(value.captured_at).toISOString()
      : undefined
  return {
    url: value.thumb_1024_url,
    source: `https://www.mapillary.com/app/?pKey=${encodeURIComponent(value.id)}`,
    license: 'Mapillary, CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    ...(creator ? { credit: creator } : {}),
    ...(captured ? { captured } : {}),
  }
}
const fields =
  'id,thumb_1024_url,captured_at,creator,geometry,compass_angle,is_pano'
async function mapillaryId(id: string, signal: AbortSignal) {
  return mapillaryPhoto(
    await json(
      `https://graph.mapillary.com/${encodeURIComponent(id)}?fields=${fields}&access_token=${encodeURIComponent(token)}`,
      signal,
    ),
  )
}
async function cache(key: string, value: CachedPhoto) {
  memory.set(key, value)
  await AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => undefined)
}
/** Cache identity only. Signed image URLs are resolved afresh for each opening. */
export async function resolveSpotPhoto(
  parking: DiscoveryParking,
  signal: AbortSignal,
): Promise<SpotPhoto | undefined> {
  const key = `parkey:spot-photo:v1:${token ? 'mapillary' : 'tags'}:${parking.sourceUrl ?? parking.id}`
  let cached = memory.get(key)
  if (!cached) {
    try {
      const raw: unknown = JSON.parse(
        (await AsyncStorage.getItem(key)) ?? 'null',
      )
      if (isObject(raw) && typeof raw.expires === 'number')
        cached = {
          expires: raw.expires,
          ...(typeof raw.id === 'string' ? { id: raw.id } : {}),
          ...(raw.missing === true ? { missing: true } : {}),
        }
    } catch {
      /* Storage failure does not block photos. */
    }
  }
  if (cached && cached.expires > Date.now() && cached.missing) return undefined
  const tags = parking.osmTags ?? {}
  const direct = https(tags.image)
  if (direct) {
    const url = await image(direct, signal)
    if (url) return { url, source: direct }
  }
  const commons = tags.wikimedia_commons
  if (commons?.startsWith('File:')) {
    const name = commons.slice(5)
    const filepath = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=800`
    const url = await image(filepath, signal)
    if (url) {
      const payload = await json(
        `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent(commons)}`,
        signal,
      )
      const query =
        isObject(payload) && isObject(payload.query) ? payload.query : undefined
      const pages =
        query && isObject(query.pages) ? Object.values(query.pages) : []
      const page = pages[0]
      const info =
        isObject(page) && Array.isArray(page.imageinfo)
          ? page.imageinfo[0]
          : undefined
      const metadata =
        isObject(info) && isObject(info.extmetadata)
          ? info.extmetadata
          : undefined
      const value = (key: string) => {
        const item = metadata?.[key]
        return isObject(item) && typeof item.value === 'string'
          ? item.value
              .replace(/<[^>]*>/g, '')
              .replaceAll('&amp;', '&')
              .trim()
          : undefined
      }
      const credit = value('Artist'),
        license = value('LicenseShortName'),
        licenseUrl = https(value('LicenseUrl'))
      const date = value('DateTimeOriginal')
      const captured =
        date && Number.isFinite(Date.parse(date))
          ? new Date(date).toISOString()
          : undefined
      return {
        url,
        source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(name)}`,
        ...(credit ? { credit } : {}),
        ...(license ? { license } : {}),
        ...(licenseUrl ? { licenseUrl } : {}),
        ...(captured ? { captured } : {}),
      }
    }
  }
  if (token) {
    if (tags.mapillary && /^\d+$/.test(tags.mapillary)) {
      const photo = await mapillaryId(tags.mapillary, signal)
      if (photo) return photo
    }
    if (cached?.id && cached.expires > Date.now()) {
      const photo = await mapillaryId(cached.id, signal)
      if (photo) return photo
    }
    const [lon, lat] = anchor(parking.geometry)
    const dy = 40 / 111320,
      dx = dy / Math.cos((lat * Math.PI) / 180)
    const payload = await json(
      `https://graph.mapillary.com/images?fields=${fields}&bbox=${lon - dx},${lat - dy},${lon + dx},${lat + dy}&limit=50&access_token=${encodeURIComponent(token)}`,
      signal,
    )
    const candidates =
      isObject(payload) && Array.isArray(payload.data)
        ? payload.data
            .flatMap((item: unknown) => {
              if (
                !isObject(item) ||
                item.is_pano !== false ||
                !isObject(item.geometry) ||
                !Array.isArray(item.geometry.coordinates)
              )
                return []
              const [x, y] = item.geometry.coordinates
              if (
                typeof x !== 'number' ||
                typeof y !== 'number' ||
                typeof item.compass_angle !== 'number'
              )
                return []
              const distance = distanceMeters([lon, lat], [x, y])
              const rad = Math.PI / 180
              const bearing =
                ((Math.atan2(
                  Math.sin((lon - x) * rad) * Math.cos(lat * rad),
                  Math.cos(y * rad) * Math.sin(lat * rad) -
                    Math.sin(y * rad) *
                      Math.cos(lat * rad) *
                      Math.cos((lon - x) * rad),
                ) *
                  180) /
                  Math.PI +
                  360) %
                360
              const angle = Math.abs(
                ((item.compass_angle - bearing + 540) % 360) - 180,
              )
              if (distance > 40 || angle > 60) return []
              const age =
                typeof item.captured_at === 'number'
                  ? Math.max(
                      0,
                      (Date.now() - item.captured_at) / 86400000 / 365,
                    )
                  : 10
              return [{ item, score: distance + age * 3 + angle / 6 }]
            })
            .sort((a, b) => a.score - b.score)
        : []
    for (const { item } of candidates) {
      const photo = mapillaryPhoto(item)
      if (photo && typeof item.id === 'string') {
        await cache(key, { id: item.id, expires: Date.now() + 7 * 86400000 })
        return photo
      }
    }
  }
  if (!signal.aborted)
    await cache(key, { missing: true, expires: Date.now() + 86400000 })
  return undefined
}
