import type { Destination } from './data'
import { isCoordinate, isObject } from './model.ts'

export type AddressKind = 'home' | 'work'
export type SavedAddresses = { home?: Destination; work?: Destination }

export function parseSavedAddresses(value: string | null): SavedAddresses {
  if (value === null) return {}
  const parsed: unknown = JSON.parse(value)
  if (!isObject(parsed) || parsed.version !== 1)
    throw new Error('Unsupported saved addresses')
  const addresses: SavedAddresses = {}
  for (const kind of ['home', 'work'] as const) {
    const item = parsed[kind]
    if (item === undefined) continue
    if (
      !isObject(item) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      typeof item.id !== 'string' ||
      !item.id.trim() ||
      typeof item.address !== 'string' ||
      !isCoordinate(item.coordinate)
    )
      throw new Error('Invalid saved address')
    addresses[kind] = {
      id: item.id,
      name: item.name,
      address: item.address,
      coordinate: [item.coordinate[0], item.coordinate[1]],
    }
  }
  return addresses
}

export function serializeSavedAddresses(addresses: SavedAddresses) {
  // Validate the same envelope on write and read, stripping provider metadata.
  const envelope = { version: 1, ...addresses }
  return JSON.stringify({
    version: 1,
    ...parseSavedAddresses(JSON.stringify(envelope)),
  })
}
