import { Image } from 'react-native'

import asset0 from '../../assets/figma/map-active.png'
import asset1 from '../../assets/figma/map.png'
import asset2 from '../../assets/figma/saved.png'
import asset3 from '../../assets/figma/saved-active.png'
import asset4 from '../../assets/figma/user.png'
import asset5 from '../../assets/figma/user-active.png'
import asset6 from '../../assets/figma/more.png'
import asset7 from '../../assets/figma/plus.png'
import asset8 from '../../assets/figma/locate.png'
import asset9 from '../../assets/figma/info.png'
import asset10 from '../../assets/figma/pin.png'
import asset11 from '../../assets/figma/arrow.png'
import asset12 from '../../assets/figma/search.png'
import asset13 from '../../assets/figma/star.png'
import asset14 from '../../assets/figma/camera.png'
import asset15 from '../../assets/figma/pencil.png'
import asset16 from '../../assets/figma/close.png'
import asset17 from '../../assets/figma/camera-large.png'
import asset18 from '../../assets/figma/clock.png'
import asset19 from '../../assets/figma/fees.png'
import asset20 from '../../assets/figma/spaces.png'
import asset21 from '../../assets/figma/access.png'
import asset22 from '../../assets/figma/turn-right.png'
import asset23 from '../../assets/figma/then-left.png'
import asset24 from '../../assets/figma/warning.png'
import asset25 from '../../assets/figma/ring.png'
import asset26 from '../../assets/figma/bookmark.png'
import asset27 from '../../assets/figma/contributed.png'
import asset28 from '../../assets/figma/car.png'
import asset29 from '../../assets/figma/car-white.png'
import asset30 from '../../assets/figma/plus-small.png'
import asset31 from '../../assets/figma/home.png'
import asset32 from '../../assets/figma/work.png'

const assets = {
  'map-active': { source: asset0, width: 26, height: 26 },
  map: { source: asset1, width: 26, height: 26 },
  saved: { source: asset2, width: 26, height: 26 },
  'saved-active': { source: asset3, width: 26, height: 26 },
  user: { source: asset4, width: 26, height: 26 },
  'user-active': { source: asset5, width: 26, height: 26 },
  more: { source: asset6, width: 26, height: 26 },
  plus: { source: asset7, width: 28, height: 28 },
  locate: { source: asset8, width: 24, height: 24 },
  info: { source: asset9, width: 18, height: 18 },
  pin: { source: asset10, width: 28, height: 28 },
  arrow: { source: asset11, width: 22, height: 22 },
  search: { source: asset12, width: 22, height: 22 },
  star: { source: asset13, width: 24, height: 24 },
  camera: { source: asset14, width: 24, height: 24 },
  pencil: { source: asset15, width: 18, height: 18 },
  close: { source: asset16, width: 18, height: 18 },
  'camera-large': { source: asset17, width: 28, height: 28 },
  clock: { source: asset18, width: 20, height: 20 },
  fees: { source: asset19, width: 20, height: 20 },
  spaces: { source: asset20, width: 20, height: 20 },
  access: { source: asset21, width: 20, height: 20 },
  'turn-right': { source: asset22, width: 34, height: 34 },
  'then-left': { source: asset23, width: 16, height: 16 },
  warning: { source: asset24, width: 18, height: 18 },
  ring: { source: asset25, width: 96, height: 96 },
  bookmark: { source: asset26, width: 20, height: 20 },
  contributed: { source: asset27, width: 20, height: 20 },
  car: { source: asset28, width: 20, height: 20 },
  'car-white': { source: asset29, width: 22, height: 22 },
  'plus-small': { source: asset30, width: 22, height: 22 },
  home: { source: asset31, width: 22, height: 22 },
  work: { source: asset32, width: 22, height: 22 },
}

export type FigmaAssetName = keyof typeof assets

// Preserve each Figma export's intrinsic aspect ratio.
export function FigmaAsset({
  name,
  size,
}: {
  name: FigmaAssetName
  size?: number
}) {
  const asset = assets[name]
  const width = size ?? asset.width
  return (
    <Image
      accessible={false}
      source={asset.source}
      resizeMode="contain"
      style={{ width, height: (width * asset.height) / asset.width }}
    />
  )
}
