import type { Destination } from './data.ts'
import { isCoordinate, isObject } from './model.ts'

export type SearchHistory = {
  recents: Destination[]
  privacyShown: boolean
}

export const emptySearchHistory: SearchHistory = {
  recents: [],
  privacyShown: false,
}

export function parseSearchHistory(value: unknown): SearchHistory {
  if (
    !isObject(value) ||
    value.version !== 1 ||
    typeof value.privacyShown !== 'boolean' ||
    !Array.isArray(value.recents) ||
    value.recents.length > 5
  )
    throw new Error('Recent searches could not be read.')
  const recents = value.recents.map((item): Destination => {
    if (
      !isObject(item) ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      typeof item.address !== 'string' ||
      !isCoordinate(item.coordinate)
    )
      throw new Error('Recent searches could not be read.')
    return {
      id: item.id,
      name: item.name,
      address: item.address,
      coordinate: item.coordinate,
    }
  })
  return { recents, privacyShown: value.privacyShown }
}

export function rememberSearch(
  history: SearchHistory,
  destination: Destination,
): SearchHistory {
  return {
    ...history,
    recents: [
      destination,
      ...history.recents.filter(
        (item) =>
          item.name !== destination.name ||
          item.coordinate[0] !== destination.coordinate[0] ||
          item.coordinate[1] !== destination.coordinate[1],
      ),
    ].slice(0, 5),
  }
}
