# Parking detail sheet

The detail sheet reads the same bundled snapshot / `discover_parking` viewport
response as the map. It does not fetch OSM data when a spot opens. Photo lookup
is the only additional network activity triggered by selection.

## Audit and data changes

Previously the importer kept name, charge/fee text, opening_hours, three address
parts, access/maxstay as prose, and a coarse parking kind. It discarded operator,
capacity (including accessible/charging), maxheight, covered, lit, surface,
supervised, vehicle rules, payment tags, phone, website, wheelchair, photo tags,
check_date, remaining address tags, entrance nodes, and the element edit timestamp.
It excluded private/no-access lots. `sourceUpdatedAt` was the import date.

The importer now retains the requested original tags in `osmTags`, explicit
facility-way entrance node references in `entrances`, and the edit timestamp in
`osmEditedAt`. It keeps restricted facilities so the sheet can warn drivers.
`SpotDetails` normalizes these facts for the sheet. Invalid hours are omitted.
`opening_hours` parses OSM schedules; `tz-lookup` supplies the spot's timezone
without a network request. Unsupported holiday schedules without local holiday
context are omitted. Existing list/search presentation is untouched.

A single OSM API map export of the existing Makati pilot bounds refreshed the
snapshot on November 2, 2026. It has 43 real records (6 street segments), with:

| Field                                                      | Records |
| ---------------------------------------------------------- | ------: |
| fee                                                        |       2 |
| capacity                                                   |       1 |
| access                                                     |      10 |
| explicitly linked entrance                                 |       1 |
| opening_hours, charge, image, wikimedia_commons, mapillary |  0 each |

The additive migration persists tags, edit time, and entrances and returns them
in the existing viewport RPC. Apply it through the normal reviewed deployment
process before loading the regenerated seed. No hosted migration was run. Old
clients can still consume responses and old snapshots remain readable. Relations
remain unsupported by the existing importer; nearby unlinked entrance nodes are
not guessed to belong to a facility.

## Contributions

Supabase exists for published discovery reads. There is a private reports table,
but no deployed or implemented submission endpoint, upload service, or app account
flow. Add missing details opens the existing prefilled correction flow, which
stores a **private device preview**, including optional photo evidence. It is not
published, displayed as a community fact, or written to OSM.

A contribution backend needs an authenticated/trusted submission endpoint, strict
field/spot/time validation, durable per-user/IP rate limits, idempotency, private
photo storage with MIME/size checks, abuse review/moderation, and reviewed RLS.
An overlay needs field-level source timestamps, a newer-value merge policy,
public provenance (`Reported by drivers`), and a way to dispute/correct reports.
The existing database report design is documented in `docs/database.md`.

## Photos and token setup

Only after selection, lookup tries HTTPS `image` (HEAD verifies image content
type), Commons FilePath at width 800 (plus attribution metadata), a Mapillary ID,
then Mapillary v4 imagery within 40 m. Nearby results exclude panoramas and images
facing more than 60 degrees away, and rank by distance, age, and heading. Failure,
429, offline, and the 1.5-second deadline collapse the slot silently. Selection
changes abort requests. Only Mapillary IDs and negative results persist: seven
days and one day respectively. Signed URLs are never persisted.

Register a Mapillary application at https://www.mapillary.com/dashboard/developers
and copy its **client access token** into `EXPO_PUBLIC_MAPILLARY_TOKEN`. Restart
Metro after changing it. Do not use an app secret or user access token. Use a
separate application/token per environment and set application website/platform
information accurately. A bundled client token is publicly extractable: it cannot
be made secret or reliably locked to an Android binary by an environment variable.
Use any origin/domain restrictions actually offered for your application in the
current dashboard; do not assume they protect native requests. If enforceable
usage restrictions are required, a controlled proxy with quotas is needed (that
is not added here). Revoke/rotate tokens in the dashboard if abused.

