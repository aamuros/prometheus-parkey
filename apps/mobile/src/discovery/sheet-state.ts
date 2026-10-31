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
) {
  const usable = Math.max(1, height - top)
  const compact = Math.min(Math.max(120, 70 + 41 * fontScale) + bottom, usable)
  const expanded = Math.max(compact, usable * 0.8)
  const medium = Math.min(
    expanded,
    Math.max(
      (selected ? 300 : 240) + bottom + Math.max(0, fontScale - 1) * 80,
      usable * 0.45,
    ),
  )
  return { compact, medium, expanded }
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
