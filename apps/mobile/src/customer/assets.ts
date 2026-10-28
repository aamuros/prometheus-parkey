import statusIcons from '../../assets/figma/4e20a.svg'
import mapArt from '../../assets/figma/260d6.svg'
import iconBack from '../../assets/figma/629b0.svg'
import iconDown from '../../assets/figma/c4a7d.svg'
import iconClock from '../../assets/figma/d0a3a.svg'
import iconLocate from '../../assets/figma/0148c.svg'
import userHalo from '../../assets/figma/6b107.svg'
import userLocation from '../../assets/figma/0a992.svg'
import iconPin from '../../assets/figma/fd68d.svg'
import iconSearch from '../../assets/figma/89cda.svg'
import iconChevron from '../../assets/figma/986cb.svg'
import homeSelected from '../../assets/figma/d19f2.svg'
import calendar from '../../assets/figma/102a5.svg'
import user from '../../assets/figma/3812f.svg'
import iconParking from '../../assets/figma/f17ed.svg'
import destinationRing from '../../assets/figma/05ffe.svg'
import destination from '../../assets/figma/ebc2d.svg'
import garageIllustration from '../../assets/figma/ab57e.svg'
import iconShare from '../../assets/figma/37abb.svg'
import iconHeart from '../../assets/figma/0dbfc.svg'
import iconStar from '../../assets/figma/cb363.svg'
import pinMuted from '../../assets/figma/42a5d.svg'
import iconRoof from '../../assets/figma/c0207.svg'
import iconVideo from '../../assets/figma/a552d.svg'
import iconZap from '../../assets/figma/90f02.svg'
import iconShield from '../../assets/figma/26776.svg'
import iconCar from '../../assets/figma/50e39.svg'
import iconCard from '../../assets/figma/09b2c.svg'
import iconClose from '../../assets/figma/d7a86.svg'
import route from '../../assets/figma/82141.svg'
import iconCheck from '../../assets/figma/98827.svg'
import home from '../../assets/figma/32429.svg'
import calendarSelected from '../../assets/figma/c001c.svg'
import parkingSmall from '../../assets/figma/0bfe2.svg'
import iconBell from '../../assets/figma/e908d.svg'
import iconHelp from '../../assets/figma/b1398.svg'
import iconLogout from '../../assets/figma/f35b1.svg'
import userSelected from '../../assets/figma/76643.svg'

// Original SVG bounds include Figma’s shadow overflow; never stretch the files.
export const designAssets = {
  statusIcons: { source: statusIcons, width: 70, height: 12 },
  mapArt: { source: mapArt, width: 390, height: 844 },
  iconBack: { source: iconBack, width: 22, height: 22 },
  iconDown: { source: iconDown, width: 18, height: 18 },
  iconClock: { source: iconClock, width: 22, height: 22 },
  iconLocate: { source: iconLocate, width: 22, height: 22 },
  userHalo: { source: userHalo, width: 56, height: 56 },
  userLocation: { source: userLocation, width: 44, height: 44 },
  iconPin: { source: iconPin, width: 18, height: 18 },
  iconSearch: { source: iconSearch, width: 22, height: 22 },
  iconChevron: { source: iconChevron, width: 20, height: 20 },
  homeSelected: { source: homeSelected, width: 22, height: 22 },
  calendar: { source: calendar, width: 22, height: 22 },
  user: { source: user, width: 22, height: 22 },
  iconParking: { source: iconParking, width: 32, height: 32 },
  destinationRing: { source: destinationRing, width: 64, height: 64 },
  destination: { source: destination, width: 56, height: 56 },
  garageIllustration: { source: garageIllustration, width: 390, height: 300 },
  iconShare: { source: iconShare, width: 20, height: 20 },
  iconHeart: { source: iconHeart, width: 20, height: 20 },
  iconStar: { source: iconStar, width: 16, height: 16 },
  pinMuted: { source: pinMuted, width: 18, height: 18 },
  iconRoof: { source: iconRoof, width: 16, height: 16 },
  iconVideo: { source: iconVideo, width: 16, height: 16 },
  iconZap: { source: iconZap, width: 16, height: 16 },
  iconShield: { source: iconShield, width: 16, height: 16 },
  iconCar: { source: iconCar, width: 22, height: 22 },
  iconCard: { source: iconCard, width: 22, height: 22 },
  iconClose: { source: iconClose, width: 22, height: 22 },
  route: { source: route, width: 390, height: 330 },
  iconCheck: { source: iconCheck, width: 24, height: 24 },
  home: { source: home, width: 22, height: 22 },
  calendarSelected: { source: calendarSelected, width: 22, height: 22 },
  parkingSmall: { source: parkingSmall, width: 26, height: 26 },
  iconBell: { source: iconBell, width: 22, height: 22 },
  iconHelp: { source: iconHelp, width: 22, height: 22 },
  iconLogout: { source: iconLogout, width: 22, height: 22 },
  userSelected: { source: userSelected, width: 22, height: 22 },
} as const

export type DesignAssetName = keyof typeof designAssets
