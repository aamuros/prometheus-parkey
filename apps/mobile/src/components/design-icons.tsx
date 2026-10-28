import Svg, { Path } from 'react-native-svg'

const paths = {
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  back: 'M19 12H5m6-6-6 6 6 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  close: 'm6 6 12 12 M6 18 18 6',
  home: 'm3 10 9-7 9 7v11h-7v-7h-4v7H3z',
  parking: 'M5 21V3h8a6 6 0 0 1 0 12H5 M5 7h8a2 2 0 0 1 0 4H5',
  wallet: 'M21 8H3V4h15v4 M3 8v12h18V8 M21 11h-6v6h6 M17 14h1',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3',
  ticket: 'M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6z M14 7v2m0 3v2m0 3v1',
  car: 'm5 8 2-5h10l2 5 M3 8h18v10H3z M6 18v3m12-3v3 M6 12h2m8 0h2',
  check: 'm5 12 4 4L19 6',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16',
  list: 'M8 5h13 M8 12h13 M8 19h13 M3 5h1 M3 12h1 M3 19h1',
  clock: 'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  calendar: 'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2 M3 9h18 M7 2v4 M17 2v4',
} as const
export type IconName = keyof typeof paths
export function Icon({
  name,
  size = 22,
  color = '#1D1B3A',
}: {
  name: IconName
  size?: number
  color?: string
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      <Path d={paths[name]} />
    </Svg>
  )
}
