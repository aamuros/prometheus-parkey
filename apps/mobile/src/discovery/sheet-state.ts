import type { DiscoveryParking } from '@parkey/shared-types'

export type SheetPosition = 'compact' | 'medium' | 'expanded'
export type DiscoverySheetState = {
  parking: DiscoveryParking | null
  position: SheetPosition
  browsingPosition: SheetPosition
}
export type SheetEvent =
  | { type: 'select'; parking: DiscoveryParking }
  | { type: 'browse' }
  | { type: 'snap'; position: SheetPosition }

export const initialSheetState: DiscoverySheetState = {
  parking: null,
  position: 'compact',
  browsingPosition: 'compact',
}

export function sheetReducer(
  state: DiscoverySheetState,
  event: SheetEvent,
): DiscoverySheetState {
  switch (event.type) {
    case 'select':
      return { ...state, parking: event.parking, position: 'medium' }
    case 'browse':
      return { ...state, parking: null, position: state.browsingPosition }
    case 'snap': {
      const position =
        state.parking && event.position === 'compact'
          ? 'medium'
          : event.position
      return {
        ...state,
        position,
        browsingPosition: state.parking ? state.browsingPosition : position,
      }
    }
  }
}

export function sheetHeights(
  height: number,
  top: number,
  bottom: number,
  selected: boolean,
  fontScale = 1,
  headerHeight = 0,
) {
  const usable = Math.max(1, height - top)
  const compact = selected
    ? Math.min(
        162 + Math.max(bottom, 16) + Math.max(0, fontScale - 1) * 46,
        usable * 0.6,
      )
    : Math.min(
        Math.max(120, headerHeight + Math.max(72, 23 * fontScale + 20)) +
          Math.max(bottom, 12),
        usable * 0.6,
      )
  const expanded = Math.max(compact, usable * 0.8)
  const medium = Math.min(
    expanded,
    Math.max(
      Math.max(compact + 24, selected ? 300 : 240) +
        bottom +
        Math.max(0, fontScale - 1) * 80,
      usable * 0.45,
    ),
  )
  return { compact, medium, expanded }
}

/** Reserve the measured overlays while keeping a usable viewport on short screens. */
export function discoveryCameraPadding(
  height: number,
  overlayHeight: number,
  panelHeight: number,
) {
  const available = Math.max(0, height - 64)
  const top = Math.min(Math.max(0, overlayHeight), available)
  const bottom = Math.min(Math.max(0, panelHeight), available - top)
  return { top, bottom }
}

export function snapSheet(
  heights: ReturnType<typeof sheetHeights>,
  draggedHeight: number,
  velocityY: number,
  selected: boolean,
): SheetPosition {
  const positions: SheetPosition[] = selected
    ? ['medium', 'expanded']
    : ['compact', 'medium', 'expanded']
  const projected = draggedHeight - velocityY * 140
  return positions.reduce(
    (nearest, position) =>
      Math.abs(heights[position] - projected) <
      Math.abs(heights[nearest] - projected)
        ? position
        : nearest,
    selected ? 'medium' : 'compact',
  )
}

export function stepSheet(
  position: SheetPosition,
  direction: 1 | -1,
): SheetPosition {
  const positions: SheetPosition[] = ['compact', 'medium', 'expanded']
  return (
    positions[
      Math.max(0, Math.min(2, positions.indexOf(position) + direction))
    ] ?? 'compact'
  )
}
