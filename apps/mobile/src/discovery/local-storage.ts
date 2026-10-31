import AsyncStorage from '@react-native-async-storage/async-storage'

import { createLocalStore } from './local-state'

export const localStore = createLocalStore(AsyncStorage)