Mapillary captions use actual capture/creator metadata and link CC BY-SA 4.0.
Commons uses supplied attribution/license metadata. A bare OSM image URL may not
contain capture date, photographer or license; those are omitted instead of
invented, and its original source is linked. No stock, generated, satellite or
scraped website imagery is used.

## Verification

- Workspace typecheck, formatting, and web build passed.
- `pnpm lint` reports 60 pre-existing errors in ignored local
  `output/playwright/drive-*.js` files. Tracked source passes
  `pnpm exec eslint . --ignore-pattern 'output/playwright/**' --max-warnings 0`.
- 26 targeted Node tests and 2 Python importer tests passed: distance boundaries,
  sparse states, real-fact normalization, timezone schedule evaluation, entrance
  selection, source provenance, viewport validation, and importer retention.
- Local database execution was not verified: the Docker daemon is stopped.
- Playwright at localhost:8081 checked sparse URL expansion suppression, fee,
  capacity, restricted access, no photo, offline, and a 320×480 screen at 150%
  browser zoom. Browser zoom approximates large text; Android uses system font size.
- The BDO route request ended at `121.0264965,14.5605468` (mapped entrance),
  rather than `121.02654994,14.5606658` (facility center).
- Android (location set within Makati) verified sparse, capacity, restricted access,
  and entrance detail sheets. Offline and a 1080×1440 screen with system font scale
  1.6 were captured; Directions remained on-screen. Original display/font/network
  settings were restored. Native fee-only selection was not verified.
- Screenshots are in `output/playwright/*-web.png` and `*-android.png`. Entrance
  routing was checked on web; the native entrance screenshot checks the detail
  sheet, not a second route request. No-photo cases use the same sparse screenshots.

Real web spots tested: `node/7078381082` (sparse), `way/309392252`
(restricted), `node/6579490128` (capacity), `node/3504836087` (fee),
`way/29005200` (entrance). The additional Android sparse spot is
`node/13111743133`. Across these six distinct spots: real name 1, address 1,
fee 1, capacity 1, access 1, parking subtype 1, supervised 1, entrance 1,
last-edit timestamp 6. All other requested detail tags occur zero times.

No pilot spot has fee + hours + capacity together, a photo tag, or an unnamed
street segment with a known street address. Those real UI cases cannot be claimed
as tested. Unit tests cover hours, photo-less records, unnamed-street fallback,
and entrance choice. Mapillary discovery and viewer gestures need validation
with a real token/photo. No new contribution service or relation assembly was
built, and no data was invented to fill the missing test cases.

Files changed:

- `packages/shared-types/src/index.ts`: optional raw tags, edit time and entrances.
- `scripts/extract-osm-parking.py`, `scripts/test-osm-extract.py`,
  `scripts/osm-snapshot-sql.mjs`: retain and verify source facts; seed generation.
- `apps/mobile/src/discovery/osm-pilot.json`, `supabase/seed-discovery.sql`:
  refreshed real snapshot and generated local seed.
- `supabase/migrations/20261102031133_parking_spot_details.sql`: additive columns
  and existing RPC response extension.
- `apps/mobile/src/discovery/data.ts`, `parking-detail-data.ts`,
  `parking-detail-data.test.mjs`, `spot-hours.ts`: validation and normalization.
- `apps/mobile/src/discovery/parking-details.tsx`, `discovery-sheet.tsx`,
  `explore.tsx`, `use-route.ts`: content sizing, facts, correction flow and entrance routing.
- `apps/mobile/src/discovery/spot-photo.ts`, `spot-photo-view.tsx`: optional
  source lookup, identity cache, thumbnail and viewer.
- `apps/mobile/package.json`, `pnpm-lock.yaml`, `apps/mobile/.env.example`:
  two runtime dependencies, timezone types and public photo token template.
- `docs/mobile-discovery.md`, `docs/parking-details.md`: snapshot count and report.

The pre-existing user edit to `map-data.ts` was preserved.
