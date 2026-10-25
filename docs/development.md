# Local development

## Prerequisites

- Git and Node 24 LTS (`.node-version` pins the validated patch; minimum 24.3).
- pnpm 11.25.0, matching root `packageManager`.
- Android Studio and an Android SDK/emulator for Android development, or a device
  with a compatible Expo Go/development build.
- macOS with full Xcode, command-line tools, and an installed simulator runtime
  for iOS. Native development builds also require Xcode's build prerequisites.
- A running Docker-compatible runtime (Docker Desktop or OrbStack) for Supabase.
  Merely having the `docker` command installed is insufficient.

## Install the monorepo

From the repository root:

```sh
node --version
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm list -r --depth 0
```

Use a Node version manager to select `.node-version` if available. All workspaces
use one root lockfile and pnpm's default isolated linker. Do not install per-app
lockfiles or change Metro resolution paths. Review any new dependency build-script
permission before adding it to `allowBuilds` in `pnpm-workspace.yaml`.

The scaffold does not require environment files or credentials to install, run,
typecheck, or build.

## Run Expo

```sh
pnpm dev:mobile
```

Metro normally listens on port 8081. Use the terminal's `a`/`i` controls to open
Android/iOS, or scan the QR code with a compatible device. The mobile app has one
welcome route in `apps/mobile/src/app`, configured by `apps/mobile/app.json`.

The selected SDK is **58**. During the documented SDK transition, the app-store
Expo Go may still target SDK 57. Use an SDK 58-compatible simulator/emulator Expo
Go or a development build; do not downgrade individual native libraries to work
around an incompatible Expo Go client.

For configuration or dependency checks:

```sh
pnpm --filter @parkey/mobile exec expo config --type public
pnpm --filter @parkey/mobile exec expo install --check
```

### Android emulator

1. Install Android Studio, its SDK platform/tools, and an emulator system image
   matching the host CPU architecture (ARM64 on Apple silicon).
2. Set `ANDROID_HOME` to the SDK directory and add `platform-tools` and `emulator`
   to `PATH`. On macOS the SDK is commonly `$HOME/Library/Android/sdk`.
3. Create/start an AVD in Android Studio's Device Manager; verify `adb devices`.
4. Start `pnpm dev:mobile` and press `a`.

Future local Supabase calls from the Android emulator must use
`http://10.0.2.2:54321`; `127.0.0.1` points to the emulator itself. Physical devices
need the development machine's reachable LAN IP and firewall access.

### iOS

On macOS, install full Xcode, accept its license, select its command-line tools,
and install an iOS simulator runtime. Open Simulator, boot a device, and press
`i` in Expo. Check available devices with `xcrun simctl list devices`. Building or
running native iOS apps is not supported on Windows/Linux; use a physical device
or a separately configured remote build workflow.

## Run TanStack Start

```sh
pnpm dev:web
```

Open `http://localhost:3000` for Overview and follow About to verify navigation.
The app has no backend data or authentication dependency.

```sh
pnpm build:web
pnpm --filter @parkey/web preview
```

Vite builds client assets and SSR server output under `apps/web/dist`. Preview
is a local build check, not a production deployment setup. Hosting and any
necessary deployment adapter are a separate task.

## Local Supabase

The project has already been initialized with the official CLI. Do **not** rerun
`init` or replace its generated config during ordinary setup. The configured
project is local only; no login, linked project, or hosted credentials are needed.

```sh
docker info
pnpm exec supabase --version
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

The first start downloads container images. Defaults in `config.toml` include
API `http://127.0.0.1:54321`, database port 54322, and Studio
`http://127.0.0.1:54323`. The CLI prints local keys/connection details; keep that
output private. Its local database credentials are development defaults only.

The stack uses generated configuration without application migrations. It does
not require `supabase/.env`. That template is reserved for future Edge Function
payment secrets. Read `migrations/README.md` and `functions/README.md` before
adding assigned backend work. Discover command flags with `pnpm exec supabase
<command> --help`; do not guess CLI flags or run remote commands by default.

If the Docker daemon is unavailable, initialization and CLI checks still work,
but local services cannot start. Start Docker Desktop/OrbStack and rerun
`docker info` before attempting `pnpm supabase:start`. Do not switch to an
experimental native runtime as part of this scaffold.

## Environment configuration

Only when configuring an assigned integration, copy the corresponding template:

```sh
cp apps/mobile/.env.example apps/mobile/.env
cp apps/web/.env.example apps/web/.env
# Future server/function work only:
cp supabase/.env.example supabase/.env
```

