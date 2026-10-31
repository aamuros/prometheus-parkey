# Architecture

Parkey uses one pnpm monorepo and a modular monolith. The Expo mobile application
and TanStack Start operator preview are independent frontends. Shared contracts
are type-only. PostgreSQL/PostGIS owns geographic records; privileged writes
belong behind trusted server boundaries.

## Mobile discovery

Expo SDK 58 / React 19.3 / React Native 0.88, using Expo Router's `src/app`
convention and native StyleSheet. `/` is the map workspace; search, details,
directions, and contributions are overlays, not extra tab/navigation hierarchies.
No auth provider, reservation reducer, booking routes, or checkout exists in the
mobile tree. Native system typography replaces the former illustrated layout.

MapLibre Native 11.5 renders the basemap, parking markers, street lines, and
driving route overlays. The Expo config plugin installs the native module in a
development build. MapLibre GL JS 6.16 handles the same Expo app on web; its
worker is prepared as a same-origin static asset without Metro overrides.
Expo Go displays a build requirement. OSRM-compatible requests supply route
geometry, estimates, and maneuvers, with response validation, cancellation,
timeouts, and a client cooldown. The public demo is a non-commercial development
default only; production requires an explicitly configured routing service.
Routes are requested or recalculated by the user, never automatically on GPS
updates. No live traffic or voice navigation is implemented. Location and signage photos use
Expo-supported modules. Local contribution drafts use AsyncStorage; nothing
uploads automatically. This persistence is not a moderation backend.

The data layer combines an attributed OSM pilot snapshot with optional published
Supabase viewport results, deduplicating identical source URLs in favor of backend
records. No runtime requests hit Overpass or OSM's data API. Explicit Photon
search is replaceable by a compatible endpoint. Basemap styles are configurable.
All provider responses are validated. Empty, network-error, missing-permission,
loading, and unconfigured-backend states have explicit behavior.

See [mobile details](mobile-discovery.md) for components, native workflow,
configuration, data licenses, contribution limits, and release prerequisites.

## Database

The original ADI-173 schema remains intact, including all data and constraints.
It is documented as [legacy](legacy-reservation-schema.md). V2 adds independent
sources, geographic parking records, sourced regulations, and private community
reports. Street records require line geometry; facilities require points. There
is no operator, inventory, account, or reservation dependency in discovery.

Anonymous discovery is read-only through RLS and an invoker viewport RPC. Public
writes and private reports are denied. No remote project, public submission
function, auth bypass, or payment service was created. See [database design](database.md).

## Web and shared contracts

The existing React/TanStack Start/Router/Vite/Tailwind operator application is
unchanged. It retains its session-only fictional workspace, file routing in
`src/routes`, and CLI-generated `routeTree.gen.ts`. It does not use discovery or
make production booking requests. Its old reservation vocabularies remain in
`@parkey/shared-types` for compatibility alongside new discovery API contracts.
All shared imports remain `import type`; the package exports no runtime code.

## Validation and deployment boundaries

Strict TypeScript, ESLint, Prettier, focused Node/Python tests, and the web build
run in CI. PostGIS/pgTAP and native/browser checks require their respective local
runtimes. No deployment or production migration is automatic. Native projects
and generated output are ignored. pnpm build-script permissions stay explicit;
no broad dependency-script approval is enabled.
