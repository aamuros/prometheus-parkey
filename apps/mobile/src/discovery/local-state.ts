import type {
  Coordinate,
  DiscoveryParking,
  ParkingKind,
} from '@parkey/shared-types'

import { anchor, isCoordinate, isObject } from './model.ts'

export type SavedRecord = {
  key: string
  id: string
  sourceUrl: string | null
  name: string
  coordinate: Coordinate
  kind: ParkingKind
}
export type LocalState = {
  parked: { coordinate: Coordinate; savedAt: string } | null
  favorites: SavedRecord[]
  recents: SavedRecord[]
}
export const emptyLocalState: LocalState = {
  parked: null,
  favorites: [],
  recents: [],
}

export function recordKey(record: Pick<DiscoveryParking, 'sourceUrl' | 'id'>) {
  return record.sourceUrl ? `source:${record.sourceUrl}` : `id:${record.id}`
}

export function savedRecord(record: DiscoveryParking): SavedRecord {
  const [longitude, latitude] = anchor(record.geometry)
  return {
    key: recordKey(record),
    id: record.id,
    sourceUrl: record.sourceUrl,
    name: record.name,
    coordinate: [longitude, latitude],
    kind: record.kind,
  }
}

function validSource(value: unknown): value is string | null {
  if (value === null) return true
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

function parseSaved(value: unknown): SavedRecord {
  if (
    !isObject(value) ||
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    !validSource(value.sourceUrl) ||
    typeof value.key !== 'string' ||
    !isCoordinate(value.coordinate) ||
    (value.kind !== 'street' && value.kind !== 'lot' && value.kind !== 'garage')
  )
    throw new Error('Saved parking has an unsupported format.')
  const record: SavedRecord = {
    key: value.key,
    id: value.id,
    sourceUrl: value.sourceUrl,
    name: value.name,
    coordinate: [value.coordinate[0], value.coordinate[1]],
    kind: value.kind,
  }
  if (record.key !== recordKey(record))
    throw new Error('Saved parking identity could not be read.')
  return record
}

function parseRecords(value: unknown, maximum: number): SavedRecord[] {
  if (!Array.isArray(value) || value.length > maximum)
    throw new Error('Saved parking has an unsupported format.')
  const records = value.map(parseSaved)
  if (new Set(records.map((record) => record.key)).size !== records.length)
    throw new Error('Saved parking contains duplicate records.')
  return records
}

/** Only a versioned local envelope is accepted; damaged storage is never reset silently. */
export function parseLocalState(value: unknown): LocalState {
  if (!isObject(value) || value.version !== 1)
    throw new Error('Saved parking has an unsupported format.')
  let parked: LocalState['parked'] = null
  if (value.parked !== null) {
    if (
      !isObject(value.parked) ||
      !isCoordinate(value.parked.coordinate) ||
      typeof value.parked.savedAt !== 'string' ||
      !Number.isFinite(Date.parse(value.parked.savedAt)) ||
      new Date(value.parked.savedAt).toISOString() !== value.parked.savedAt
    )
      throw new Error('The saved parked location could not be read.')
    parked = {
      coordinate: [value.parked.coordinate[0], value.parked.coordinate[1]],
      savedAt: value.parked.savedAt,
    }
  }
  return {
    parked,
    favorites: parseRecords(value.favorites, Number.MAX_SAFE_INTEGER),
    recents: parseRecords(value.recents, 10),
  }
}

export function toggleFavorite(
  state: LocalState,
  record: DiscoveryParking,
): LocalState {
  if (record.sourceKind === 'sample') return state
  const entry = savedRecord(record)
  const exists = state.favorites.some((favorite) => favorite.key === entry.key)
  return {
    ...state,
    favorites: exists
      ? state.favorites.filter((favorite) => favorite.key !== entry.key)
      : [entry, ...state.favorites],
  }
}

export function rememberViewed(
  state: LocalState,
  record: DiscoveryParking,
): LocalState {
  if (record.sourceKind === 'sample') return state
  const entry = savedRecord(record)
  return {
    ...state,
    recents: [
      entry,
      ...state.recents.filter((recent) => recent.key !== entry.key),
    ].slice(0, 10),
  }
}

export function setParkedSpot(
  state: LocalState,
  coordinate: Coordinate | null,
  now: Date = new Date(),
): LocalState {
  if (coordinate === null) return { ...state, parked: null }
  if (!isCoordinate(coordinate) || !Number.isFinite(now.getTime()))
    throw new Error('A valid location is needed to save where you parked.')
  return {
    ...state,
    parked: {
      coordinate: [coordinate[0], coordinate[1]],
      savedAt: now.toISOString(),
    },
  }
}

/** Missing from loaded records means unavailable here, not proven deleted. */
export function resolveSaved(
  saved: SavedRecord,
  records: readonly DiscoveryParking[],
): DiscoveryParking | null {
  return records.find((record) => recordKey(record) === saved.key) ?? null
}

type Storage = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<unknown>
  removeItem: (key: string) => Promise<unknown>
}
const STORAGE_KEY = 'parkey.discovery.saved-parking.v1'

/** Reads, writes and clearing share one queue, including after a failed operation. */
export function createLocalStore(storage: Storage) {
  let queue: Promise<unknown> = Promise.resolve()
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation)
    queue = result.catch(() => undefined)
    return result
  }
  return {
    read(): Promise<LocalState> {
      return enqueue(async () => {
        const value = await storage.getItem(STORAGE_KEY)
        return value === null
          ? { parked: null, favorites: [], recents: [] }
          : parseLocalState(JSON.parse(value))
      })
    },
    async write(state: LocalState): Promise<void> {
      const parsed = parseLocalState({ version: 1, ...state })
      const value = JSON.stringify({ version: 1, ...parsed })
      return enqueue(async () => {
        await storage.setItem(STORAGE_KEY, value)
      })
    },
    clear(): Promise<void> {
      return enqueue(async () => {
        await storage.removeItem(STORAGE_KEY)
      })
    },
  }
}
