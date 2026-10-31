# Development

Use Node 24 LTS (`.node-version`) and pnpm 11.25.0. Install from the repository root
with `pnpm install --frozen-lockfile`. Public configuration templates are optional;
never commit an actual `.env` or a privileged key.

## Mobile

The Expo SDK 58 app is a map-first discovery app. **Use a development build, not
Expo Go**, because MapLibre is a native dependency. No Google Maps keys are needed.
See [map and routing provider setup](mobile-discovery.md). Xcode/CocoaPods are required
for iOS; Android Studio, a compatible JDK, and the Android SDK for Android.

```sh
pnpm --filter @parkey/mobile ios
pnpm --filter @parkey/mobile android
# Already-installed development client:
pnpm dev:mobile
# Same application in a browser:
pnpm --filter @parkey/mobile web
```

Explore starts without authentication or configuration. Basemap tiles and search
need internet. The unverified OSM pilot snapshot is bundled, so record inspection
does not require Supabase. Search is an explicit Photon API request. Contributions
are clearly labeled local previews, never server submissions.
See [mobile implementation and provider configuration](mobile-discovery.md).

## Operator web preview

`pnpm dev:web` starts the unchanged TanStack Start operator preview, normally at
port 3000. Its fictional booking/bay state is session-only and unrelated to the
new discovery API. `pnpm build:web` builds its client and SSR server.
No production deployment adapter or external integration is configured.

## Local database

A Docker-compatible runtime is required for `pnpm supabase:start`. No cloud
project is needed. Inspect CLI `--help` before using pinned-version commands.
Use `pnpm exec supabase migration up --local` to apply additive migrations to an
existing local database. `pnpm exec supabase test db --local` runs rollback-based
pgTAP tests. Database tests require a running local database.

`pnpm exec supabase db reset --local` is **destructive to local data** and intended
only for a disposable database. It recreates migrations and loads the fictional
legacy seed plus the separate unverified OSM discovery seed. Never load development
fixtures into a hosted database. Preserve and audit legacy data before archival.
See [discovery schema](database.md) and [legacy schema](legacy-reservation-schema.md).

If another local Supabase project uses the configured ports, do not stop or reset
it blindly. Use a separate disposable project with different ports, or an isolated
Supabase Postgres container to apply the SQL/test files directly with `psql`.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build:web
```

CI uses the frozen pnpm lockfile and these checks. It does not start Docker,
deploy, create hosted resources, or run a native build. Expo native directories,
web route trees, build output, local environments, and caches stay untracked.
