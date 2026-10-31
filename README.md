# Parkey

A map-first parking discovery app, piloting in Poblacion, Makati. Open the map,
search a destination, inspect a facility or street segment, and get directions.
Discovery requires no account. Unknown parking rules, fees, hours, and verification
are explicit; Parkey does not promise a vacant space or permission to park.

## Workspace

- `apps/mobile`: Expo 58, React Native, Expo Router, MapLibre Native and GL JS.
- `apps/web`: independent TanStack Start operator preview, unchanged by V2.
- `packages/shared-types`: type-only workspace contracts.
- `supabase`: PostGIS discovery schema, preserved legacy schema, local seeds/tests.

Use Node 24 LTS and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm --filter @parkey/mobile ios       # Xcode + CocoaPods
pnpm --filter @parkey/mobile android   # Android SDK + JDK
pnpm dev:mobile                       # already-installed development client
pnpm --filter @parkey/mobile web       # browser version of the Expo app
pnpm dev:web                          # separate operator web preview
```

**Expo Go is not supported by the native map.** Build the development client.
No keys are needed for the default basemap, modest development search, or the
unverified OSM pilot snapshot (41 records, 6 street segments). In-app directions
show a driving route, distance, estimated travel time, and written instructions.
Development builds default to the OSRM demo for non-commercial testing only;
production builds require an owned/licensed `EXPO_PUBLIC_OSRM_URL`. See the setup
guide below. The demo has no availability guarantee; live traffic is not included.
Community contributions are **local previews only**, not server submissions.
An optional Supabase public configuration enables published viewport reads.

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build:web
```

The operator preview still contains fictional reservation workflows; these are
absent from the mobile application. No hosted resources, migrations, or production
submission service are deployed by this repository.

Read [mobile setup, providers, licensing, and limitations](docs/mobile-discovery.md),
[development](docs/development.md), [architecture](docs/architecture.md),
[discovery database](docs/database.md), and [preserved legacy schema](docs/legacy-reservation-schema.md).
