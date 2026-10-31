# Android discovery smoke flows

These flows exercise the actual Android application and its real providers. They
do not insert sample parking or fake search/routing responses. They have not been
executed on an emulator or device as part of their authoring.

## Prerequisites

- Node 24, the repository's pinned pnpm, Android SDK/JDK and a running Android
  emulator or USB-connected device with debugging enabled.
- Maestro CLI installed separately, with `maestro --version` and `adb devices`
  working. Maestro is not a project package dependency.
- A Parkey native build (`com.parkey.discovery`); Expo Go cannot render the map.
- Network access to the configured map and Photon search services. The default
  search service has no SLA; provider failures should fail this smoke test.
- Leave analytics and crash configuration unset while running smoke tests unless
  you intentionally want these actions reported to your configured providers.

The opening flow clears **all application data**, including local previews,
favorites, recents and the saved parked spot. Use a disposable installation. It
denies runtime permissions, so directions deliberately exercise entry into the
route screen without requiring GPS or a successful routing service response.

## Run on a development build

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @parkey/mobile android
```

Keep Metro running. For an already installed build, use `pnpm dev:mobile` instead
of rebuilding. Open the development client and select the running Parkey project
once to confirm it can connect. Dismiss any development launcher prompts.

In a second terminal, forward Metro from Android and run the composed flow:

```sh
adb reverse tcp:8081 tcp:8081
maestro test \
  -e APP_URL='parkey://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081' \
  apps/mobile/.maestro/smoke.yaml
```

Use the port printed by Metro if it is not `8081`, changing both the `adb reverse`
command and encoded URL. If several devices are attached, select the intended
device with `adb -s DEVICE_SERIAL reverse tcp:8081 tcp:8081` and
`maestro --device DEVICE_SERIAL test ...`.

Clearing application data also clears the Expo development launcher's remembered
server. The explicit development-client URL reconnects it. If a particular client
build still stops at a launcher or link confirmation, open/select the local
project manually while the first flow waits, then rerun after checking its deep
link handling. Launcher interaction is not part of Parkey's product flow.

For an installed standalone build with bundled JavaScript, use:

```sh
maestro test -e APP_URL='parkey://' apps/mobile/.maestro/smoke.yaml
```

## Flow order and assertions

`smoke.yaml` runs the steps in order:

1. `01-open-map.yaml`: clean launch, open app URL, wait for the native map ready
   signal and search input.
2. `02-search.yaml`: submit **Poblacion Makati**, wait for a real search result,
   and select it.
3. `03-select-facility.yaml`: select **Lots & garages**, open results, scroll to
   and select the first ranked facility.
4. `04-open-details.yaml`: expand the selected facility's full details.
5. `05-directions.yaml`: tap **Get Directions** and verify the driving route
   panel opens. A location-denied or routing-unconfigured message is an honest
   outcome; this flow does not assert a calculated route.

The numbered flows after step 1 expect the preceding UI state. Run `smoke.yaml`
for the complete sequence; running an individual later file does not initialize
its prerequisites. No map coordinates, record IDs or provider-specific destination
names are hard-coded as test selectors.

If search returns a different area or no facilities are visible, inspect the real
provider response and coverage rather than inserting a fictional passing result.
The flows use waits for UI state, not arbitrary sleeps.

## Additional real-device checks

The smoke flow does not verify successful directions, denied-location messaging,
native external-navigation handoffs, visual layouts or persistence across restarts.
Check these separately on Android:

- Allow foreground location and set an emulator GPS fix near Poblacion (longitude
  `121.0308`, latitude `14.5653`) or use a real device location.
- Request directions with a configured routing endpoint. Confirm actual route
  geometry, written instructions, loading, retry and failure states. Production
  builds require an owned/licensed routing endpoint; development demo use is
  restricted by its provider policy.
- Deny location and verify the app explains the failure without showing a route.
- Save where you parked, favorite a record, view several records, then force-stop
  and reopen. Confirm persisted data, clear/remove actions and route-back behavior.
- Check system permission prompts, Android back behavior, map gestures, font
  scaling, photo picking and installed navigation-app handoffs.

Record the device/emulator model, Android version, build type, configured providers
and command output when reporting execution. Static YAML validation alone does
not establish that a device flow passes.
