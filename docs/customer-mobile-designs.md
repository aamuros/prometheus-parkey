# Customer mobile Figma implementation

Source: [Parkey — Customer Mobile App](https://www.figma.com/design/woLCBlrct5MY3gOsHIUJnb).
The 18 supplied nodes consist of nine screens and nine adjacent numbered labels.
The labels describe the Figma canvas; they are not additional app screens.

## Open the customer app

Run `pnpm --filter @parkey/mobile web` from the repository root, or run
`pnpm dev:mobile` and press `w`. Open the Expo URL printed in the terminal,
normally `http://localhost:8081`. The separate `pnpm dev:web` command opens the
operator dashboard at port 3000.

On the welcome screen, choose **Get started**, then **Continue** with the
prefilled sample phone number. No verification code is required for the preview.
On a device or simulator, use the same Expo project through `pnpm dev:mobile`.

| Screen               | Screen node | Label node | Expo route           |
| -------------------- | ----------- | ---------- | -------------------- |
| 01 Welcome           | `5:2`       | `5:3`      | `/`                  |
| 02 Phone number      | `5:98`      | `5:99`     | `/phone`             |
| 03 Home              | `5:156`     | `5:157`    | `/home`              |
| 04 Search results    | `5:319`     | `5:320`    | `/search`            |
| 05 Parking details   | `7:339`     | `7:340`    | `/parking/[id]`      |
| 06 Review & reserve  | `7:467`     | `7:468`    | `/reserve/[id]`      |
| 07 Booking confirmed | `7:556`     | `7:557`    | `/confirmation/[id]` |
| 08 Bookings          | `8:543`     | `8:544`    | `/bookings`          |
| 09 Account           | `8:636`     | `8:637`    | `/account`           |

Implementation lives in `apps/mobile/src/customer`, using Expo Router, native
StyleSheet, the existing typography component, and the installed SVG renderer.
`apps/mobile/assets/figma` contains the original SVG downloads; `assets.ts` maps
their filenames to semantic names and original dimensions. Shadow overflow on
location markers is included in their dimensions and positioning. Figma screen
captures are reference material only and are not bundled into the app.

The design uses Inter, loaded from local static font files. Native platforms use
their system status bar, safe areas, home indicator, and phone keyboard. The Expo
web preview provides the design's status bar, home indicator, and interactive
numeric keypad. Content scrolls on smaller displays; maps retain their original
aspect ratio through wrapper scaling.

Home, Bookings, and Account use an Expo Router tab layout at `src/app/(tabs)`.
Their public URLs are unchanged. The floating navigation pill stays mounted
between tabs, animates its selection indicator, and preserves each screen's
search input, filters, and scroll state. Detail and review screens use native
stack transitions; search and tab changes fade. Onboarding is removed from
history after entering Home, and leaving confirmation dismisses checkout back
to the existing tabs.

Option sheets animate in and out using native Animated transforms, then run any
requested navigation after dismissal. Repeated dismissal taps are ignored.
Buttons use restrained press feedback. All motion respects the device's Reduce
Motion setting. Original SVG XML is preloaded and cached on native so route
changes do not fetch the same icons and maps again.

## Preview behavior

Search, filters, parking selection, saved parking, time and duration selection,
vehicle editing, reminder preferences, cancellation, history, and logout work
with session-only state. Invalid routes show a recovery action. Price estimates
use the selected hourly rate and duration plus the design's ₱15 service fee.
Sample reservations prevent duplicate and overlapping vehicle bookings.

The sample state includes the three bookings displayed in Figma so Bookings and
Account can be reviewed directly. Confirming the same existing reservation opens
its confirmation without duplicating it. The two additional parking examples
behind the map's ₱90 and ₱100 pins are fictional fixtures completing the five
search options; only the first three garage names appear in the supplied results
frame. The welcome map's prices remain decorative artwork as designed.

No authentication, SMS verification, live availability, wallet linking, payments,
real reservations, usable entry passes, or live navigation are connected.
Continuing phone entry opens the preview without claiming verification.
Confirmation requires acknowledging that no reservation or payment will occur;
booking codes and the Figma QR cell pattern are explicitly marked as samples.
Directions show the supplied route illustration. No schema or backend changed.

## Verification

- Scoped strict TypeScript check for all customer screens, app routes, typography,
  assets, and Expo-generated route declarations.
- ESLint and Prettier checks for touched source files.
- `node --test apps/mobile/src/customer/preview.test.mjs` covers filters, prices,
  overlapping and duplicate bookings, cancellation, invalid inputs, phone
  formatting, time formatting, and session reset.
- Original asset dimensions, local nonempty files, and asset imports checked.
- Android emulator checks cover onboarding, persistent tab state, search/back
  navigation, sheet dismissal, checkout confirmation, and logout history.
- The Expo web export builds successfully. Browser rendering, frame-rate
  profiling, and iOS simulator verification were not run.

The existing mobile-wide typecheck also includes unrelated owner preview code
with missing styles and color tokens in `src/components/owner-workspace.tsx` and
`src/components/driver-styles.ts`. Those pre-existing errors are outside this
customer UI change.
