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