| Integration  | Mobile public variable                 | Web public variable             | Server-only configuration                              |
| ------------ | -------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| Supabase URL | `EXPO_PUBLIC_SUPABASE_URL`             | `VITE_SUPABASE_URL`             | CLI injects function runtime URL                       |
| Supabase key | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `VITE_SUPABASE_PUBLISHABLE_KEY` | Secret key only if a future privileged server needs it |
| Google Maps  | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`      | `VITE_GOOGLE_MAPS_API_KEY`      | Restrict keys by app/referrer and APIs                 |
| PayMongo     | `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY`      | `VITE_PAYMONGO_PUBLIC_KEY`      | `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`       |

All integrations in this table are planned and unused. Leave keys empty until
the relevant feature is assigned. Obtain local Supabase values from the running
CLI; no real credentials are generated or supplied by the scaffold.

Expo and Vite load environment files from their app directories, not the root.
The root `.env.example` documents future server-only variables and is not
automatically loaded. Edge Functions receive reserved Supabase variables from
the runtime; never redefine those in a function env file. Never import a server
environment module into a route component, shared package, or mobile source.

Public prefixes embed values in distributed bundles; they provide no secrecy.
Never add database administrator passwords, Supabase secret/service-role keys,
or PayMongo secret keys to client variables. Use separate restricted Maps keys
for each platform. Restart dev servers after changing environment configuration.

## Quality checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build:web
```

`typecheck` generates the web route tree before checking both apps and the shared
package. Shared contract imports are validated in both applications. Use
`pnpm format` to apply formatting. CI runs these same checks on a frozen install
without Docker, emulators, or secrets. No business unit or E2E suite is included
because there is no business behavior yet.

## Troubleshooting

- **Wrong Node/pnpm:** match `.node-version` and `packageManager`. Engine checks
  intentionally fail on incompatible Node versions.
- **Missing workspace import:** run installation from the root; use
  `workspace:*` and `import type` for `@parkey/shared-types`. It has no runtime
  exports and requires no emitted build artifacts.
- **Missing/stale route types:** run
  `pnpm --filter @parkey/web generate-routes`. Never hand-edit the generated tree.
- **Metro cache after dependency changes:** stop Expo and run
  `pnpm dev:mobile --clear`. Avoid custom Metro overrides and hoisting changes.
- **Port conflict:** stop the conflicting process, or use
  `pnpm dev:web --port 3001` / `pnpm dev:mobile --port 8082`.
- **Expo Go SDK mismatch:** install the compatible emulator client or use a
  development build; align SDK upgrades with official Expo guidance.
- **Emulator cannot reach host:** use `10.0.2.2` for Android, check device/LAN
  routing and firewall rules, and confirm Metro and Docker are listening.
- **Supabase Docker error:** check `docker info` and runtime health first. Review
  CLI output without sharing its credentials. No hosted project is necessary.
- **Dependency install fails:** inspect the specific package/engine/script error;
  preserve the lockfile. Do not broadly allow all dependency build scripts.

## Scaffold verification record

Executed on 2026-10-25 with Node 24.19.0 and pnpm 11.25.0:

| Check                                                                          | Result                                                                                                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install` and `pnpm install --frozen-lockfile`                            | Passed                                                                                                                             |
| `pnpm list -r --depth 0`                                                       | All four workspaces found; both apps link to shared types                                                                          |
| `pnpm lint`                                                                    | Passed with zero lint warnings                                                                                                     |
| `pnpm typecheck`                                                               | Shared package and both apps passed                                                                                                |
| `pnpm format:check`                                                            | Passed                                                                                                                             |
| `pnpm build:web`                                                               | Vite client and SSR production builds passed                                                                                       |
| `pnpm dev:web --host 127.0.0.1`                                                | Started; HTTP checks verified `/`, `/about`, stylesheet loading, navigation links, and unknown-route 404                           |
| `pnpm --filter @parkey/web preview --host 127.0.0.1`                           | Both production routes returned HTTP 200 with expected content                                                                     |
| `pnpm dev:mobile --localhost`                                                  | Metro started; `/status` and SDK 58 Parkey manifest verified                                                                       |
| Android emulator (`Medium_Phone`) with SDK 58 Expo Go                          | App bundled and launched; native UI hierarchy contained the Parkey welcome text; no `ReactNativeJS` or `AndroidRuntime` error logs |
| `expo install --check` and `expo config --type public` in the mobile workspace | Compatible dependencies; valid Parkey app configuration                                                                            |
| `pnpm exec supabase init` and `pnpm exec supabase --version`                   | Local initialization completed with CLI 2.122.0; generated TOML parsed successfully                                                |
| Credential pattern and environment-file scan                                   | No credential patterns found in maintained text files; actual `.env` files and build output are ignored                            |

The Router CLI emitted a non-blocking upstream circular-dependency warning during
route generation; generation, typechecking, and builds succeeded. The terminal
environment also emitted color-variable warnings during Metro startup.

Not executed: iOS simulator launch, browser rendering/hydration checks, remote
GitHub Actions execution, or local Supabase stack startup. Docker was installed
but its OrbStack daemon was unavailable (`docker info` could not connect). Start
the Docker-compatible runtime before verifying the stack. HTTP/native hierarchy
checks above do not constitute a browser or screenshot review.
