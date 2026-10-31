import { mapColors } from './palette.ts'

// Shared vector geometry for UI icons and both map renderers. The pin tip is
// the geographic anchor; the P is a path so it never depends on map fonts.
// Native parking-pin PNGs are 2x rasterizations of parkingPinSvg below.
export const parkingPin = {
  width: 36,
  height: 44,
  outline: 'M18 42C14 36 3 27 3 18a15 15 0 0 1 30 0c0 9-11 18-15 24Z',
  letter: 'M13 10h6a6 6 0 0 1 0 12h-3v5h-3V10Zm3 3v6h3a3 3 0 0 0 0-6h-3Z',
}

export function parkingPinSvg(selected: boolean): string {
  const fill = selected ? mapColors.facilitySelected : mapColors.facility
  const stroke = selected
    ? mapColors.facilitySelectedOutline
    : mapColors.facilityOutline
  const label = selected
    ? mapColors.facilitySelectedLabel
    : mapColors.facilityLabel
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><defs><filter id="shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#172B4D" flood-opacity="0.3"/></filter></defs><path d="${parkingPin.outline}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" filter="url(#shadow)"/><path d="${parkingPin.letter}" fill="${label}" fill-rule="evenodd"/></svg>`
}
