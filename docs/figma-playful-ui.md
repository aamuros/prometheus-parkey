# Parkey Playful UI implementation

Branch: `feat/figma-playful-ui`. These changes target the Expo mobile app,
including its React Native Web renderer. The operator web app is independent.

Source: [Parkey – Playful UI](https://www.figma.com/design/jraDqL2qKVvTYtDuaoKreZ/Parkey--Playful-UI).

| Figma node | Screen        | Implementation                                                                                 |
| ---------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `6:2`      | Map home      | `explore.tsx`, `search.tsx`, `discovery-sheet.tsx`, `parking-row.tsx`, `bottom-navigation.tsx` |
| `6:187`    | Spot peek     | `parking-details.tsx`, `spot-photo-view.tsx`                                                   |
| `6:323`    | Spot expanded | `parking-details.tsx`, `spot-photo-view.tsx`, `discovery-sheet.tsx`                            |
| `6:477`    | Route preview | `route-details.tsx`                                                                            |
| `7:103`    | Navigating    | `NavigationBanner` and `RouteDetails` in `route-details.tsx`                                   |
| `7:198`    | Arrived       | `RouteDetails` in `route-details.tsx`                                                          |
| `7:304`    | Your parking  | `parking-profile.tsx`                                                                          |
| `7:429`    | Saved places  | `saved-places.tsx`, `saved-addresses.ts`, `saved-address-data.ts`                              |

All implementation files above live in `apps/mobile/src/discovery`.
`palette.ts`, `typography.ts`, and `ui.tsx` supply the shared warm surfaces,
magenta and teal roles, bundled Nunito weights, rounded buttons, and type scale.

## Assets

`apps/mobile/assets/figma` preserves the original, unmodified SVG exports and
1x/3x PNG renderings for native image support. `figma-assets.tsx` statically
imports them and preserves each export's aspect ratio. Tabs, tiles, buttons,
photo placeholders, detail facts, and navigation instructions use those exports.
The bundled Nunito faces and licenses live in `apps/mobile/assets/fonts`.
Native map-pin PNGs were regenerated from the existing shared vector with the
updated palette, keeping native and web marker colors aligned.

The map illustration, fixed route lines, device status bar, sample parking
records, and sample street imagery in Figma are represented by the existing
live map, calculated routes, operating-system status bar, actual parking data,
and attributed photo loader. No temporary Figma asset URL is a runtime source.

## Interaction and data

- Map, Saved, Add, You, and More connect to the existing discovery flows.
  The bottom bar reserves map/sheet space and respects safe-area insets.
- Parking preview and expanded details retain save, directions, correction,
  photo viewing, link, storage failure, and large-text support. Sparse records
  can expand to show photos and missing-detail actions.
- Route preview exposes Start and Steps. Navigation shows the current and next
  maneuver when available, with End in the trip bar. Arrival retains parked
  location saving and next-nearest selection.
- Home and Work use destination search and validated, versioned device storage.
  Existing addresses can be opened on the map or edited. Recent/favorite cards
  retain directions and removal with undo through Manage.
- Your parking shows real saved-location, draft, and saved-car counts. Levels,
  XP, streaks, drivers helped, and weekly parking-time measurements have no
  supporting data source, so their sample values are not displayed. The level
  and weekly sections show explicit unavailable/empty states.

## Verification

- Mobile TypeScript check.
- ESLint and Prettier checks scoped to changed code.
- 37 targeted tests covering saved addresses, navigation URL/Back restoration,
  sheet bounds, local persistence, parking detail data, and driving calculations.
- Local asset existence, original SVG dimensions, PNG density dimensions,
  static import resolution, and bundled font presence checked without a browser.

No browser, emulator, device, or live integration flow was run. Visual comparison
on a device remains unverified. Existing uncommitted work was preserved.

## Saved tab UI fixes

The address editor now uses a sheet-specific search layout with an independent
height bound and an address prompt. It no longer uses the map search card's
position-based height calculation. Escape is delegated to the active modal
before the parent page's dismissal handler. The parking-details close button
is a top-level sheet overlay above its content. Covered map controls are hidden
from accessibility and made inert on web while Saved or You is active. Bottom
tabs explicitly expose their selected state with `aria-selected`.

Verified in Playwright against Expo web:

- At 390 × 844, a real Photon search returned visible, clickable results; selecting
  one saved Home, which persisted when the page was reopened.
- At 320 × 568, Work search input and results fit inside the sheet and scroll.
- Escape closed the Work editor while preserving Saved and the existing Home.
- Opening a place from Favorites and clicking the details X closed the sheet
  without forced clicks; hit-testing confirmed the button received the pointer.
- Keyboard traversal skipped all controls inside the covered map interface.
- The Saved tab rendered `aria-selected="true"` and appeared selected in the
  accessibility snapshot; switching to Map restored map interactivity.

The mobile typecheck, targeted ESLint/Prettier checks, and 17 unit tests for
navigation, sheet bounds, and saved-address validation passed. No native device
or emulator was used for this follow-up verification.

## Search, saved places, privacy, night navigation, and edge states

The 18 supplied nodes below update the Expo app and its React Native Web renderer.
The operator web app stays independent. The original map, geocoding, routing,
favorites, recent places, device drafts, and permission flows supply real data;
Figma’s example records, counts, keyboard, and system status bar are not copied.

| Figma node | Implementation                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| `59:2053`  | Location-off recovery in `explore.tsx`; native settings link and browser settings guidance                  |
| `59:1877`  | Filter-hidden recovery naming the active filter and resetting to All                                        |
| `59:1704`  | Zoom recovery; parking markers and the nearby list stay hidden below queryable zoom                         |
| `59:1539`  | Nonblocking offline banner with connectivity recheck; saved places and car stay available                   |
| `58:1249`  | Reduced-motion-aware nearby skeleton cards in `nearby-card.tsx`                                             |
| `58:1236`  | Shared `state-card.tsx`: badge, title, explanation, and one recovery action                                 |
| `59:1367`  | Loading cards and toast; existing results remain visible while refreshing                                   |
| `59:1240`  | Search empty state and Clear search returning to recent searches                                            |
| `51:892`   | System keyboard stand-in represented by the native TextInput keyboard                                       |
| `52:1130`  | Search result badges, names, addresses, chevrons, and Photon disclosure                                     |
| `53:1163`  | You: actual saved/viewed/draft counts, private drafts with deletion, privacy, reporting status, credits     |
| `54:1246`  | Night navigation: dark live map, turn card, turquoise route, ETA, Next spot, End, light system status bar   |
| `54:1147`  | One-time directions dialog with shield, explanation, Cancel, and Continue                                   |
| `52:888`   | Focused search expands inside the sheet; current location and recent searches precede results               |
| `53:1064`  | Saved: car first, Walk back, Show on map, replace/clear, favorites/recently viewed, removal with Undo       |
| `60:1589`  | Edge-state annotations applied to the shared state card and recovery actions                                |
| `51:959`   | Interaction annotations: three-character search, six-result cap, local data, direct Go and one-time consent |
| `51:891`   | Original exported chevron used in search and credits rows                                                   |

New icons are original Figma SVG exports with 3× PNG renderings bundled locally.
Night navigation follows dark system appearance or local time from 18:00 to 06:00.
The map uses the existing provider’s verified dark style; a public
`EXPO_PUBLIC_NIGHT_MAP_STYLE_URL` can override it. Both renderers keep the live
route and location instead of rendering the Figma map illustration.

Expo Network `~58.0.4`, the version listed by the installed Expo SDK 58, supplies
native and web connectivity events. Retry checks connectivity before reloading
map data, preserving the current map when the device is still offline. This does
not add a map-tile download cache. An unavailable tile or backend request is not
mislabelled as a device-wide offline condition.

Saved addresses remain available below the main Saved content. Draft deletion
persists before removing the row, storage errors stay visible, reporting badges
reflect the configured integrations, and Cancel never records routing consent.
Browser location settings cannot be opened programmatically, so that action
shows platform guidance and an explicit retry. Native permissions are checked
without prompting at launch and again when the app returns from settings.

Verification for this pass: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`,
`pnpm build:web`, and 44 targeted unit tests passed. All 53 playful asset imports
resolve; the 12 new original SVGs and their 3× PNG dimensions were checked.
No browser, emulator, native build, or live navigation flow was run. Visual
parity remains unverified. Native development builds must include the newly
added Expo Network module.
