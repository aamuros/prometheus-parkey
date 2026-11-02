# Parkey playful UI assets

Source: [Parkey – Playful UI](https://www.figma.com/design/jraDqL2qKVvTYtDuaoKreZ), supplied redesign nodes `31:241`, `36:310`, `36:445`, `36:603`, `37:442`, `37:535`, `38:478`, and `38:599`; component references `30:182`, `15:165`, and `15:272`.

SVG files are original Figma MCP exports. PNG files are 3× rasterizations for React Native. `figma-assets.tsx` records intrinsic dimensions and preserves aspect ratios. The map renderers use `selected-spot.png` with a bottom geographic anchor.

- `mascot`: nearest parking summary, contribution prompt, and profile.
- `selected-spot`: selected map marker, including street parking.
- `arrival-ring`, `arrived`, `confetti*`: arrival celebration.
- `map*`, `saved*`, `user*`: three-tab navigation states.
- `clock`, `fees`, `spaces`, `access`: parking detail tiles.
- `home`, `work`, `car`, `plus-small`: saved-place shortcuts.
- Remaining icons: parking rows, save/close actions, profile stats, search, and arrival warning.

The production map, route geometry, parking data, and native system status bar remain dynamic. Unsupported XP, streaks, and weekly metrics are shown as unavailable rather than copying the mockup's sample values.

## Requested v2 designs

Source file: `jraDqL2qKVvTYtDuaoKreZ`.

| Figma node | Implementation                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| `42:654`   | Dark floating dock; active Map, Saved, and You states                                                    |
| `42:655`   | Swipeable nearby card with recorded fee status and Go                                                    |
| `42:664`   | Compact information tile                                                                                 |
| `43:634`   | Map home with bottom search, filters, nearby strip, and add button                                       |
| `43:794`   | Spot peek with horizontal tiles and Go                                                                   |
| `44:775`   | Expanded spot details, photos, source, and corrections                                                   |
| `45:843`   | Turn guidance and floating ETA / next spot / End bar                                                     |
| `45:929`   | Arrival, parked-location Undo, and time-limit correction prompt                                          |
| `42:671`   | Interaction requirements applied across the above screens; a design annotation rather than an app screen |

The v2 dock and action icons are original Figma SVG exports with 3× PNG versions. Map bubble surfaces and the map-label pill implement the design's rounded containers as map sprites; free and paid bubbles composite the original Figma tail exports. Both renderers size the mascot at 56 × 68 logical pixels. Fee bubbles use recorded source values; `Fee ?` denotes missing data. The direction marker follows the next route segment. The illustrated map, example distances, walk times, prices, and status bar are not hardcoded into the app.

Arrival answers open the existing private correction form for review. They do not publish a claim to other drivers. Saving a car location stays on the arrival screen and offers Undo without changing favorites or recents.

## Search and edge-state exports

The requested nodes `51:891`, `53:1064`, `53:1163`, `59:1240`, `59:1539`,
`59:1704`, `59:1877`, and `59:2053` supply `chevron-right`, `walk-back-arrow`,
`lock-teal`, `shield-teal`, `viewed-brand`, `draft-brand`, `info-warning`,
`no-results`, `offline`, `zoom-in-brand`, `filter-brand`, and `location-off`.
Their SVG bytes are original Figma exports; PNGs are rasterized at 3× for native
Image support. No temporary Figma URL is used at runtime. System keyboard and
status-bar mockups use the operating system’s real controls.
