# Parkey

Parkey is a mobile-first parking reservation marketplace for the Philippines,
starting in Poblacion, Makati. This repository contains the development foundation
for the driver mobile app and the operator/administrator web workspace.

The mobile and web apps include **frontend-only demos** of the core parking
flows. All locations, drivers, availability, and prices are visibly fictional.
Both apps run without credentials, keep changes in memory, and reset on reload
or with their Reset demo controls. The demos are independent and do not synchronize.
Authentication, real bookings, maps, QR entry passes, and payments are not connected.

ADI-173's local PostgreSQL/PostGIS foundation remains separate from these previews.

## Stack

- Mobile: Expo SDK 58, React Native 0.88, React 19.3, Expo Router, TypeScript,
  React Native StyleSheet.
- Web: TanStack Start 1.169, TanStack Router 1.170, React 19.3, Vite 8, Tailwind 4.
- Shared: a type-only TypeScript workspace package.
- Backend foundation: Supabase CLI 2.122, PostgreSQL 17, PostGIS. Auth integration,
  Storage, and Edge Functions are planned. No hosted resources are created.
- Tooling: pnpm workspaces, strict TypeScript 6, ESLint, Prettier, GitHub Actions.

Exact installed versions are pinned by `pnpm-lock.yaml`.

## Repository layout

```text
.
├── apps/
│   ├── mobile/
│   │   ├── src/app/          # Expo Router layout and driver preview
│   │   ├── assets/           # Official starter icons
│   │   ├── app.json
│   │   └── .env.example
│   └── web/
│       ├── src/routes/       # Operator workspace, root document, about
│       ├── src/router.tsx
│       ├── src/styles.css
│       ├── vite.config.ts
│       └── .env.example
├── packages/shared-types/   # @parkey/shared-types
├── supabase/
│   ├── config.toml          # CLI-generated local configuration
│   ├── migrations/         # PostgreSQL/PostGIS foundation migration
│   ├── seed.sql            # Fictional local development inventory
│   ├── tests/database/     # Transactional pgTAP integrity tests
│   ├── functions/          # Instructions; no functions yet
│   └── .env.example
├── docs/
│   ├── architecture.md
│   ├── development.md
│   └── database.md         # Schema and authorization/concurrency boundaries
├── .github/workflows/ci.yml
├── AGENTS.md
├── eslint.config.js
├── tsconfig.base.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

Add component, hook, and library directories when they first have a purpose.

## Prerequisites and installation

Install Git, Node **24 LTS** (the validated patch is in `.node-version`), and
**pnpm 11.25.0**. A Docker-compatible runtime is required only for local Supabase.
Use Android Studio for an Android emulator, or macOS with Xcode for iOS.

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
```

The installed Node version must satisfy `>=24.3.0 <25`. Run all commands below
from the repository root. See [development setup](docs/development.md) for device
instructions, optional environment setup, and troubleshooting.

## Commands

| Command                               | Purpose                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev:mobile`                     | Start Expo/Metro; press `w` for browser, `a` for Android, or `i` for iOS       |
| `pnpm --filter @parkey/mobile web`    | Open the customer mobile app in a browser, normally at `http://localhost:8081` |
| `pnpm dev:web`                        | Start TanStack Start at `http://localhost:3000`                                |
| `pnpm lint`                           | Lint maintained source/config files, with no warnings allowed                  |
| `pnpm typecheck`                      | Check shared types and both apps; generate web route types first               |
| `pnpm format`                         | Format maintained files with Prettier                                          |
| `pnpm format:check`                   | Check formatting without modifying files                                       |
| `pnpm build:web`                      | Build web client and SSR server into `apps/web/dist`                           |
| `pnpm --filter @parkey/web preview`   | Preview the web production build locally                                       |
| `pnpm supabase:start`                 | Start the local Supabase stack (requires Docker)                               |
| `pnpm exec supabase db reset --local` | Recreate local schema and fictional fixtures (deletes local DB data)           |
| `pnpm exec supabase test db --local`  | Run database integrity tests against the local stack                           |
| `pnpm supabase:stop`                  | Stop local Supabase, preserving local data                                     |
| `pnpm supabase:status`                | Show local stack status and local connection details                           |

GitHub Actions installs with the frozen lockfile and runs lint, typecheck,
formatting checks, and the web production build. It needs no integration secrets.
There is no deployment workflow.

## Frontend previews

- **Customer mobile app** (`pnpm dev:mobile`, then press `w`, or run
  `pnpm --filter @parkey/mobile web`): open the Expo URL printed in the terminal,
  normally `http://localhost:8081`. The welcome screen starts with “Park before
  you arrive.” Choose **Get started**, then **Continue** with the prefilled sample
  number to explore the nine Figma screens. Search and filter parking, review a
  sample reservation, view booking details, cancel, and edit preview preferences.
  SMS, payments, real reservations, and live navigation are not connected. See
  [screen routes and preview behavior](docs/customer-mobile-designs.md).
- **Web** (`pnpm dev:web`): inspect a fictional 16-space lot and its expected
  arrivals, search/filter reservations, open booking details, check demo drivers
  in/out, cancel upcoming demo bookings, and toggle unassigned bay availability.
  Summary counts and the bay diagram update together. The sample day is fixed
  to 27 October 2026, with times displayed in Manila time.

The app-local `src/demo` modules supply session state and preview safeguards.
They are not a booking engine or production pricing/cancellation policy. They
make no requests to Supabase or payment/location providers. Do not enter real
personal information in the previews.

Run the focused state tests without starting either app:

```sh
node --test apps/web/src/demo/workspace.test.mjs apps/mobile/src/demo/driver.test.mjs apps/mobile/src/customer/preview.test.mjs
```

## Environment and architecture

Neither frontend requires environment values. Copy an app's `.env.example` to its
own `.env` only when configuring future integrations. `EXPO_PUBLIC_` and `VITE_`
values are public, including publishable Supabase keys. Secret/service-role keys
and payment secrets belong only in a trusted server runtime. Actual environment
files are ignored by Git.

Read [architecture](docs/architecture.md), [development](docs/development.md), and
[agent instructions](AGENTS.md) before extending the scaffold. See the
[database design](docs/database.md) for entities and remaining booking boundaries. The recommended next task is **ADI-174: authentication and scoped
authorization**. Client access is denied until reviewed grants and RLS policies
are implemented.
