import type { Coordinate, DiscoveryParking } from '@parkey/shared-types'

import type { Viewport } from './model'
import type { DrivingRoute } from './routing'

export type CameraTarget = { coordinate: Coordinate; revision: number }
export type ParkingMapProps = {
  records: DiscoveryParking[]
  selectedId: string | null
  route: DrivingRoute | null
  target: CameraTarget
  cameraPadding: { top: number; bottom: number }
  userLocation: Coordinate | null
  destination: Coordinate | null
  draftPoints: Coordinate[]
  drawing: boolean
  onSelect: (id: string) => void
  onMapPress: (point: Coordinate) => void
  onViewport: (viewport: Viewport) => void
  onStatus: (status: 'loading' | 'ready' | 'error') => void
}
