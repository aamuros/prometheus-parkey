import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

import type { Destination } from './data'
import {
  parseSavedAddresses,
  serializeSavedAddresses,
} from './saved-address-data'
import type { AddressKind, SavedAddresses } from './saved-address-data'

export type { AddressKind } from './saved-address-data'

const key = 'parkey.discovery.addresses.v1'

export function useSavedAddresses() {
  const [addresses, setAddresses] = useState<SavedAddresses>({})
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void AsyncStorage.getItem(key)
      .then((value) => {
        const next = parseSavedAddresses(value)
        if (active) {
          setAddresses(next)
          setReady(true)
        }
      })
      .catch(() => {
        if (active)
          setError(
            'Saved addresses couldn’t be loaded. Try reopening Saved places.',
          )
      })
    return () => {
      active = false
    }
  }, [])
  async function save(kind: AddressKind, destination: Destination) {
    if (!ready) return false
    try {
      const next = { ...addresses, [kind]: destination }
      await AsyncStorage.setItem(key, serializeSavedAddresses(next))
      setAddresses(next)
      setError(null)
      return true
    } catch {
      setError('The address couldn’t be saved on this device. Try again.')
      return false
    }
  }
  return { addresses, ready, error, save }
}
