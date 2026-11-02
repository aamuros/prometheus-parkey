export type SheetWheelGesture = {
  time: number
  distance: number
  direction: -1 | 0 | 1
  consumed: boolean
}

export const initialSheetWheel: SheetWheelGesture = {
  time: -Infinity,
  distance: 0,
  direction: 0,
  consumed: false,
}

export function wheelPixels(delta: number, mode: number, pageHeight: number) {
  return delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1)
}

/** One deliberate snap per gesture; inertial events must not cycle the sheet. */
export function advanceSheetWheel(
  previous: SheetWheelGesture,
  delta: number,
  time: number,
  scrollingContent = false,
): { gesture: SheetWheelGesture; step: -1 | 0 | 1 } {
  if (delta === 0) return { gesture: previous, step: 0 }
  const fresh = time - previous.time > 180
  const direction = delta > 0 ? 1 : -1
  const distance =
    fresh || direction !== previous.direction
      ? Math.abs(delta)
      : previous.distance + Math.abs(delta)
  const consumed = scrollingContent || (!fresh && previous.consumed)
  const step = !consumed && distance >= 44 ? direction : 0
  return {
    gesture: { time, distance, direction, consumed: consumed || step !== 0 },
    step,
  }
}
